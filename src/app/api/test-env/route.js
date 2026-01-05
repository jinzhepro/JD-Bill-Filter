import { NextResponse } from "next/server";

export async function GET() {
  try {
    // 测试环境变量
    const envVars = {
      DB_HOST: process.env.DB_HOST,
      DB_PORT: process.env.DB_PORT,
      DB_USER: process.env.DB_USER,
      DB_PASSWORD: process.env.DB_PASSWORD,
      DB_DATABASE: process.env.DB_DATABASE,
      DB_CHARSET: process.env.DB_CHARSET,
      NODE_ENV: process.env.NODE_ENV,
    };

    // 测试数据库连接
    const mysql = require("mysql2/promise");
    const dbConfig = {
      host: envVars.DB_HOST || "localhost",
      port: parseInt(envVars.DB_PORT) || 3306,
      user: envVars.DB_USER || "root",
      password: envVars.DB_PASSWORD || "",
      database: envVars.DB_DATABASE || "testdb",
      charset: envVars.DB_CHARSET || "utf8mb4",
      connectionLimit: 10,
    };

    const connection = await mysql.createConnection(dbConfig);

    // 测试连接
    await connection.ping();

    // 检查现有表
    const [tables] = await connection.execute("SHOW TABLES");
    const tableNames = tables.map((table) => table[0]);

    // 初始化用户表
    let userTableExists = tableNames.includes("users");
    let userTableInitialized = false;

    if (!userTableExists) {
      // 创建用户表
      const createUserTableSQL = `
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(255) PRIMARY KEY,
          username VARCHAR(255) NOT NULL UNIQUE COMMENT '用户名',
          password VARCHAR(255) NOT NULL COMMENT '密码（加密存储）',
          real_name VARCHAR(255) DEFAULT '' COMMENT '真实姓名',
          role ENUM('admin', 'user') DEFAULT 'user' COMMENT '用户角色',
          is_active BOOLEAN DEFAULT TRUE COMMENT '是否激活',
          last_login TIMESTAMP NULL COMMENT '最后登录时间',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
          INDEX idx_username (username),
          INDEX idx_role (role)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表'
      `;

      await connection.execute(createUserTableSQL);
      userTableInitialized = true;
    }

    // 检查是否有管理员用户
    const [adminUsers] = await connection.execute(
      "SELECT COUNT(*) as count FROM users WHERE role = 'admin'"
    );

    let adminCreated = false;
    if (adminUsers[0].count === 0) {
      // 创建默认管理员用户
      const adminId = `user-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      await connection.execute(
        "INSERT INTO users (id, username, password, real_name, role) VALUES (?, ?, ?, ?, ?)",
        [adminId, "admin", "admin123", "系统管理员", "admin"]
      );
      adminCreated = true;
    }

    await connection.end();

    return NextResponse.json({
      success: true,
      message: "连接测试成功",
      env: envVars,
      database: {
        connected: true,
        tables: tableNames,
        userTable: {
          exists: userTableExists,
          initialized: userTableInitialized,
        },
        adminUser: {
          exists: adminUsers[0].count > 0,
          created: adminCreated,
        },
      },
    });
  } catch (error) {
    console.error("连接测试失败:", error);
    return NextResponse.json({
      success: false,
      message: `连接测试失败: ${error.message}`,
      error: error.message,
    });
  }
}
