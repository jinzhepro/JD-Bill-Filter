import { NextResponse } from "next/server";

// GET路由处理文件下载（数据库功能已移除）
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

    // 数据库功能已移除
    return NextResponse.json(
      { success: false, message: "PDF下载功能已禁用（数据库已移除）" },
      { status: 404 }
    );
  } catch (error) {
    console.error("PDF下载失败:", error);
    return NextResponse.json(
      { success: false, message: `下载失败: ${error.message}` },
      { status: 500 }
    );
  }
}