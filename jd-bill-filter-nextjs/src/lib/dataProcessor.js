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

// 按订单编号分组
export function groupByOrderNumber(data) {
  const grouped = {};

  for (const row of data) {
    const orderNumber = row["订单编号"];
    if (!orderNumber) {
      console.log("发现空订单编号，跳过该行");
      continue;
    }

    if (!grouped[orderNumber]) {
      grouped[orderNumber] = [];
    }
    grouped[orderNumber].push(row);
  }

  return grouped;
}

// 应用业务规则
export function applyBusinessRules(groupedData, addLog) {
  const result = [];
  let processedGroups = 0;
  let filteredGroups = 0;
  let filteredRows = 0;

  for (const [orderNumber, group] of Object.entries(groupedData)) {
    processedGroups++;

    // 获取该订单组的所有单据类型
    const documentTypes = group.map((row) => row["单据类型"]);
    const uniqueTypes = [...new Set(documentTypes)];

    // 检查是否包含取消退款单
    const hasRefund = uniqueTypes.includes("取消退款单");

    if (hasRefund) {
      // 如果包含取消退款单，过滤整个订单组
      addLog(
        `订单 ${orderNumber}: 包含取消退款单，过滤整个订单组 (${group.length} 行)`,
        "info"
      );
      filteredGroups++;
      filteredRows += group.length;
      continue;
    }

    // 检查是否全是订单
    const allOrders = uniqueTypes.length === 1 && uniqueTypes[0] === "订单";

    if (allOrders) {
      // 如果全是订单，过滤掉费用项为直营服务费的行
      const filteredGroup = group.filter(
        (row) => row["费用项"] !== "直营服务费"
      );
      const removedCount = group.length - filteredGroup.length;

      if (removedCount > 0) {
        addLog(
          `订单 ${orderNumber}: 过滤掉 ${removedCount} 行直营服务费`,
          "info"
        );
        filteredRows += removedCount;
      }

      result.push(...filteredGroup);
    } else {
      // 其他情况，保留所有行
      addLog(
        `订单 ${orderNumber}: 混合单据类型，保留所有行 (${group.length} 行)`,
        "info"
      );
      result.push(...group);
    }
  }

  addLog(
    `处理完成: 共处理 ${processedGroups} 个订单组，过滤 ${filteredGroups} 个订单组，过滤 ${filteredRows} 行数据`,
    "success"
  );

  return result;
}

// 提取唯一商品
export function extractUniqueProducts(data, defaultPricesConfig) {
  const productMap = new Map();

  data.forEach((row) => {
    const productCode = row["商品编号"];
    const productName = row["商品名称"] || "";

    if (productCode && !productMap.has(productCode)) {
      // 检查是否有默认单价
      const defaultPriceInfo = defaultPricesConfig[productCode];
      const defaultPrice = defaultPriceInfo?.enabled
        ? defaultPriceInfo.unitPrice
        : null;
      const hasDefault =
        defaultPriceInfo?.enabled &&
        typeof defaultPriceInfo.unitPrice === "number";

      productMap.set(productCode, {
        productCode,
        productName,
        unitPrice: defaultPrice,
        status: hasDefault ? "valid" : "pending",
        hasDefaultPrice: hasDefault,
      });
    }
  });

  const products = Array.from(productMap.values());
  console.log("提取唯一商品完成，应用默认单价:", products);

  // 统计应用了默认单价的商品数量
  const defaultPriceCount = products.filter((p) => p.hasDefaultPrice).length;
  if (defaultPriceCount > 0) {
    console.log(`自动应用了 ${defaultPriceCount} 个商品的默认单价`);
  }

  return products;
}

// 应用单价到数据行
export function applyUnitPrices(data, productPrices) {
  return data.map((row) => {
    const productCode = row["商品编号"];
    const productName = row["商品名称"] || "";
    const priceInfo = productPrices[productCode];
    const unitPrice = priceInfo ? priceInfo.unitPrice : null;
    const quantity = parseFloat(row["商品数量"]) || 0;

    // 计算总价
    const totalPrice = unitPrice !== null ? unitPrice * quantity : null;

    // 返回简化的数据结构：商品名、商品编码、单价、数量、总价
    // 将商品编码转换为字符串以避免Excel中的科学计数法
    return {
      商品名: productName,
      商品编码: String(productCode),
      单价: unitPrice,
      数量: quantity,
      总价: totalPrice,
    };
  });
}

// 合并相同SKU的商品，数量相加
export function mergeSameSKU(data) {
  const mergedMap = new Map();

  data.forEach((row) => {
    const productCode = row["商品编码"];
    const productName = row["商品名"];
    const unitPrice = row["单价"];
    const quantity = parseFloat(row["数量"]) || 0;

    if (mergedMap.has(productCode)) {
      // 如果已存在相同SKU，累加数量
      const existingItem = mergedMap.get(productCode);
      existingItem.quantity += quantity;
      // 重新计算总价
      existingItem.totalPrice = existingItem.unitPrice * existingItem.quantity;
    } else {
      // 如果是新SKU，添加到Map中
      mergedMap.set(productCode, {
        productCode,
        productName,
        unitPrice,
        quantity,
        totalPrice: unitPrice * quantity,
      });
    }
  });

  // 将Map转换回数组格式
  const mergedData = Array.from(mergedMap.values()).map((item) => ({
    商品名: item.productName,
    商品编码: item.productCode,
    单价: item.unitPrice,
    数量: item.quantity,
    总价: item.totalPrice,
  }));

  console.log(
    `SKU合并完成，合并前 ${data.length} 行，合并后 ${mergedData.length} 行`
  );

  return mergedData;
}

// 生成统计信息
export function generateStatistics(originalData, processedData) {
  const originalCount = originalData.length;
  const processedCount = processedData.length;
  const filteredCount = originalCount - processedCount;

  // 按订单编号统计
  const originalOrders = new Set(originalData.map((row) => row["订单编号"]))
    .size;
  const processedOrders = new Set(processedData.map((row) => row["订单编号"]))
    .size;

  // 按单据类型统计
  const originalTypes = {};
  const processedTypes = {};

  originalData.forEach((row) => {
    const type = row["单据类型"];
    originalTypes[type] = (originalTypes[type] || 0) + 1;
  });

  processedData.forEach((row) => {
    const type = row["单据类型"];
    processedTypes[type] = (processedTypes[type] || 0) + 1;
  });

  return {
    originalCount,
    processedCount,
    filteredCount,
    originalOrders,
    processedOrders,
    originalTypes,
    processedTypes,
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
