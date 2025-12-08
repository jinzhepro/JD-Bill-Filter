// 验证数据结构
export function validateDataStructure(data) {
  console.log("=== 数据结构验证开始 ===");
  console.log("数据行数:", data.length);

  if (data.length === 0) {
    throw new Error("数据为空");
  }

  const firstRow = data[0];
  console.log("第一行数据:", firstRow);
  console.log("第一行的所有键名:", Object.keys(firstRow));

  // 检查键名中是否包含中文字符（编码问题）
  Object.keys(firstRow).forEach((key) => {
    console.log(
      `键名: "${key}", 长度: ${key.length}, 包含中文: /[\u4e00-\u9fa5]/.test(key)`
    );
  });

  const requiredColumns = [
    "订单编号",
    "单据类型",
    "费用项",
    "商品编号",
    "商品名称",
    "商品数量",
  ];

  console.log("期望的列名:", requiredColumns);

  for (const column of requiredColumns) {
    console.log(`检查列: "${column}"`);
    console.log(`  直接查找结果: ${column in firstRow}`);

    // 尝试模糊匹配
    const similarKeys = Object.keys(firstRow).filter((key) => {
      return (
        key.includes(column) ||
        column.includes(key) ||
        key.replace(/\s+/g, "") === column.replace(/\s+/g, "")
      );
    });

    console.log(`  相似键名: ${similarKeys.length > 0 ? similarKeys : "无"}`);

    if (!(column in firstRow)) {
      console.error(`缺少必要的列: ${column}`);
      console.error("实际存在的列名:", Object.keys(firstRow));
      throw new Error(`缺少必要的列: ${column}`);
    }
  }

  console.log("=== 数据结构验证完成 ===");
  return true;
}

// 删除费用项为"直营服务费"的行
export function removeDirectServiceFeeRows(data, addLog) {
  const originalCount = data.length;
  const filteredData = data.filter((row) => row["费用项"] !== "直营服务费");
  const removedCount = originalCount - filteredData.length;

  if (removedCount > 0) {
    addLog(`已删除 ${removedCount} 行费用项为"直营服务费"的数据`, "info");
  }

  return filteredData;
}

// 统计订单数据
export function processOrderData(data, addLog) {
  const orderRows = data.filter((row) => row["单据类型"] === "订单");
  const orderCount = orderRows.length;

  addLog(`找到 ${orderCount} 行单据类型为"订单"的数据`, "info");

  // 按商品名称分组统计
  const orderStats = {};
  orderRows.forEach((row) => {
    const productName = row["商品名称"] || "未知商品";
    const productCode = row["商品编号"] || "";
    const quantity = parseFloat(row["商品数量"]) || 0;

    if (!orderStats[productName]) {
      orderStats[productName] = {
        productName,
        productCode,
        orderQuantity: 0,
        refundQuantity: 0,
        finalQuantity: 0,
      };
    }

    orderStats[productName].orderQuantity += quantity;
    orderStats[productName].finalQuantity += quantity;
  });

  return { orderRows, orderStats, orderCount };
}

// 处理退款和售后服务单数据
export function processRefundData(data, orderStats, addLog) {
  const refundTypes = ["取消退款单", "售后服务单"];
  const refundRows = data.filter((row) =>
    refundTypes.includes(row["单据类型"])
  );
  const refundCount = refundRows.length;

  addLog(
    `找到 ${refundCount} 行单据类型为"取消退款单"或"售后服务单"的数据`,
    "info"
  );

  // 按商品名称扣减数量
  refundRows.forEach((row) => {
    const productName = row["商品名称"] || "未知商品";
    const quantity = parseFloat(row["商品数量"]) || 0;
    const documentType = row["单据类型"];

    if (orderStats[productName]) {
      orderStats[productName].refundQuantity += quantity;
      orderStats[productName].finalQuantity -= quantity;

      addLog(
        `商品"${productName}"因${documentType}扣减数量: ${quantity}`,
        "info"
      );
    } else {
      addLog(`警告: 找到退款商品"${productName}"但无对应订单数据`, "warning");
    }
  });

  return { refundRows, refundCount };
}

// 提取唯一商品用于价格输入
export function extractUniqueProducts(orderStats, defaultPricesConfig) {
  const products = [];

  Object.values(orderStats).forEach((stat) => {
    if (stat.finalQuantity > 0) {
      // 只处理最终数量大于0的商品
      // 检查是否有默认单价
      const defaultPriceInfo = defaultPricesConfig[stat.productCode];
      const defaultPrice = defaultPriceInfo?.enabled
        ? defaultPriceInfo.unitPrice
        : null;
      const hasDefault =
        defaultPriceInfo?.enabled &&
        typeof defaultPriceInfo.unitPrice === "number";

      products.push({
        productCode: stat.productCode,
        productName: stat.productName,
        unitPrice: defaultPrice,
        status: hasDefault ? "valid" : "pending",
        hasDefaultPrice: hasDefault,
        finalQuantity: stat.finalQuantity,
      });
    }
  });

  return products;
}

// 应用单价到数据并计算总价
export function applyUnitPrices(orderStats, productPrices) {
  const result = [];

  Object.values(orderStats).forEach((stat) => {
    if (stat.finalQuantity > 0) {
      // 只处理最终数量大于0的商品
      const priceInfo = productPrices[stat.productCode];
      const unitPrice = priceInfo ? priceInfo.unitPrice : 0;
      const totalPrice = unitPrice * stat.finalQuantity;

      result.push({
        商品名称: stat.productName,
        商品编号: stat.productCode,
        单价: unitPrice,
        数量: stat.finalQuantity,
        总价: totalPrice,
      });
    }
  });

  return result;
}

// 生成最终统计结果
export function generateFinalStatistics(processedData, addLog) {
  let totalOrderQuantity = 0;
  let totalRefundQuantity = 0;
  let totalFinalQuantity = 0;
  let totalAmount = 0;

  processedData.forEach((item) => {
    totalOrderQuantity += item["订单数量"] || 0;
    totalRefundQuantity += item["退款扣减数量"] || 0;
    totalFinalQuantity += item["最终数量"] || 0;
    totalAmount += item["总价"] || 0;
  });

  addLog(
    `统计完成: 总订单数量 ${totalOrderQuantity}，总退款扣减 ${totalRefundQuantity}，最终数量 ${totalFinalQuantity}，总金额 ¥${totalAmount.toFixed(
      2
    )}`,
    "success"
  );

  return {
    result: processedData,
    summary: {
      totalOrderQuantity,
      totalRefundQuantity,
      totalFinalQuantity,
      totalAmount,
      productCount: processedData.length,
    },
  };
}

// 主要的数据处理函数（第一阶段：数据处理和商品提取）
export function processDataFirstStage(data, addLog) {
  try {
    addLog("开始数据处理流程", "info");

    // 步骤1: 删除费用项为"直营服务费"的行
    addLog("步骤1: 删除费用项为'直营服务费'的行", "info");
    const filteredData = removeDirectServiceFeeRows(data, addLog);

    // 步骤2: 统计订单数据
    addLog("步骤2: 统计订单数据", "info");
    const { orderRows, orderStats, orderCount } = processOrderData(
      filteredData,
      addLog
    );

    // 步骤3: 处理退款和售后服务单数据
    addLog("步骤3: 处理退款和售后服务单数据", "info");
    const { refundRows, refundCount } = processRefundData(
      filteredData,
      orderStats,
      addLog
    );

    addLog("数据处理第一阶段完成，等待设置商品单价", "success");

    return {
      filteredData,
      orderStats,
      statistics: {
        originalCount: data.length,
        filteredCount: filteredData.length,
        orderCount,
        refundCount,
      },
    };
  } catch (error) {
    addLog(`数据处理失败: ${error.message}`, "error");
    throw error;
  }
}

// 主要的数据处理函数（第二阶段：应用单价和生成最终结果）
export function processDataSecondStage(orderStats, productPrices, addLog) {
  try {
    addLog("开始数据处理第二阶段：应用单价并生成最终结果", "info");

    // 步骤1: 应用单价到数据
    addLog("步骤1: 应用单价到数据", "info");
    const processedData = applyUnitPrices(orderStats, productPrices);

    // 步骤2: 生成最终统计结果
    addLog("步骤2: 生成最终统计结果", "info");
    const { result, summary } = generateFinalStatistics(processedData, addLog);

    addLog("数据处理流程完成", "success");

    return {
      processedData: result,
      summary,
    };
  } catch (error) {
    addLog(`数据处理失败: ${error.message}`, "error");
    throw error;
  }
}

// 生成统计信息（保持向后兼容）
export function generateStatistics(originalData, processedData) {
  if (!processedData || processedData.length === 0) {
    return {
      originalCount: originalData.length,
      processedCount: 0,
      filteredCount: originalData.length,
      originalOrders: 0,
      processedOrders: 0,
      originalTypes: {},
      processedTypes: {},
      filterRate: "100.00",
    };
  }

  const originalCount = originalData.length;
  const processedCount = processedData.length;
  const filteredCount = originalCount - processedCount;

  // 按订单编号统计
  const originalOrders = new Set(originalData.map((row) => row["订单编号"]))
    .size;
  const processedOrders = new Set(processedData.map((row) => row["商品编号"]))
    .size;

  // 按单据类型统计
  const originalTypes = {};
  originalData.forEach((row) => {
    const type = row["单据类型"];
    originalTypes[type] = (originalTypes[type] || 0) + 1;
  });

  return {
    originalCount,
    processedCount,
    filteredCount,
    originalOrders,
    processedOrders,
    originalTypes,
    processedTypes: {},
    filterRate: ((filteredCount / originalCount) * 100).toFixed(2),
  };
}

// 验证单价
export function validateUnitPrice(price) {
  if (price === "" || price === null) return false;
  const numPrice = parseFloat(price);
  return !isNaN(numPrice) && numPrice >= 0 && numPrice <= 999999.99;
}

// 获取商品的默认单价
export function getDefaultPrice(sku, defaultPricesConfig) {
  const priceInfo = defaultPricesConfig[sku];
  if (priceInfo && priceInfo.enabled && priceInfo.unitPrice) {
    return priceInfo.unitPrice;
  }
  return null;
}

// 检查商品是否有默认单价
export function hasDefaultPrice(sku, defaultPricesConfig) {
  const priceInfo = defaultPricesConfig[sku];
  return (
    priceInfo && priceInfo.enabled && typeof priceInfo.unitPrice === "number"
  );
}
