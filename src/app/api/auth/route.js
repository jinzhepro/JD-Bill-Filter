import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

// MySQL数据库连接配置 - 使用环境变量
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

// 创建用户表（如果不存在）
async function createUserTable() {
  try {
    const connection = await pool.getConnection();

    // 创建表（如果不存在）
    const createTableSQL = `
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';
    `;

    await connection.execute(createTableSQL);
    connection.release();

    return { success: true, message: "用户表创建成功或已存在" };
  } catch (error) {
    console.error("创建用户表失败:", error);
    return { success: false, message: `创建用户表失败: ${error.message}` };
  }
}

// 验证用户登录
async function authenticateUser(username, password) {
  if (!username || !password) {
    return { success: false, message: "用户名和密码不能为空" };
  }

  try {
    const connection = await pool.getConnection();

    // 查询用户
    const [users] = await connection.execute(
      "SELECT * FROM users WHERE username = ? AND is_active = TRUE",
      [username]
    );

    connection.release();

    if (users.length === 0) {
      return { success: false, message: "用户名或密码错误" };
    }

    const user = users[0];

    // 这里应该使用密码哈希比较，为了简化暂时使用明文比较
    // 在生产环境中应该使用 bcrypt 等安全的密码哈希方式
    if (user.password !== password) {
      return { success: false, message: "用户名或密码错误" };
    }

    // 更新最后登录时间
    await updateLastLogin(user.id);

    return {
      success: true,
      message: "登录成功",
      user: {
        id: user.id,
        username: user.username,
        realName: user.real_name,
        role: user.role,
        lastLogin: user.last_login,
      },
    };
  } catch (error) {
    console.error("用户认证失败:", error);
    return { success: false, message: `用户认证失败: ${error.message}` };
  }
}

// 更新用户最后登录时间
async function updateLastLogin(userId) {
  try {
    const connection = await pool.getConnection();
    await connection.execute(
      "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?",
      [userId]
    );
    connection.release();
  } catch (error) {
    console.error("更新最后登录时间失败:", error);
  }
}

// 创建默认管理员用户
async function createDefaultAdmin() {
  try {
    const connection = await pool.getConnection();

    // 检查是否已有管理员用户
    const [adminUsers] = await connection.execute(
      "SELECT COUNT(*) as count FROM users WHERE role = 'admin'"
    );

    if (adminUsers[0].count > 0) {
      connection.release();
      return { success: true, message: "管理员用户已存在" };
    }

    // 创建默认管理员用户
    const adminId = `user-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    await connection.execute(
      "INSERT INTO users (id, username, password, real_name, role) VALUES (?, ?, ?, ?, ?)",
      [adminId, "admin", "admin123", "系统管理员", "admin"]
    );

    connection.release();

    return {
      success: true,
      message: "默认管理员用户创建成功（用户名：admin，密码：admin123）",
    };
  } catch (error) {
    console.error("创建默认管理员失败:", error);
    return { success: false, message: `创建默认管理员失败: ${error.message}` };
  }
}

// 获取所有用户
async function getAllUsers() {
  try {
    const connection = await pool.getConnection();

    const [rows] = await connection.execute(`
      SELECT 
        id, username, real_name, role, is_active, last_login, 
        created_at, updated_at
      FROM users 
      ORDER BY created_at DESC
    `);

    connection.release();

    // 转换字段名为前端使用的格式
    const users = rows.map((row) => ({
      id: row.id,
      username: row.username,
      realName: row.real_name,
      role: row.role,
      isActive: row.is_active,
      lastLogin: row.last_login,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return {
      success: true,
      data: users,
      message: `获取了 ${users.length} 个用户`,
    };
  } catch (error) {
    console.error("获取用户列表失败:", error);
    return {
      success: false,
      message: `获取用户列表失败: ${error.message}`,
    };
  }
}

// 创建新用户
async function createUser(userData) {
  const { username, password, realName, role = "user" } = userData;

  if (!username || !password) {
    return { success: false, message: "用户名和密码不能为空" };
  }

  try {
    const connection = await pool.getConnection();

    // 检查用户名是否已存在
    const [existingUsers] = await connection.execute(
      "SELECT COUNT(*) as count FROM users WHERE username = ?",
      [username]
    );

    if (existingUsers[0].count > 0) {
      connection.release();
      return { success: false, message: "用户名已存在" };
    }

    // 创建新用户
    const userId = `user-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    await connection.execute(
      "INSERT INTO users (id, username, password, real_name, role) VALUES (?, ?, ?, ?, ?)",
      [userId, username, password, realName || "", role]
    );

    connection.release();

    return { success: true, message: "用户创建成功" };
  } catch (error) {
    console.error("创建用户失败:", error);
    return { success: false, message: `创建用户失败: ${error.message}` };
  }
}

// 更新用户
async function updateUser(userId, userData) {
  const { username, realName, role, isActive } = userData;

  if (!userId) {
    return { success: false, message: "用户ID不能为空" };
  }

  try {
    const connection = await pool.getConnection();

    // 检查用户是否存在
    const [existingUsers] = await connection.execute(
      "SELECT COUNT(*) as count FROM users WHERE id = ?",
      [userId]
    );

    if (existingUsers[0].count === 0) {
      connection.release();
      return { success: false, message: "用户不存在" };
    }

    // 如果更新用户名，检查新用户名是否已存在
    if (username) {
      const [usernameCheck] = await connection.execute(
        "SELECT COUNT(*) as count FROM users WHERE username = ? AND id != ?",
        [username, userId]
      );

      if (usernameCheck[0].count > 0) {
        connection.release();
        return { success: false, message: "用户名已存在" };
      }
    }

    // 构建更新语句
    const updateFields = [];
    const updateValues = [];

    if (username !== undefined) {
      updateFields.push("username = ?");
      updateValues.push(username);
    }
    if (realName !== undefined) {
      updateFields.push("real_name = ?");
      updateValues.push(realName);
    }
    if (role !== undefined) {
      updateFields.push("role = ?");
      updateValues.push(role);
    }
    if (isActive !== undefined) {
      updateFields.push("is_active = ?");
      updateValues.push(isActive);
    }

    if (updateFields.length === 0) {
      connection.release();
      return { success: false, message: "没有要更新的字段" };
    }

    updateFields.push("updated_at = CURRENT_TIMESTAMP");
    updateValues.push(userId);

    await connection.execute(
      `UPDATE users SET ${updateFields.join(", ")} WHERE id = ?`,
      updateValues
    );

    connection.release();

    return { success: true, message: "用户更新成功" };
  } catch (error) {
    console.error("更新用户失败:", error);
    return { success: false, message: `更新用户失败: ${error.message}` };
  }
}

// 删除用户
async function deleteUser(userId) {
  if (!userId) {
    return { success: false, message: "用户ID不能为空" };
  }

  try {
    const connection = await pool.getConnection();

    // 检查用户是否存在
    const [existingUsers] = await connection.execute(
      "SELECT COUNT(*) as count, role FROM users WHERE id = ?",
      [userId]
    );

    if (existingUsers[0].count === 0) {
      connection.release();
      return { success: false, message: "用户不存在" };
    }

    // 防止删除最后一个管理员
    if (existingUsers[0].role === "admin") {
      const [adminCount] = await connection.execute(
        "SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND is_active = TRUE"
      );

      if (adminCount[0].count <= 1) {
        connection.release();
        return { success: false, message: "不能删除最后一个管理员用户" };
      }
    }

    // 删除用户
    await connection.execute("DELETE FROM users WHERE id = ?", [userId]);

    connection.release();

    return { success: true, message: "用户删除成功" };
  } catch (error) {
    console.error("删除用户失败:", error);
    return { success: false, message: `删除用户失败: ${error.message}` };
  }
}

// 重置用户密码
async function resetUserPassword(userId, newPassword) {
  if (!userId || !newPassword) {
    return { success: false, message: "用户ID和新密码不能为空" };
  }

  try {
    const connection = await pool.getConnection();

    // 检查用户是否存在
    const [existingUsers] = await connection.execute(
      "SELECT COUNT(*) as count FROM users WHERE id = ?",
      [userId]
    );

    if (existingUsers[0].count === 0) {
      connection.release();
      return { success: false, message: "用户不存在" };
    }

    // 更新密码
    await connection.execute(
      "UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [newPassword, userId]
    );

    connection.release();

    return { success: true, message: "密码重置成功" };
  } catch (error) {
    console.error("重置密码失败:", error);
    return { success: false, message: `重置密码失败: ${error.message}` };
  }
}

// API路由处理函数
export async function POST(request) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    console.log(`认证API请求: ${action}`, { data: data ? "received" : "none" });

    let result;

    switch (action) {
      case "login":
        result = await authenticateUser(data.username, data.password);
        break;

      case "createTable":
        result = await createUserTable();
        break;

      case "createDefaultAdmin":
        result = await createDefaultAdmin();
        break;

      case "getUsers":
        result = await getAllUsers();
        break;

      case "createUser":
        result = await createUser(data);
        break;

      case "updateUser":
        result = await updateUser(data.id, data);
        break;

      case "deleteUser":
        result = await deleteUser(data.id);
        break;

      case "resetPassword":
        result = await resetUserPassword(data.id, data.newPassword);
        break;

      default:
        result = { success: false, message: "未知的操作类型" };
    }

    console.log(`认证API响应: ${action}`, { success: result.success });

    return NextResponse.json(result);
  } catch (error) {
    console.error("认证API错误:", error);
    return NextResponse.json(
      { success: false, message: `API错误: ${error.message}` },
      { status: 500 }
    );
  }
}
