import { NextResponse } from "next/server";
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

// 获取PDF文件内容
async function getPdfContent(pdfId) {
  try {
    const connection = await pool.getConnection();

    const [rows] = await connection.execute(
      "SELECT file_name, file_content, file_size FROM batch_pdfs WHERE id = ?",
      [pdfId]
    );

    connection.release();

    if (rows.length === 0) {
      return { success: false, message: "未找到指定的PDF文件" };
    }

    const row = rows[0];
    return {
      success: true,
      data: {
        fileName: row.file_name,
        fileContent: row.file_content,
        fileSize: row.file_size,
      },
    };
  } catch (error) {
    console.error("获取PDF文件内容失败:", error);
    return { success: false, message: `获取PDF文件内容失败: ${error.message}` };
  }
}

// GET路由处理文件下载
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const isView = searchParams.get("view") === "true";

    console.log("PDF请求，ID:", id, "查看模式:", isView);

    if (!id) {
      return NextResponse.json(
        { success: false, message: "缺少文件ID" },
        { status: 400 }
      );
    }

    // 从数据库获取文件内容
    const result = await getPdfContent(id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 404 }
      );
    }

    const { fileName, fileContent, fileSize } = result.data;

    // 将base64内容解码为二进制
    let binaryContent;
    if (typeof fileContent === "string") {
      // 如果是base64字符串，解码为Buffer
      binaryContent = Buffer.from(fileContent, "base64");
      console.log("Base64解码完成，大小:", binaryContent.length);
    } else {
      // 如果已经是Buffer，直接使用
      binaryContent = fileContent;
      console.log("直接使用Buffer，大小:", binaryContent.length);
    }

    console.log("PDF文件信息:", {
      fileName,
      fileSize,
      contentLength: binaryContent ? binaryContent.length : 0,
      isView,
    });

    // 根据模式设置响应头
    const headers = {
      "Content-Type": "application/pdf",
      "Content-Length": fileSize.toString(),
    };

    if (isView) {
      // 在线查看模式：内联显示
      headers["Content-Disposition"] = `inline; filename="${encodeURIComponent(
        fileName
      )}"`;
    } else {
      // 下载模式：强制下载
      headers[
        "Content-Disposition"
      ] = `attachment; filename="${encodeURIComponent(fileName)}"`;
    }

    // 返回文件
    return new NextResponse(binaryContent, {
      headers,
    });
  } catch (error) {
    console.error("PDF下载失败:", error);
    return NextResponse.json(
      { success: false, message: `下载失败: ${error.message}` },
      { status: 500 }
    );
  }
}
