import { NextResponse } from "next/server";

export async function GET() {
  try {
    const envVars = {
      DB_HOST: process.env.DB_HOST,
      DB_PORT: process.env.DB_PORT,
      DB_USER: process.env.DB_USER,
      DB_PASSWORD: process.env.DB_PASSWORD ? "***已设置***" : null,
      DB_DATABASE: process.env.DB_DATABASE,
      DB_CHARSET: process.env.DB_CHARSET,
      DB_CONNECTION_LIMIT: process.env.DB_CONNECTION_LIMIT,
    };

    return NextResponse.json({
      success: true,
      message: "环境变量检查完成",
      envVars,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: `检查环境变量失败: ${error.message}`,
      },
      { status: 500 }
    );
  }
}
