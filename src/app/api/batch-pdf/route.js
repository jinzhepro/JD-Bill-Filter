import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import mysql from "mysql2/promise";

// MySQL数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_DATABASE || "testdb",
  charset: process.env.DB_CHARSET || "utf8mb4",
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
};

// 创建连接池
const pool = mysql.createPool(dbConfig);

// 确保上传目录存在
async function ensureUploadDir() {
  const uploadDir = join(process.cwd(), "public", "uploads", "batch-pdfs");
  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true });
  }
  return uploadDir;
}

// 创建批次PDF文件表（如果不存在）
async function createBatchPdfTable() {
  try {
    const connection = await pool.getConnection();

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS batch_pdf_files (
        id VARCHAR(255) PRIMARY KEY,
        batch_name VARCHAR(255) NOT NULL COMMENT '采购批号',
        file_name VARCHAR(500) NOT NULL COMMENT '文件名',
        file_path VARCHAR(1000) NOT NULL COMMENT '文件路径',
        file_size BIGINT DEFAULT 0 COMMENT '文件大小（字节）',
        mime_type VARCHAR(100) DEFAULT 'application/pdf' COMMENT 'MIME类型',
        uploaded_by VARCHAR(255) DEFAULT '' COMMENT '上传者',
        upload_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '上传时间',
        description TEXT COMMENT '文件描述',
        INDEX idx_batch_name (batch_name),
        INDEX idx_upload_time (upload_time)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='批次PDF文件表';
    `;

    await connection.execute(createTableSQL);
    connection.release();

    return { success: true, message: "批次PDF文件表创建成功或已存在" };
  } catch (error) {
    console.error("创建批次PDF文件表失败:", error);
    return {
      success: false,
      message: `创建批次PDF文件表失败: ${error.message}`,
    };
  }
}

// 保存批次PDF文件信息
async function saveBatchPdfFile(pdfFileInfo) {
  if (!pdfFileInfo) {
    return { success: false, message: "缺少PDF文件信息" };
  }

  try {
    const connection = await pool.getConnection();

    // 先确保表存在
    await createBatchPdfTable();

    const insertSQL = `
      INSERT INTO batch_pdf_files (
        id, batch_name, file_name, file_path, file_size, mime_type, uploaded_by, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await connection.execute(insertSQL, [
      pdfFileInfo.id,
      pdfFileInfo.batchName,
      pdfFileInfo.fileName,
      pdfFileInfo.filePath,
      pdfFileInfo.fileSize || 0,
      pdfFileInfo.mimeType || "application/pdf",
      pdfFileInfo.uploadedBy || "",
      pdfFileInfo.description || "",
    ]);

    connection.release();

    return {
      success: true,
      message: `成功保存批次 "${pdfFileInfo.batchName}" 的PDF文件信息`,
    };
  } catch (error) {
    console.error("保存批次PDF文件信息失败:", error);
    return {
      success: false,
      message: `保存批次PDF文件信息失败: ${error.message}`,
    };
  }
}

// 获取批次的PDF文件列表
async function getBatchPdfFiles(batchName) {
  if (!batchName) {
    return { success: false, message: "缺少批次名称" };
  }

  try {
    const connection = await pool.getConnection();

    const [rows] = await connection.execute(
      `
      SELECT
        id, batch_name, file_name, file_path, file_size, mime_type, uploaded_by, upload_time, description
      FROM batch_pdf_files
      WHERE batch_name = ?
      ORDER BY upload_time DESC
    `,
      [batchName]
    );

    connection.release();

    const pdfFiles = rows.map((row) => ({
      id: row.id,
      batchName: row.batch_name,
      fileName: row.file_name,
      filePath: row.file_path,
      fileSize: row.file_size,
      mimeType: row.mime_type,
      uploadedBy: row.uploaded_by,
      uploadTime: row.upload_time,
      description: row.description,
    }));

    return {
      success: true,
      data: pdfFiles,
      message: `获取批次 "${batchName}" 的PDF文件列表成功`,
    };
  } catch (error) {
    console.error("获取批次PDF文件列表失败:", error);
    return {
      success: false,
      message: `获取批次PDF文件列表失败: ${error.message}`,
    };
  }
}

// 删除批次PDF文件
async function deleteBatchPdfFile(fileId) {
  if (!fileId) {
    return { success: false, message: "缺少文件ID" };
  }

  try {
    const connection = await pool.getConnection();

    // 先获取文件信息
    const [fileRows] = await connection.execute(
      "SELECT file_path FROM batch_pdf_files WHERE id = ?",
      [fileId]
    );

    if (fileRows.length === 0) {
      connection.release();
      return { success: false, message: "未找到要删除的PDF文件" };
    }

    const filePath = fileRows[0].file_path;

    // 删除数据库记录
    const [result] = await connection.execute(
      "DELETE FROM batch_pdf_files WHERE id = ?",
      [fileId]
    );

    connection.release();

    if (result.affectedRows > 0) {
      return {
        success: true,
        message: "PDF文件删除成功",
        filePath: filePath, // 返回文件路径以便删除物理文件
      };
    } else {
      return {
        success: false,
        message: "未找到要删除的PDF文件",
      };
    }
  } catch (error) {
    console.error("删除批次PDF文件失败:", error);
    return {
      success: false,
      message: `删除批次PDF文件失败: ${error.message}`,
    };
  }
}

// POST请求处理 - 上传PDF文件
export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const batchName = formData.get("batchName");
    const description = formData.get("description") || "";
    const uploadedBy = formData.get("uploadedBy") || "系统用户";

    // 验证参数
    if (!file) {
      return NextResponse.json(
        { success: false, message: "缺少文件" },
        { status: 400 }
      );
    }

    if (!batchName) {
      return NextResponse.json(
        { success: false, message: "缺少批次名称" },
        { status: 400 }
      );
    }

    // 验证文件类型
    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { success: false, message: "只支持PDF文件" },
        { status: 400 }
      );
    }

    // 验证文件大小（10MB限制）
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, message: "文件大小不能超过10MB" },
        { status: 400 }
      );
    }

    // 确保上传目录存在
    const uploadDir = await ensureUploadDir();

    // 生成唯一文件名
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 9);
    const fileExtension = file.name.split(".").pop();
    const uniqueFileName = `${batchName}-${timestamp}-${randomString}.${fileExtension}`;
    const filePath = join(uploadDir, uniqueFileName);

    // 保存文件到磁盘
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // 保存文件信息到数据库
    const pdfFileInfo = {
      id: `pdf-${timestamp}-${randomString}`,
      batchName: batchName,
      fileName: file.name,
      filePath: `/uploads/batch-pdfs/${uniqueFileName}`, // 存储相对路径
      fileSize: file.size,
      mimeType: file.type,
      uploadedBy: uploadedBy,
      description: description,
    };

    const saveResult = await saveBatchPdfFile(pdfFileInfo);

    if (!saveResult.success) {
      // 如果数据库保存失败，删除已上传的文件
      try {
        const fs = require("fs");
        if (existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (deleteError) {
        console.error("删除文件失败:", deleteError);
      }

      return NextResponse.json(
        { success: false, message: saveResult.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "PDF文件上传成功",
      data: {
        id: pdfFileInfo.id,
        fileName: pdfFileInfo.fileName,
        filePath: pdfFileInfo.filePath,
        fileSize: pdfFileInfo.fileSize,
        uploadTime: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("PDF文件上传失败:", error);
    return NextResponse.json(
      { success: false, message: `PDF文件上传失败: ${error.message}` },
      { status: 500 }
    );
  }
}

// GET请求处理 - 获取批次的PDF文件列表
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const batchName = searchParams.get("batchName");

    if (!batchName) {
      return NextResponse.json(
        { success: false, message: "缺少批次名称" },
        { status: 400 }
      );
    }

    const result = await getBatchPdfFiles(batchName);

    return NextResponse.json(result);
  } catch (error) {
    console.error("获取PDF文件列表失败:", error);
    return NextResponse.json(
      { success: false, message: `获取PDF文件列表失败: ${error.message}` },
      { status: 500 }
    );
  }
}

// DELETE请求处理 - 删除PDF文件
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId");

    if (!fileId) {
      return NextResponse.json(
        { success: false, message: "缺少文件ID" },
        { status: 400 }
      );
    }

    const result = await deleteBatchPdfFile(fileId);

    if (result.success && result.filePath) {
      // 删除物理文件
      try {
        const fs = require("fs");
        const fullPath = join(process.cwd(), "public", result.filePath);
        if (existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      } catch (deleteError) {
        console.error("删除物理文件失败:", deleteError);
        // 不影响数据库删除结果
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("删除PDF文件失败:", error);
    return NextResponse.json(
      { success: false, message: `删除PDF文件失败: ${error.message}` },
      { status: 500 }
    );
  }
}
