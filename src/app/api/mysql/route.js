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

// 测试数据库连接
async function testConnection() {
  try {
    console.log("尝试连接数据库，配置:", {
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      database: dbConfig.database,
      charset: dbConfig.charset,
      connectionLimit: dbConfig.connectionLimit,
    });

    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    return { success: true, message: "数据库连接成功" };
  } catch (error) {
    console.error("数据库连接失败:", error);
    console.error("错误详情:", {
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage,
    });
    return {
      success: false,
      message: `数据库连接失败: ${error.message}`,
      details: {
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage,
      },
    };
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

    // 创建库存分组表
    const createBatchTableSQL = `
      CREATE TABLE IF NOT EXISTS inventory_batches (
        id VARCHAR(255) PRIMARY KEY,
        batch_name VARCHAR(255) NOT NULL UNIQUE COMMENT '采购批号',
        description TEXT COMMENT '批次描述',
        total_items INT DEFAULT 0 COMMENT '总品种数',
        total_quantity INT DEFAULT 0 COMMENT '总数量',
        total_amount DECIMAL(12, 2) DEFAULT 0.00 COMMENT '总金额',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        INDEX idx_batch_name (batch_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='库存批次表';
    `;

    await connection.execute(createBatchTableSQL);
    connection.release();

    return { success: true, message: "库存表和批次表创建成功或已存在" };
  } catch (error) {
    console.error("创建库存表失败:", error);
    return { success: false, message: `创建库存表失败: ${error.message}` };
  }
}

// 创建库存扣减记录表（如果不存在）
async function createDeductionTable() {
  try {
    const connection = await pool.getConnection();

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS inventory_deduction_records (
        id VARCHAR(255) PRIMARY KEY,
        sku VARCHAR(255) NOT NULL COMMENT '商品SKU',
        material_name VARCHAR(500) NOT NULL COMMENT '物料名称',
        purchase_batch VARCHAR(255) NOT NULL COMMENT '采购批号',
        original_quantity INT NOT NULL COMMENT '原始库存数量',
        deducted_quantity INT NOT NULL COMMENT '扣减数量',
        remaining_quantity INT NOT NULL COMMENT '剩余库存数量',
        order_count INT NOT NULL COMMENT '订单数量',
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '扣减时间',
        INDEX idx_sku (sku),
        INDEX idx_timestamp (timestamp),
        INDEX idx_purchase_batch (purchase_batch)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='库存扣减记录表';
    `;

    await connection.execute(createTableSQL);
    connection.release();

    return { success: true, message: "库存扣减记录表创建成功或已存在" };
  } catch (error) {
    console.error("创建库存扣减记录表失败:", error);
    return {
      success: false,
      message: `创建库存扣减记录表失败: ${error.message}`,
    };
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
      // 首先确保批次表存在
      await ensureBatchTableExists(connection);
      console.log("批次表检查完成");

      // 收集所有批次名称，过滤掉空值
      const batchNames = [
        ...new Set(
          inventoryItems
            .map((item) => item.purchaseBatch)
            .filter((batch) => batch && batch.trim() !== "")
        ),
      ];

      console.log("处理批次数量:", batchNames.length, "批次名称:", batchNames);

      // 确保所有批次都存在
      for (const batchName of batchNames) {
        console.log("正在处理批次:", batchName);
        const batchResult = await createOrUpdateBatch(batchName);
        if (!batchResult.success) {
          throw new Error(`创建批次失败: ${batchResult.message}`);
        }
      }

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

      // 更新所有批次的统计信息
      for (const batchName of batchNames) {
        await updateBatchStats(batchName);
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

// 创建或更新库存批次
async function createOrUpdateBatch(batchName, description = "") {
  if (!batchName || batchName.trim() === "") {
    return { success: false, message: "批次名称不能为空" };
  }

  try {
    const connection = await pool.getConnection();
    console.log("正在检查批次是否存在:", batchName);

    // 首先确保批次表存在
    await ensureBatchTableExists(connection);

    // 检查批次是否存在
    const [existingBatch] = await connection.execute(
      "SELECT * FROM inventory_batches WHERE batch_name = ?",
      [batchName]
    );

    if (existingBatch.length > 0) {
      console.log("批次已存在，正在更新:", batchName);
      // 更新现有批次
      await connection.execute(
        "UPDATE inventory_batches SET description = ?, updated_at = CURRENT_TIMESTAMP WHERE batch_name = ?",
        [description, batchName]
      );
      console.log("批次更新成功:", batchName);
    } else {
      console.log("创建新批次:", batchName);
      // 创建新批次
      const batchId = `batch-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      await connection.execute(
        "INSERT INTO inventory_batches (id, batch_name, description) VALUES (?, ?, ?)",
        [batchId, batchName, description]
      );
      console.log("批次创建成功:", batchName);
    }

    connection.release();
    return { success: true, message: `批次 "${batchName}" 创建或更新成功` };
  } catch (error) {
    console.error("创建或更新批次失败:", error);
    return { success: false, message: `创建或更新批次失败: ${error.message}` };
  }
}

// 确保批次表存在
async function ensureBatchTableExists(connection) {
  try {
    // 检查表是否存在
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'inventory_batches'"
    );

    if (tables.length === 0) {
      console.log("inventory_batches表不存在，正在创建...");

      // 创建库存分组表
      const createBatchTableSQL = `
        CREATE TABLE inventory_batches (
          id VARCHAR(255) PRIMARY KEY,
          batch_name VARCHAR(255) NOT NULL UNIQUE COMMENT '采购批号',
          description TEXT COMMENT '批次描述',
          total_items INT DEFAULT 0 COMMENT '总品种数',
          total_quantity INT DEFAULT 0 COMMENT '总数量',
          total_amount DECIMAL(12, 2) DEFAULT 0.00 COMMENT '总金额',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
          INDEX idx_batch_name (batch_name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='库存批次表'
      `;

      await connection.execute(createBatchTableSQL);
      console.log("inventory_batches表创建成功");
    } else {
      console.log("inventory_batches表已存在");
    }
  } catch (error) {
    console.error("确保批次表存在失败:", error);
    throw error;
  }
}

// 更新批次统计信息
async function updateBatchStats(batchName) {
  if (!batchName || batchName.trim() === "") {
    return { success: false, message: "批次名称不能为空" };
  }

  try {
    const connection = await pool.getConnection();
    console.log("正在更新批次统计信息:", batchName);

    // 计算批次统计信息
    const [stats] = await connection.execute(
      `
      SELECT
        COUNT(*) as total_items,
        SUM(quantity) as total_quantity,
        SUM(total_price) as total_amount
      FROM inventory
      WHERE purchase_batch = ?
    `,
      [batchName]
    );

    const { total_items, total_quantity, total_amount } = stats[0];
    console.log("批次统计结果:", { total_items, total_quantity, total_amount });

    // 更新批次表
    await connection.execute(
      `
      UPDATE inventory_batches
      SET total_items = ?, total_quantity = ?, total_amount = ?, updated_at = CURRENT_TIMESTAMP
      WHERE batch_name = ?
    `,
      [total_items || 0, total_quantity || 0, total_amount || 0, batchName]
    );

    connection.release();
    console.log("批次统计信息更新成功:", batchName);
    return {
      success: true,
      message: `批次 "${batchName}" 统计信息更新成功 (${total_items} 项, ${total_quantity} 件, ¥${
        total_amount || 0
      })`,
    };
  } catch (error) {
    console.error("更新批次统计信息失败:", error);
    return {
      success: false,
      message: `更新批次统计信息失败: ${error.message}`,
    };
  }
}

// 获取所有批次信息
async function getInventoryBatches() {
  try {
    const connection = await pool.getConnection();

    const [rows] = await connection.execute(`
      SELECT
        id, batch_name, description, total_items, total_quantity, total_amount,
        created_at, updated_at
      FROM inventory_batches
      ORDER BY created_at DESC
    `);

    connection.release();

    return {
      success: true,
      data: rows.map((row) => ({
        id: row.id,
        batchName: row.batch_name,
        description: row.description,
        totalItems: row.total_items,
        totalQuantity: row.total_quantity,
        totalAmount: row.total_amount,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
      message: `获取了 ${rows.length} 个批次信息`,
    };
  } catch (error) {
    console.error("获取批次信息失败:", error);
    return {
      success: false,
      message: `获取批次信息失败: ${error.message}`,
    };
  }
}

// 删除批次
async function deleteBatch(batchName) {
  try {
    const connection = await pool.getConnection();

    // 开始事务
    await connection.beginTransaction();

    try {
      // 删除批次下的所有库存项
      await connection.execute(
        "DELETE FROM inventory WHERE purchase_batch = ?",
        [batchName]
      );

      // 删除批次记录
      const [result] = await connection.execute(
        "DELETE FROM inventory_batches WHERE batch_name = ?",
        [batchName]
      );

      await connection.commit();
      connection.release();

      if (result.affectedRows > 0) {
        return { success: true, message: "批次删除成功" };
      } else {
        return { success: false, message: "未找到要删除的批次" };
      }
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error("删除批次失败:", error);
    return { success: false, message: `删除批次失败: ${error.message}` };
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

    // 先查询库存项的批次信息
    const [itemRows] = await connection.execute(
      "SELECT purchase_batch FROM inventory WHERE id = ?",
      [id]
    );

    if (itemRows.length === 0) {
      connection.release();
      return { success: false, message: "未找到要删除的库存项" };
    }

    const batchName = itemRows[0].purchase_batch;

    // 删除库存项
    const [result] = await connection.execute(
      "DELETE FROM inventory WHERE id = ?",
      [id]
    );
    console.log("删除操作结果:", result);

    if (result.affectedRows > 0) {
      // 更新批次统计信息
      await updateBatchStats(batchName);
      console.log("批次统计信息已更新");
    }

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

// 保存库存扣减记录到MySQL
async function saveDeductionRecords(deductionRecords) {
  if (!deductionRecords || deductionRecords.length === 0) {
    return { success: false, message: "没有扣减记录需要保存" };
  }

  try {
    // 先确保扣减记录表已创建
    await createDeductionTable();

    const connection = await pool.getConnection();

    // 开始事务
    await connection.beginTransaction();

    try {
      // 准备插入语句
      const insertSQL = `
        INSERT INTO inventory_deduction_records (
          id, sku, material_name, purchase_batch, 
          original_quantity, deducted_quantity, remaining_quantity, order_count, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      // 批量插入数据
      for (const record of deductionRecords) {
        await connection.execute(insertSQL, [
          record.id,
          record.sku,
          record.materialName,
          record.purchaseBatch,
          record.originalQuantity,
          record.deductedQuantity,
          record.remainingQuantity,
          record.orderCount,
          record.timestamp,
        ]);
      }

      // 提交事务
      await connection.commit();
      connection.release();

      return {
        success: true,
        message: `成功保存 ${deductionRecords.length} 条库存扣减记录`,
      };
    } catch (error) {
      // 回滚事务
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error("保存库存扣减记录失败:", error);
    return {
      success: false,
      message: `保存库存扣减记录失败: ${error.message}`,
    };
  }
}

// 获取库存扣减记录
async function getDeductionRecords() {
  try {
    const connection = await pool.getConnection();

    const [rows] = await connection.execute(`
      SELECT 
        id, sku, material_name, purchase_batch,
        original_quantity, deducted_quantity, remaining_quantity, order_count, timestamp
      FROM inventory_deduction_records 
      ORDER BY timestamp DESC
    `);

    connection.release();

    // 转换字段名为前端使用的格式
    const records = rows.map((row) => ({
      id: row.id,
      sku: row.sku,
      materialName: row.material_name,
      purchaseBatch: row.purchase_batch,
      originalQuantity: row.original_quantity,
      deductedQuantity: row.deducted_quantity,
      remainingQuantity: row.remaining_quantity,
      orderCount: row.order_count,
      timestamp: row.timestamp,
    }));

    return {
      success: true,
      data: records,
      message: `获取了 ${records.length} 条库存扣减记录`,
    };
  } catch (error) {
    console.error("获取库存扣减记录失败:", error);
    return {
      success: false,
      message: `获取库存扣减记录失败: ${error.message}`,
    };
  }
}

// 检查并添加商品表的warehouse字段
async function ensureWarehouseColumn() {
  let connection;
  try {
    console.log("检查商品表warehouse字段...");
    connection = await pool.getConnection();

    // 检查warehouse字段是否存在
    const [columns] = await connection.execute(
      `
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = 'products'
      AND COLUMN_NAME = 'warehouse'
    `,
      [process.env.DB_DATABASE || "testdb"]
    );

    if (columns.length === 0) {
      console.log("warehouse字段不存在，正在添加...");
      // 添加warehouse字段
      await connection.execute(`
        ALTER TABLE products
        ADD COLUMN warehouse VARCHAR(255) DEFAULT '' COMMENT '仓库'
      `);

      // 添加warehouse索引
      await connection.execute(`
        ALTER TABLE products
        ADD INDEX idx_warehouse (warehouse)
      `);

      console.log("warehouse字段添加成功");
    } else {
      console.log("warehouse字段已存在");
    }

    if (connection) {
      connection.release();
    }

    return { success: true, message: "warehouse字段检查完成" };
  } catch (error) {
    console.error("检查warehouse字段失败:", error);
    if (connection) {
      connection.release();
    }
    return {
      success: false,
      message: `检查warehouse字段失败: ${error.message}`,
    };
  }
}

// 创建商品表（如果不存在）
async function createProductTable() {
  let connection;
  try {
    console.log("开始创建商品表...");
    connection = await pool.getConnection();
    console.log("获取数据库连接成功");

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(255) PRIMARY KEY,
        sku VARCHAR(255) NOT NULL UNIQUE COMMENT '京东SKU',
        product_name VARCHAR(500) NOT NULL COMMENT '商品名称',
        brand VARCHAR(255) DEFAULT '' COMMENT '品牌',
        warehouse VARCHAR(255) DEFAULT '' COMMENT '仓库',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        INDEX idx_sku (sku),
        INDEX idx_brand (brand),
        INDEX idx_warehouse (warehouse)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品表';
    `;

    console.log("执行创建表SQL...");
    await connection.execute(createTableSQL);
    console.log("商品表创建SQL执行完成");

    // 确保warehouse字段存在
    await ensureWarehouseColumn();

    if (connection) {
      connection.release();
      console.log("数据库连接已释放");
    }

    return { success: true, message: "商品表创建成功或已存在" };
  } catch (error) {
    console.error("创建商品表失败:", error);
    if (connection) {
      connection.release();
      console.log("错误时释放数据库连接");
    }
    return { success: false, message: `创建商品表失败: ${error.message}` };
  }
}

// 推送商品数据到MySQL
async function pushProductsToMySQL(products) {
  if (!products || products.length === 0) {
    return { success: false, message: "没有商品数据需要推送" };
  }

  try {
    const connection = await pool.getConnection();

    // 开始事务
    await connection.beginTransaction();

    try {
      // 准备插入语句
      const insertSQL = `
        INSERT INTO products (
          id, sku, product_name, brand, warehouse
        ) VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          product_name = VALUES(product_name),
          brand = VALUES(brand),
          warehouse = VALUES(warehouse),
          updated_at = CURRENT_TIMESTAMP
      `;

      // 批量插入数据
      for (const product of products) {
        await connection.execute(insertSQL, [
          product.id,
          product.sku,
          product.productName,
          product.brand || "",
          product.warehouse || "",
        ]);
      }

      // 提交事务
      await connection.commit();
      connection.release();

      return {
        success: true,
        message: `成功推送 ${products.length} 条商品数据到MySQL数据库`,
      };
    } catch (error) {
      // 回滚事务
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error("推送商品数据到MySQL失败:", error);
    return {
      success: false,
      message: `推送商品数据到MySQL失败: ${error.message}`,
    };
  }
}

// 从MySQL获取商品数据
async function getProductsFromMySQL() {
  let connection;
  try {
    console.log("开始获取商品数据...");
    connection = await pool.getConnection();
    console.log("获取数据库连接成功");

    const [rows] = await connection.execute(`
      SELECT
        id, sku, product_name, brand, warehouse,
        created_at, updated_at
      FROM products
      ORDER BY sku
    `);
    console.log("查询商品数据完成，行数:", rows.length);

    if (connection) {
      connection.release();
      console.log("数据库连接已释放");
    }

    // 转换字段名为前端使用的格式
    const products = rows.map((row) => ({
      id: row.id,
      sku: row.sku,
      productName: row.product_name,
      brand: row.brand,
      warehouse: row.warehouse,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    console.log("商品数据转换完成，返回数据");
    return {
      success: true,
      data: products,
      message: `从MySQL获取了 ${products.length} 条商品数据`,
    };
  } catch (error) {
    console.error("从MySQL获取商品数据失败:", error);
    if (connection) {
      connection.release();
      console.log("错误时释放数据库连接");
    }
    return {
      success: false,
      message: `从MySQL获取商品数据失败: ${error.message}`,
    };
  }
}

// 删除商品数据
async function deleteProductFromMySQL(id) {
  if (!id) {
    return { success: false, message: "缺少商品ID" };
  }

  try {
    const connection = await pool.getConnection();

    const [result] = await connection.execute(
      "DELETE FROM products WHERE id = ?",
      [id]
    );

    connection.release();

    if (result.affectedRows > 0) {
      return {
        success: true,
        message: "成功删除商品",
      };
    } else {
      return {
        success: false,
        message: "未找到要删除的商品",
      };
    }
  } catch (error) {
    console.error("从MySQL删除商品失败:", error);
    return {
      success: false,
      message: `从MySQL删除商品失败: ${error.message}`,
    };
  }
}

// 清空MySQL中的商品数据
async function clearProductsInMySQL() {
  try {
    const connection = await pool.getConnection();

    await connection.execute("DELETE FROM products");

    connection.release();

    return {
      success: true,
      message: "已清空MySQL中的商品数据",
    };
  } catch (error) {
    console.error("清空MySQL商品数据失败:", error);
    return {
      success: false,
      message: `清空MySQL商品数据失败: ${error.message}`,
    };
  }
}

// 撤回库存扣减记录
async function rollbackDeductionRecords(timestamp) {
  if (!timestamp) {
    return { success: false, message: "缺少时间戳参数" };
  }

  try {
    const connection = await pool.getConnection();

    // 开始事务
    await connection.beginTransaction();

    try {
      // 查询该时间戳的所有扣减记录
      const [records] = await connection.execute(
        "SELECT * FROM inventory_deduction_records WHERE timestamp = ?",
        [timestamp]
      );

      if (records.length === 0) {
        await connection.rollback();
        connection.release();
        return { success: false, message: "未找到该时间戳的扣减记录" };
      }

      // 恢复库存数量
      for (const record of records) {
        await connection.execute(
          "UPDATE inventory SET quantity = quantity + ? WHERE sku = ?",
          [record.deducted_quantity, record.sku]
        );
      }

      // 删除扣减记录
      await connection.execute(
        "DELETE FROM inventory_deduction_records WHERE timestamp = ?",
        [timestamp]
      );

      // 提交事务
      await connection.commit();
      connection.release();

      return {
        success: true,
        message: `成功撤回 ${records.length} 条扣减记录，恢复库存数量`,
        recordsCount: records.length,
      };
    } catch (error) {
      // 回滚事务
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error("撤回库存扣减记录失败:", error);
    return {
      success: false,
      message: `撤回库存扣减记录失败: ${error.message}`,
    };
  }
}

// API路由处理函数
export async function POST(request) {
  const startTime = Date.now();
  let timeoutId;

  try {
    console.log("MySQL API POST请求开始");

    // 设置10秒超时（减少超时时间以便更快发现问题）
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error("API请求超时（10秒）"));
      }, 10000);
    });

    const bodyPromise = request.json();
    const { action, data } = await Promise.race([bodyPromise, timeoutPromise]);

    clearTimeout(timeoutId);
    console.log(`MySQL API请求: ${action}`, {
      data: data ? "received" : "none",
    });

    let result;

    switch (action) {
      case "testConnection":
        result = await testConnection();
        break;

      case "createTable":
        result = await createInventoryTable();
        break;

      case "createDeductionTable":
        result = await createDeductionTable();
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

      case "saveDeductionRecords":
        result = await saveDeductionRecords(data);
        break;

      case "getDeductionRecords":
        result = await getDeductionRecords();
        break;

      case "rollbackDeductionRecords":
        result = await rollbackDeductionRecords(data);
        break;

      case "createProductTable":
        result = await createProductTable();
        break;

      case "ensureWarehouseColumn":
        result = await ensureWarehouseColumn();
        break;

      case "pushProducts":
        result = await pushProductsToMySQL(data);
        break;

      case "getProducts":
        result = await getProductsFromMySQL();
        break;

      case "deleteProduct":
        result = await deleteProductFromMySQL(data);
        break;

      case "clearProducts":
        result = await clearProductsInMySQL();
        break;

      case "getInventoryBatches":
        result = await getInventoryBatches();
        break;

      case "deleteBatch":
        result = await deleteBatch(data);
        break;

      case "health":
        result = {
          success: true,
          message: "API健康检查通过",
          timestamp: new Date().toISOString(),
        };
        break;

      case "createSupplierTable":
        result = await createSupplierTable();
        break;

      case "pushSuppliers":
        result = await pushSuppliersToMySQL(data);
        break;

      case "getSuppliers":
        result = await getSuppliersFromMySQL();
        break;

      case "deleteSupplier":
        result = await deleteSupplierFromMySQL(data);
        break;

      case "clearSuppliers":
        result = await clearSuppliersInMySQL();
        break;

      default:
        result = { success: false, message: "未知的操作类型" };
    }

    const duration = Date.now() - startTime;
    console.log(`API响应: ${action}`, {
      success: result.success,
      duration: `${duration}ms`,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    const duration = Date.now() - startTime;
    console.error(`MySQL API错误: ${error.message}`, {
      duration: `${duration}ms`,
      stack: error.stack,
    });

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

// ========== 供应商管理相关函数 ==========

// 创建供应商表（如果不存在）
async function createSupplierTable() {
  try {
    const connection = await pool.getConnection();

    // 先删除旧表（如果存在）
    await connection.execute("DROP TABLE IF EXISTS suppliers");

    // 创建新表
    const createTableSQL = `
      CREATE TABLE suppliers (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL COMMENT '供应商名称',
        supplier_id VARCHAR(255) NOT NULL UNIQUE COMMENT '供应商ID',
        match_string VARCHAR(500) DEFAULT '' COMMENT '匹配字符串',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        INDEX idx_name (name),
        INDEX idx_supplier_id (supplier_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='供应商表';
    `;

    await connection.execute(createTableSQL);
    connection.release();

    return { success: true, message: "供应商表创建成功" };
  } catch (error) {
    console.error("创建供应商表失败:", error);
    return { success: false, message: `创建供应商表失败: ${error.message}` };
  }
}

// 推送供应商数据到MySQL
async function pushSuppliersToMySQL(suppliers) {
  if (!suppliers || suppliers.length === 0) {
    return { success: false, message: "没有供应商数据需要推送" };
  }

  try {
    // 先确保供应商表已创建
    await createSupplierTable();

    const connection = await pool.getConnection();

    // 开始事务
    await connection.beginTransaction();

    try {
      // 准备插入语句
      const insertSQL = `
        INSERT INTO suppliers (
          id, name, supplier_id, match_string
        ) VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          supplier_id = VALUES(supplier_id),
          match_string = VALUES(match_string),
          updated_at = CURRENT_TIMESTAMP
      `;

      // 批量插入数据
      for (const supplier of suppliers) {
        await connection.execute(insertSQL, [
          supplier.id,
          supplier.name,
          supplier.supplierId,
          supplier.matchString ?? "",
        ]);
      }

      // 提交事务
      await connection.commit();
      connection.release();

      return {
        success: true,
        message: `成功推送 ${suppliers.length} 条供应商数据到MySQL数据库`,
      };
    } catch (error) {
      // 回滚事务
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error("推送供应商数据到MySQL失败:", error);
    return {
      success: false,
      message: `推送供应商数据到MySQL失败: ${error.message}`,
    };
  }
}

// 从MySQL获取供应商数据
async function getSuppliersFromMySQL() {
  try {
    const connection = await pool.getConnection();

    const [rows] = await connection.execute(`
      SELECT
        id, name, supplier_id, match_string,
        created_at, updated_at
      FROM suppliers
      ORDER BY name
    `);

    connection.release();

    // 转换字段名为前端使用的格式
    const suppliers = rows.map((row) => ({
      id: row.id,
      name: row.name,
      supplierId: row.supplier_id,
      matchString: row.match_string,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return {
      success: true,
      data: suppliers,
      message: `从MySQL获取了 ${suppliers.length} 条供应商数据`,
    };
  } catch (error) {
    console.error("从MySQL获取供应商数据失败:", error);
    return {
      success: false,
      message: `从MySQL获取供应商数据失败: ${error.message}`,
    };
  }
}

// 删除供应商数据
async function deleteSupplierFromMySQL(id) {
  if (!id) {
    return { success: false, message: "缺少供应商ID" };
  }

  try {
    const connection = await pool.getConnection();

    const [result] = await connection.execute(
      "DELETE FROM suppliers WHERE id = ?",
      [id]
    );

    connection.release();

    if (result.affectedRows > 0) {
      return {
        success: true,
        message: "成功删除供应商",
      };
    } else {
      return {
        success: false,
        message: "未找到要删除的供应商",
      };
    }
  } catch (error) {
    console.error("从MySQL删除供应商失败:", error);
    return {
      success: false,
      message: `从MySQL删除供应商失败: ${error.message}`,
    };
  }
}

// 清空MySQL中的供应商数据
async function clearSuppliersInMySQL() {
  try {
    const connection = await pool.getConnection();

    await connection.execute("DELETE FROM suppliers");

    connection.release();

    return {
      success: true,
      message: "已清空MySQL中的供应商数据",
    };
  } catch (error) {
    console.error("清空MySQL供应商数据失败:", error);
    return {
      success: false,
      message: `清空MySQL供应商数据失败: ${error.message}`,
    };
  }
}
