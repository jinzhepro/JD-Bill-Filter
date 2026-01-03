// 通过API调用MySQL操作

// 测试数据库连接
export async function testConnection() {
  try {
    const response = await fetch("/api/mysql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "testConnection",
      }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("测试数据库连接失败:", error);
    return { success: false, message: `测试数据库连接失败: ${error.message}` };
  }
}

// 创建库存表（如果不存在）
export async function createInventoryTable() {
  try {
    const response = await fetch("/api/mysql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "createTable",
      }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("创建库存表失败:", error);
    return { success: false, message: `创建库存表失败: ${error.message}` };
  }
}

// 推送库存数据到MySQL
export async function pushInventoryToMySQL(inventoryItems) {
  if (!inventoryItems || inventoryItems.length === 0) {
    return { success: false, message: "没有库存数据需要推送" };
  }

  try {
    const response = await fetch("/api/mysql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "pushData",
        data: inventoryItems,
      }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("推送库存数据到MySQL失败:", error);
    return {
      success: false,
      message: `推送库存数据到MySQL失败: ${error.message}`,
    };
  }
}

// 从MySQL获取库存数据
export async function getInventoryFromMySQL() {
  try {
    const response = await fetch("/api/mysql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "pullData",
      }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("从MySQL获取库存数据失败:", error);
    return {
      success: false,
      message: `从MySQL获取库存数据失败: ${error.message}`,
    };
  }
}

// 从MySQL删除单个库存项
export async function deleteInventoryFromMySQL(id) {
  console.log("deleteInventoryFromMySQL调用，ID:", id);

  if (!id) {
    console.error("缺少库存项ID");
    return { success: false, message: "缺少库存项ID" };
  }

  try {
    console.log("发送DELETE请求，ID:", id);
    console.log("请求URL:", `/api/mysql?id=${encodeURIComponent(id)}`);
    console.log("请求方法: DELETE");

    const response = await fetch(`/api/mysql?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("响应状态:", response.status, response.statusText);
    const result = await response.json();
    console.log("删除请求响应:", result);
    return result;
  } catch (error) {
    console.error("从MySQL删除库存项失败:", error);
    return {
      success: false,
      message: `从MySQL删除库存项失败: ${error.message}`,
    };
  }
}

// 清空MySQL中的库存数据
export async function clearInventoryInMySQL() {
  try {
    const response = await fetch("/api/mysql?action=clearAll", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("清空MySQL库存数据失败:", error);
    return {
      success: false,
      message: `清空MySQL库存数据失败: ${error.message}`,
    };
  }
}
