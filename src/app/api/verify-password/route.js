import { NextResponse } from "next/server";

export async function GET() {
  const results = {
    timestamp: new Date().toISOString(),
    envCheck: {
      DB_HOST: process.env.DB_HOST,
      DB_PORT: process.env.DB_PORT,
      DB_USER: process.env.DB_USER,
      DB_PASSWORD: process.env.DB_PASSWORD ? "已设置" : "未设置",
      DB_PASSWORD_LENGTH: process.env.DB_PASSWORD
        ? process.env.DB_PASSWORD.length
        : 0,
      DB_PASSWORD_FIRST_CHAR: process.env.DB_PASSWORD
        ? process.env.DB_PASSWORD.charAt(0)
        : null,
      DB_PASSWORD_LAST_CHAR: process.env.DB_PASSWORD
        ? process.env.DB_PASSWORD.charAt(process.env.DB_PASSWORD.length - 1)
        : null,
      DB_DATABASE: process.env.DB_DATABASE,
      DB_CHARSET: process.env.DB_CHARSET,
      DB_CONNECTION_LIMIT: process.env.DB_CONNECTION_LIMIT,
    },
    configCheck: {
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD ? "已设置" : "未设置",
      passwordLength: process.env.DB_PASSWORD
        ? process.env.DB_PASSWORD.length
        : 0,
      database: process.env.DB_DATABASE || "testdb",
      charset: process.env.DB_CHARSET || "utf8mb4",
      connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
    },
    analysis: {
      passwordSet: !!process.env.DB_PASSWORD,
      passwordNotEmpty:
        process.env.DB_PASSWORD && process.env.DB_PASSWORD.length > 0,
      passwordMatchesExpected: process.env.DB_PASSWORD === "Qyt0532$2023",
      expectedPassword: "Qyt0532$2023",
      actualPasswordLength: process.env.DB_PASSWORD
        ? process.env.DB_PASSWORD.length
        : 0,
      expectedPasswordLength: "Qyt0532$2023".length,
    },
  };

  // 检查密码是否匹配
  if (results.analysis.passwordMatchesExpected) {
    results.message = "✅ DB_PASSWORD 环境变量已正确设置并匹配预期值";
  } else if (results.analysis.passwordSet) {
    results.message = "⚠️ DB_PASSWORD 环境变量已设置，但与预期值不匹配";
  } else {
    results.message = "❌ DB_PASSWORD 环境变量未设置";
  }

  return NextResponse.json(results);
}
