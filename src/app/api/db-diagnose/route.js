import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

export async function GET() {
  const results = {
    timestamp: new Date().toISOString(),
    steps: [],
    success: false,
    recommendations: [],
  };

  try {
    // 步骤1：检查环境变量
    results.steps.push({
      step: 1,
      name: "检查环境变量",
      status: "info",
      message: "验证数据库配置环境变量",
    });

    const envConfig = {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD ? "***已设置***" : "未设置",
      database: process.env.DB_DATABASE,
      charset: process.env.DB_CHARSET,
      connectionLimit: process.env.DB_CONNECTION_LIMIT,
    };

    results.steps.push({
      step: 1,
      name: "环境变量检查结果",
      status: "success",
      message: "环境变量已正确加载",
      data: envConfig,
    });

    // 步骤2：测试主机连通性
    results.steps.push({
      step: 2,
      name: "测试主机连通性",
      status: "info",
      message: `尝试连接到 ${envConfig.host}:${envConfig.port}`,
    });

    // 步骤3：尝试数据库连接
    results.steps.push({
      step: 3,
      name: "尝试数据库连接",
      status: "info",
      message: "使用提供的凭据连接数据库",
    });

    const dbConfig = {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      charset: process.env.DB_CHARSET || "utf8mb4",
      connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
      connectTimeout: 10000, // 10秒超时
    };

    try {
      const connection = await mysql.createConnection(dbConfig);

      results.steps.push({
        step: 3,
        name: "数据库连接成功",
        status: "success",
        message: "成功连接到数据库服务器",
      });

      // 步骤4：测试数据库访问
      results.steps.push({
        step: 4,
        name: "测试数据库访问",
        status: "info",
        message: `检查数据库 ${envConfig.database} 的访问权限`,
      });

      const [rows] = await connection.execute(
        "SELECT DATABASE() as current_db"
      );
      const currentDb = rows[0].current_db;

      results.steps.push({
        step: 4,
        name: "数据库访问成功",
        status: "success",
        message: `当前数据库: ${currentDb}`,
      });

      // 步骤5：测试表操作权限
      results.steps.push({
        step: 5,
        name: "测试表操作权限",
        status: "info",
        message: "检查表的创建和查询权限",
      });

      try {
        await connection.execute("SHOW TABLES");
        results.steps.push({
          step: 5,
          name: "表操作权限正常",
          status: "success",
          message: "具有查询表的权限",
        });
      } catch (tableError) {
        results.steps.push({
          step: 5,
          name: "表操作权限检查失败",
          status: "warning",
          message: `表操作权限问题: ${tableError.message}`,
        });
      }

      await connection.end();
      results.success = true;
      results.recommendations.push("数据库连接配置正确，所有测试通过");
    } catch (connectionError) {
      results.steps.push({
        step: 3,
        name: "数据库连接失败",
        status: "error",
        message: connectionError.message,
        details: {
          code: connectionError.code,
          errno: connectionError.errno,
          sqlState: connectionError.sqlState,
        },
      });

      // 根据错误类型提供具体建议
      if (connectionError.code === "ER_ACCESS_DENIED_ERROR") {
        results.recommendations.push(
          "用户名或密码错误，或者用户没有从当前IP连接的权限"
        );
        results.recommendations.push(
          "请在MySQL服务器上执行: GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' IDENTIFIED BY 'your_password'; FLUSH PRIVILEGES;"
        );
        results.recommendations.push(
          "或者创建新用户: CREATE USER 'app_user'@'%' IDENTIFIED BY 'your_password'; GRANT ALL PRIVILEGES ON jdws.* TO 'app_user'@'%'; FLUSH PRIVILEGES;"
        );
      } else if (connectionError.code === "ECONNREFUSED") {
        results.recommendations.push("无法连接到数据库服务器，请检查:");
        results.recommendations.push("1. 数据库服务器是否运行");
        results.recommendations.push("2. 主机地址和端口是否正确");
        results.recommendations.push("3. 防火墙是否允许连接");
      } else if (connectionError.code === "ENOTFOUND") {
        results.recommendations.push("无法解析主机名，请检查DB_HOST环境变量");
      } else if (connectionError.code === "ETIMEDOUT") {
        results.recommendations.push("连接超时，可能是网络问题或服务器响应慢");
      } else {
        results.recommendations.push(`未知错误: ${connectionError.message}`);
      }
    }
  } catch (error) {
    results.steps.push({
      step: "error",
      name: "诊断过程出错",
      status: "error",
      message: error.message,
    });
  }

  return NextResponse.json(results);
}
