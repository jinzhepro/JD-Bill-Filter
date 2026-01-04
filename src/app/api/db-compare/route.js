import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

export async function GET() {
  const results = {
    timestamp: new Date().toISOString(),
    navicatVsApp: {
      navicat: {
        connectionType: "GUI客户端",
        authentication: "可能使用不同的认证插件",
        ipResolution: "可能通过不同的网络路径",
        sslConfig: "可能自动协商SSL",
        charset: "可能使用默认字符集",
      },
      application: {
        connectionType: "Node.js mysql2驱动",
        authentication: "使用mysql2默认认证插件",
        ipResolution: `当前应用IP: 39.77.26.135`,
        sslConfig: "当前未配置SSL",
        charset: "utf8mb4",
      },
    },
    possibleDifferences: [],
    testResults: [],
    recommendations: [],
  };

  // 测试不同的连接配置
  const testConfigs = [
    {
      name: "当前配置",
      config: {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
        charset: "utf8mb4",
        connectTimeout: 10000,
      },
    },
    {
      name: "不指定数据库",
      config: {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        charset: "utf8mb4",
        connectTimeout: 10000,
      },
    },
    {
      name: "使用默认字符集",
      config: {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
        connectTimeout: 10000,
      },
    },
    {
      name: "添加SSL配置",
      config: {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
        charset: "utf8mb4",
        ssl: {
          rejectUnauthorized: false,
        },
        connectTimeout: 10000,
      },
    },
  ];

  // 分析可能的差异
  results.possibleDifferences = [
    {
      issue: "认证插件差异",
      explanation:
        "Navicat可能使用caching_sha2_password，而mysql2可能使用mysql_native_password",
      solution: "尝试指定认证插件或更新MySQL用户认证方式",
    },
    {
      issue: "SSL/TLS配置",
      explanation: "Navicat可能自动处理SSL连接，而应用需要明确配置",
      solution: "添加SSL配置或禁用SSL验证",
    },
    {
      issue: "字符集差异",
      explanation: "不同的字符集配置可能导致认证问题",
      solution: "尝试不同的字符集配置或不指定字符集",
    },
    {
      issue: "网络路径差异",
      explanation: "Navicat和应用可能通过不同的网络路径连接数据库",
      solution: "检查数据库服务器的用户权限配置",
    },
    {
      issue: "连接超时设置",
      explanation: "不同的超时设置可能影响连接建立",
      solution: "调整连接超时时间",
    },
  ];

  // 测试不同的配置
  for (const test of testConfigs) {
    try {
      const connection = await mysql.createConnection(test.config);
      await connection.ping();

      // 获取连接信息
      const [serverInfo] = await connection.execute(
        "SELECT VERSION() as version, CONNECTION_ID() as connection_id"
      );
      const [userInfo] = await connection.execute(
        "SELECT CURRENT_USER() as current_user"
      );

      results.testResults.push({
        config: test.name,
        status: "success",
        message: "连接成功",
        details: {
          serverVersion: serverInfo[0].version,
          connectionId: serverInfo[0].connection_id,
          currentUser: userInfo[0].current_user,
        },
      });

      await connection.end();
    } catch (error) {
      results.testResults.push({
        config: test.name,
        status: "failed",
        message: error.message,
        details: {
          code: error.code,
          errno: error.errno,
          sqlState: error.sqlState,
        },
      });
    }
  }

  // 生成建议
  const successfulTests = results.testResults.filter(
    (r) => r.status === "success"
  );
  const failedTests = results.testResults.filter((r) => r.status === "failed");

  if (successfulTests.length > 0) {
    results.recommendations.push(
      `✅ 找到可用的连接配置: ${successfulTests
        .map((t) => t.config)
        .join(", ")}`
    );
    results.recommendations.push("建议使用成功的配置更新应用程序");
  } else {
    results.recommendations.push("❌ 所有测试配置都失败了");
    results.recommendations.push("建议检查以下方面:");

    if (failedTests.some((t) => t.details.code === "ER_ACCESS_DENIED_ERROR")) {
      results.recommendations.push("1. 用户权限问题 - 在MySQL服务器上执行:");
      results.recommendations.push(
        "   GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' IDENTIFIED BY 'Qyt0532$2023';"
      );
      results.recommendations.push("   FLUSH PRIVILEGES;");
    }

    results.recommendations.push(
      "2. 检查MySQL服务器配置文件中的bind-address设置"
    );
    results.recommendations.push("3. 确认防火墙允许从应用服务器IP连接");
    results.recommendations.push(
      "4. 检查MySQL用户是否允许从IP 39.77.26.135 连接"
    );
  }

  // 添加Navicat特定的分析
  results.recommendations.push("Navicat连接成功的原因可能包括:");
  results.recommendations.push("- Navicat可能使用不同的认证方式");
  results.recommendations.push("- Navicat可能自动处理SSL/TLS配置");
  results.recommendations.push("- Navicat可能通过不同的网络接口连接");
  results.recommendations.push("- Navicat可能使用不同的字符集设置");

  return NextResponse.json(results);
}
