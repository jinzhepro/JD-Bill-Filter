import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

// MySQL数据库连接配置
const dbConfig = {
  host: "localhost",
  user: "root",
  password: "root123",
  database: "testdb",
  charset: "utf8mb4",
  connectionLimit: 10,
};

// 创建连接池
const pool = mysql.createPool(dbConfig);

// 测试数据库连接
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    return { success: true, message: "数据库连接成功" };
  } catch (error) {
    console.error("数据库连接失败:", error);
    return { success: false, message: `数据库连接失败: ${error.message}` };
  }
}

// 创建库存表（如果不存在）
async function createInventoryTable() {
  try {
    const connection = await pool.getConnection();

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS inventory (
        id VARCHAR(255) PRIMARY KEY,
        material_name VARCHAR(500) NOT NULL COMMENT '物料名称',
        quantity INT NOT NULL DEFAULT 0 COMMENT '数量',
        purchase_batch VARCHAR(255) NOT NULL COMMENT '采购批号',
        sku VARCHAR(255) DEFAULT '' COMMENT '商品SKU',
        unit_price DECIMAL(10, 2) DEFAULT 0.00 COMMENT '单价',
        total_price DECIMAL(10, 2) DEFAULT 0.00 COMMENT '总价',
        tax_rate DECIMAL(5, 2) DEFAULT 13.00 COMMENT '税率',
        tax_amount DECIMAL(10, 2) DEFAULT 0.00 COMMENT '税额',
        warehouse VARCHAR(255) DEFAULT '' COMMENT '仓库',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        INDEX idx_purchase_batch (purchase_batch),
        INDEX idx_sku (sku),
        INDEX idx_warehouse (warehouse)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='库存表';
    `;

    await connection.execute(createTableSQL);
    connection.release();

    return { success: true, message: "库存表创建成功或已存在" };
  } catch (error) {
    console.error("创建库存表失败:", error);
    return { success: false, message: `创建库存表失败: ${error.message}` };
  }
}

// 推送库存数据到MySQL
async function pushInventoryToMySQL(inventoryItems) {
  if (!inventoryItems || inventoryItems.length === 0) {
    return { success: false, message: "没有库存数据需要推送" };
  }

  try {
    const connection = await pool.getConnection();

    // 开始事务
    await connection.beginTransaction();

    try {
      // 准备插入语句
      const insertSQL = `
        INSERT INTO inventory (
          id, material_name, quantity, purchase_batch, sku, 
          unit_price, total_price, tax_rate, tax_amount, warehouse
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          material_name = VALUES(material_name),
          quantity = VALUES(quantity),
          sku = VALUES(sku),
          unit_price = VALUES(unit_price),
          total_price = VALUES(total_price),
          tax_rate = VALUES(tax_rate),
          tax_amount = VALUES(tax_amount),
          warehouse = VALUES(warehouse),
          updated_at = CURRENT_TIMESTAMP
      `;

      // 批量插入数据
      for (const item of inventoryItems) {
        await connection.execute(insertSQL, [
          item.id,
          item.materialName,
          item.quantity,
          item.purchaseBatch,
          item.sku || "",
          item.unitPrice || 0,
          item.totalPrice || 0,
          item.taxRate || 13,
          item.taxAmount || 0,
          item.warehouse || "",
        ]);
      }

      // 提交事务
      await connection.commit();
      connection.release();

      return {
        success: true,
        message: `成功推送 ${inventoryItems.length} 条库存数据到MySQL数据库`,
      };
    } catch (error) {
      // 回滚事务
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error("推送库存数据到MySQL失败:", error);
    return {
      success: false,
      message: `推送库存数据到MySQL失败: ${error.message}`,
    };
  }
}

// 从MySQL获取库存数据
async function getInventoryFromMySQL() {
  try {
    const connection = await pool.getConnection();

    const [rows] = await connection.execute(`
      SELECT 
        id, material_name, quantity, purchase_batch, sku,
        unit_price, total_price, tax_rate, tax_amount, warehouse,
        created_at, updated_at
      FROM inventory 
      ORDER BY purchase_batch, material_name
    `);

    connection.release();

    // 转换字段名为前端使用的格式
    const inventoryItems = rows.map((row) => ({
      id: row.id,
      materialName: row.material_name,
      quantity: row.quantity,
      purchaseBatch: row.purchase_batch,
      sku: row.sku,
      unitPrice: row.unit_price,
      totalPrice: row.total_price,
      taxRate: row.tax_rate,
      taxAmount: row.tax_amount,
      warehouse: row.warehouse,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return {
      success: true,
      data: inventoryItems,
      message: `从MySQL获取了 ${inventoryItems.length} 条库存数据`,
    };
  } catch (error) {
    console.error("从MySQL获取库存数据失败:", error);
    return {
      success: false,
      message: `从MySQL获取库存数据失败: ${error.message}`,
    };
  }
}

// 清空MySQL中的库存数据
async function clearInventoryInMySQL() {
  try {
    const connection = await pool.getConnection();

    await connection.execute("DELETE FROM inventory");

    connection.release();

    return {
      success: true,
      message: "已清空MySQL中的库存数据",
    };
  } catch (error) {
    console.error("清空MySQL库存数据失败:", error);
    return {
      success: false,
      message: `清空MySQL库存数据失败: ${error.message}`,
    };
  }
}

// 从MySQL删除单个库存项
async function deleteInventoryFromMySQL(id) {
  console.log("deleteInventoryFromMySQL函数被调用，ID:", id);

  if (!id) {
    console.error("缺少库存项ID");
    return { success: false, message: "缺少库存项ID" };
  }

  try {
    const connection = await pool.getConnection();
    console.log("获取数据库连接成功");

    // 先查询一下是否存在这个ID的记录
    const [checkRows] = await connection.execute(
      "SELECT id FROM inventory WHERE id = ?",
      [id]
    );
    console.log("查询结果:", checkRows);

    const [result] = await connection.execute(
      "DELETE FROM inventory WHERE id = ?",
      [id]
    );
    console.log("删除操作结果:", result);

    connection.release();

    if (result.affectedRows > 0) {
      console.log("删除成功，影响行数:", result.affectedRows);
      return {
        success: true,
        message: "成功删除库存项",
      };
    } else {
      console.log("删除失败，没有影响任何行");
      return {
        success: false,
        message: "未找到要删除的库存项",
      };
    }
  } catch (error) {
    console.error("从MySQL删除库存项失败:", error);
    return {
      success: false,
      message: `从MySQL删除库存项失败: ${error.message}`,
    };
  }
}

// API路由处理函数
export async function POST(request) {
  try {
    const body = await request.json();
    const { action, data } = body;

    console.log("MySQL API请求:", { action, data });

    let result;

    switch (action) {
      case "testConnection":
        result = await testConnection();
        break;

      case "createTable":
        result = await createInventoryTable();
        break;

      case "pushData":
        result = await pushInventoryToMySQL(data);
        break;

      case "pullData":
        result = await getInventoryFromMySQL();
        break;

      case "clearData":
        result = await clearInventoryInMySQL();
        break;

      default:
        result = { success: false, message: "未知的操作类型" };
    }

    console.log("API响应:", result);
    return NextResponse.json(result);
  } catch (error) {
    console.error("MySQL API错误:", error);
    return NextResponse.json(
      { success: false, message: `API错误: ${error.message}` },
      { status: 500 }
    );
  }
}

// DELETE路由处理函数 - 用于删除单个库存项或清空所有数据
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const action = searchParams.get("action");

    console.log("DELETE API请求，ID:", id, "Action:", action);

    let result;

    if (action === "clearAll") {
      // 清空所有库存数据
      result = await clearInventoryInMySQL();
    } else if (id) {
      // 删除单个库存项
      result = await deleteInventoryFromMySQL(id);
    } else {
      return NextResponse.json(
        { success: false, message: "缺少库存项ID或操作类型" },
        { status: 400 }
      );
    }

    console.log("删除结果:", result);

    return NextResponse.json(result);
  } catch (error) {
    console.error("DELETE API错误:", error);
    return NextResponse.json(
      { success: false, message: `API错误: ${error.message}` },
      { status: 500 }
    );
  }
}

// GET路由处理函数 - 用于测试DELETE路由
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    console.log("GET API请求，测试DELETE路由，ID:", id);

    if (!id) {
      return NextResponse.json(
        { success: false, message: "缺少库存项ID" },
        { status: 400 }
      );
    }

    // 直接调用删除函数进行测试
    const result = await deleteInventoryFromMySQL(id);
    console.log("GET路由测试删除结果:", result);

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET API错误:", error);
    return NextResponse.json(
      { success: false, message: `API错误: ${error.message}` },
      { status: 500 }
    );
  }
}
