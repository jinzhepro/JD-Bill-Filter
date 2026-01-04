import { NextResponse } from "next/server";

export async function GET() {
  // 检查原始环境变量
  const rawPassword = process.env.DB_PASSWORD;

  // 详细分析密码
  const passwordAnalysis = {
    rawValue: rawPassword,
    length: rawPassword ? rawPassword.length : 0,
    charCodes: rawPassword
      ? rawPassword.split("").map((char) => ({
          char: char,
          code: char.charCodeAt(0),
          hex: char.charCodeAt(0).toString(16),
        }))
      : [],
    hasDollarSign: rawPassword ? rawPassword.includes("$") : false,
    dollarSignPositions: rawPassword
      ? rawPassword
          .split("")
          .map((char, index) => (char === "$" ? index : -1))
          .filter((pos) => pos !== -1)
      : [],
  };

  // 检查其他可能的环境变量名
  const alternativeNames = [
    "DB_PASSWORD",
    "DBPASS",
    "DATABASE_PASSWORD",
    "MYSQL_PASSWORD",
    "db_password",
  ];

  const alternativeChecks = alternativeNames.map((name) => ({
    name: name,
    value: process.env[name],
    length: process.env[name] ? process.env[name].length : 0,
    set: !!process.env[name],
  }));

  // 检查 process.env 中的所有相关变量
  const allEnvVars = Object.keys(process.env)
    .filter(
      (key) =>
        key.toLowerCase().includes("password") ||
        key.toLowerCase().includes("db")
    )
    .map((key) => ({
      key: key,
      value: process.env[key],
      length: process.env[key] ? process.env[key].length : 0,
    }));

  const results = {
    timestamp: new Date().toISOString(),
    passwordAnalysis,
    alternativeChecks,
    allEnvVars,
    recommendations: [],
  };

  // 生成建议
  if (passwordAnalysis.length !== 12) {
    results.recommendations.push(
      "密码长度不正确，预期12个字符，实际" + passwordAnalysis.length + "个字符"
    );

    if (passwordAnalysis.hasDollarSign) {
      results.recommendations.push("密码包含$符号，可能被shell解释器处理");
      results.recommendations.push(
        "尝试在.env.local中用单引号包围密码: DB_PASSWORD='Qyt0532$2023'"
      );
      results.recommendations.push("或者转义$符号: DB_PASSWORD=Qyt0532\\$2023");
    }
  }

  if (
    alternativeChecks.some((check) => check.set && check.name !== "DB_PASSWORD")
  ) {
    results.recommendations.push(
      "发现其他可能的环境变量名，请检查是否使用了错误的变量名"
    );
  }

  return NextResponse.json(results);
}
