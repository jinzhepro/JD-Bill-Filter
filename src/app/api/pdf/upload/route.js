import { NextResponse } from "next/server";

// 验证PDF文件
function validatePdfFile(file) {
  if (!file) {
    return { valid: false, message: "没有文件被上传" };
  }

  // 检查文件类型
  if (!file.type || !file.type.includes("pdf")) {
    return { valid: false, message: "只支持PDF文件格式" };
  }

  // 检查文件大小 (限制为10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return { valid: false, message: "文件大小不能超过10MB" };
  }

  return { valid: true };
}

// POST路由处理文件上传
export async function POST(request) {
  try {
    console.log("PDF上传请求开始");

    // 解析表单数据
    const formData = await request.formData();
    const file = formData.get("file");
    const batchName = formData.get("batchName");
    const description = formData.get("description");

    console.log("上传参数:", {
      batchName,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
    });

    // 验证必要参数
    if (!batchName) {
      return NextResponse.json(
        { success: false, message: "缺少批号参数" },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json(
        { success: false, message: "没有选择文件" },
        { status: 400 }
      );
    }

    // 验证PDF文件
    const validation = validatePdfFile(file);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, message: validation.message },
        { status: 400 }
      );
    }

    // 读取文件内容并转换为base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Content = buffer.toString("base64");

    console.log("文件转换为base64，大小:", base64Content.length);

    // 保存文件信息到数据库
    const mysqlResponse = await fetch(new URL("/api/mysql", request.url), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "uploadBatchPdf",
        data: {
          batchName,
          fileName: file.name,
          fileContent: base64Content,
          fileSize: file.size,
          description: description || "",
        },
      }),
    });

    const mysqlResult = await mysqlResponse.json();

    if (!mysqlResult.success) {
      return NextResponse.json(
        { success: false, message: mysqlResult.message },
        { status: 500 }
      );
    }

    console.log("PDF上传成功:", mysqlResult.message);

    return NextResponse.json({
      success: true,
      message: mysqlResult.message,
      data: {
        id: mysqlResult.data.id,
        batchName,
        fileName: file.name,
        fileSize: file.size,
        downloadUrl: `/api/pdf/download/${mysqlResult.data.id}`,
        description: description || "",
      },
    });
  } catch (error) {
    console.error("PDF上传失败:", error);
    return NextResponse.json(
      { success: false, message: `上传失败: ${error.message}` },
      { status: 500 }
    );
  }
}
