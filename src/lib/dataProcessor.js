import { LogType } from "@/types";
import Decimal from "decimal.js";

// 验证数据结构
export function validateDataStructure(data) {
  if (data.length === 0) {
    throw new Error("数据为空");
  }

  const firstRow = data[0];
  const requiredColumns = [
    "订单编号",
    "单据类型",
    "费用项",
    "商品编号",
    "商品名称",
    "商品数量",
    "金额",
  ];

  for (const column of requiredColumns) {
    if (!(column in firstRow)) {
      throw new Error(`缺少必要的列: ${column}`);
    }
  }

  return true;
}

// 处理订单数据
export function processOrderData(data) {
  // 处理售后服务单数据
  const afterSalesData = data
    .filter((row) => row["单据类型"] === "售后服务单")
    .sort((a, b) => a["商品编号"] - b["商品编号"]);

  // 合并相同商品编号的售后服务单金额
  const mergedAfterSalesData = {};
  afterSalesData.forEach((row) => {
    const productNo = row["商品编号"];
    if (!mergedAfterSalesData[productNo]) {
      mergedAfterSalesData[productNo] = {
        商品编号: productNo,
        商品名称: row["商品名称"],
        单据类型: "售后服务单",
        金额: new Decimal(0),
      };
    }
    // 使用 Decimal 确保金额计算精度
    if (row["金额"] !== undefined && row["金额"] !== null) {
      mergedAfterSalesData[productNo].金额 = mergedAfterSalesData[
        productNo
      ].金额.plus(new Decimal(row["金额"]));
    }
  });

  // 将 Decimal 转换回普通数字
  Object.keys(mergedAfterSalesData).forEach((productNo) => {
    mergedAfterSalesData[productNo].金额 =
      mergedAfterSalesData[productNo].金额.toNumber();
  });

  console.log(mergedAfterSalesData);

  // 处理非销售单金额逻辑
  // 筛选出所有单据类型为"非销售单"的数据
  const nonSalesOrders = data.filter((row) => row["单据类型"] === "非销售单");

  console.log("找到非销售单数量:", nonSalesOrders.length);
  console.log("非销售单列表:", nonSalesOrders);

  // 记录已处理的非销售单，确保每个非销售单只处理一次
  const processedNonSalesOrders = new Set();

  // 对每一条非销售单进行处理
  nonSalesOrders.forEach((nonSalesRow) => {
    const rowId = `${nonSalesRow["订单编号"]}_${nonSalesRow["商品编号"]}`;

    console.log("处理非销售单:", {
      订单编号: nonSalesRow["订单编号"],
      商品编号: nonSalesRow["商品编号"],
      单据类型: nonSalesRow["单据类型"],
      金额: nonSalesRow["金额"],
    });

    // 如果这个非销售单已经处理过，跳过
    if (processedNonSalesOrders.has(rowId)) {
      console.log("该非销售单已处理过，跳过");
      return;
    }

    const nonSalesAmount = new Decimal(nonSalesRow["金额"] || 0);
    const orderNo = nonSalesRow["订单编号"];
    const nonSalesAbsAmount = nonSalesAmount.abs();

    console.log("非销售单金额信息:", {
      原始金额: nonSalesAmount.toNumber(),
      绝对值: nonSalesAbsAmount.toNumber(),
    });

    // 查询所有数据，找到第一条符合条件的就停止
    let matchCount = 0;
    for (const row of data) {
      const rowAmount = new Decimal(row["金额"] || 0);

      console.log("检查订单记录:", {
        订单编号: row["订单编号"],
        商品编号: row["商品编号"],
        单据类型: row["单据类型"],
        金额: rowAmount.toNumber(),
        是否大于绝对值: rowAmount.greaterThan(nonSalesAbsAmount),
      });

      // 如果金额大于非销售单金额的绝对值
      if (rowAmount.greaterThan(nonSalesAbsAmount)) {
        // 将非销售单的金额加到这个记录上（如果是负数就减去）
        const newAmount = rowAmount.plus(nonSalesAmount);

        // 更新金额
        row["金额"] = newAmount.toNumber();
        matchCount++;

        console.log("非销售单金额调整:", {
          非销售单订单编号: nonSalesRow["订单编号"],
          非销售单商品编号: nonSalesRow["商品编号"],
          非销售单金额: nonSalesAmount.toNumber(),
          非销售单金额绝对值: nonSalesAbsAmount.toNumber(),
          调整记录订单编号: row["订单编号"],
          调整记录商品编号: row["商品编号"],
          原始金额: rowAmount.toNumber(),
          调整后金额: newAmount.toNumber(),
        });

        // 找到第一条符合条件的记录后停止
        break;
      }
    }

    console.log("该非销售单调整了", matchCount, "条记录");

    // 标记这个非销售单已处理
    processedNonSalesOrders.add(rowId);
  });

  // 筛选单据类型为"订单"的数据
  let orderData = data
    .filter(
      (row) => row["单据类型"] === "订单" || row["单据类型"] === "取消退款单"
    )
    .sort((a, b) => a["订单编号"] - b["订单编号"]);

  // 在订单数据中根据商品编号搜索，处理售后服务单金额（可能为负数）
  // 记录已使用的售后服务单，确保每个售后单只减一次
  const usedAfterSales = new Set();

  orderData = orderData.map((orderRow) => {
    const productNo = orderRow["商品编号"];
    const afterSalesInfo = mergedAfterSalesData[productNo];

    if (afterSalesInfo && !usedAfterSales.has(productNo)) {
      // 使用 Decimal 确保精度
      const originalAmount = new Decimal(orderRow["金额"] || 0);
      const afterSalesAmount = new Decimal(afterSalesInfo["金额"] || 0);

      // 只有当金额 > 售后金额的绝对值时，才进行减法操作
      const afterSalesAbs = afterSalesAmount.abs();
      if (originalAmount.greaterThan(afterSalesAbs)) {
        // 实际操作：从订单金额中减去售后服务单金额的绝对值
        const newAmount = originalAmount.minus(afterSalesAbs);

        // 打印被减去金额的行
        console.log("被减去金额的订单行:", {
          订单编号: orderRow["订单编号"],
          商品编号: orderRow["商品编号"],
          商品名称: orderRow["商品名称"],
          原始金额: originalAmount.toNumber(),
          售后服务单金额: afterSalesAmount.toNumber(),
          售后金额绝对值: afterSalesAbs.toNumber(),
          减后金额: newAmount.toNumber(),
        });

        // 标记该商品编号的售后服务单已使用
        usedAfterSales.add(productNo);

        // 更新订单金额
        orderRow = {
          ...orderRow,
          金额: newAmount.toNumber(),
        };
      }
    }

    return orderRow;
  });

  if (orderData.length === 0) {
    throw new Error("没有找到订单类型的数据");
  }

  const mergeGroup = (orderData) => {
    const result = {};

    // 遍历所有订单数据
    orderData.forEach((row) => {
      const orderNo = row["订单编号"];

      // 如果结果中还没有这个订单编号，创建一个新数组
      if (!result[orderNo]) {
        result[orderNo] = [];
      }

      // 将当前行数据添加到对应订单编号的数组中
      result[orderNo].push(row);
    });

    return result;
  };

  const mergedData = mergeGroup(orderData);
  console.log(mergedData);

  const groupedData = {};
  const newData = [];

  // 使用mergedData作为数据源生成groupedData
  Object.keys(mergedData).forEach((orderNo) => {
    const items = mergedData[orderNo];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item["费用项"] === "合流共配回收运费") {
        items.forEach((n) => {
          if (
            n["商品名称"].includes(item["商品名称"].slice(0, 10)) &&
            n["费用项"] === "货款"
          ) {
            items[i] = {
              ...n,
              金额: item["金额"],
            };
          }
        });
      }
    }

    // console.log(items);

    items.forEach((row) => {
      const productNo = row["商品编号"];
      const key = `${orderNo}_${productNo}`;

      if (!groupedData[key]) {
        groupedData[key] = [];
      }

      groupedData[key].push(row);
    });
  });

  console.log(groupedData);

  // 处理配对的数据
  const processedData = [];

  Object.keys(groupedData).forEach((orderNo) => {
    const items = groupedData[orderNo];

    // console.log(items);

    // 只有同时有货款和直营服务费行才处理
    if (items.length) {
      // 使用 Decimal 处理精度问题，循环计算所有items的金额总和
      let totalPrice = new Decimal(0);
      items.forEach((item) => {
        // 检查item和金额是否存在
        if (item && item["金额"] !== undefined && item["金额"] !== null) {
          totalPrice = totalPrice.plus(new Decimal(item["金额"]));
        }
        // console.log(items, totalPrice.toNumber());
      });

      // 检查第一个item和商品数量是否存在
      if (
        !items[0] ||
        items[0]["商品数量"] === undefined ||
        items[0]["商品数量"] === null
      ) {
        throw new Error("商品数量数据缺失");
      }

      const unitPrice = totalPrice.div(new Decimal(items[0]["商品数量"]));
      // console.log("total", totalPrice.toNumber());
      // 创建新的合并行，保留货款行的所有原始数据并添加总价和单价
      const newRow = {
        ...items.filter((item) => item["费用项"] === "货款")[0],
        总价: totalPrice.toNumber(),
        单价: unitPrice.toNumber(),
      };
      processedData.push(newRow);
    }
  });

  // 合并processedData，相同商品编码和单价的记录合并金额和数量
  const mergedProcessedData = mergeSameSKU(processedData);

  // console.log(mergedProcessedData);
  return mergedProcessedData;
}

// 合并相同商品编码的记录
export function mergeSameSKU(processedData) {
  // 先过滤掉总价为0或未定义的记录
  const filteredData = processedData.filter(
    (item) =>
      item["总价"] !== undefined && item["总价"] !== null && item["总价"] > 0
  );

  const mergedData = filteredData.reduce((acc, current) => {
    const existingItem = acc.find(
      (item) => item["商品编号"] === current["商品编号"]
    );

    if (existingItem) {
      // 使用 Decimal 确保精度
      existingItem["金额"] = new Decimal(existingItem["金额"] || 0)
        .plus(new Decimal(current["金额"] || 0))
        .toNumber();
      existingItem["商品数量"] = new Decimal(existingItem["商品数量"] || 0)
        .plus(new Decimal(current["商品数量"] || 0))
        .toNumber();
      existingItem["总价"] = new Decimal(existingItem["总价"] || 0)
        .plus(new Decimal(current["总价"] || 0))
        .toNumber();
    } else {
      acc.push({ ...current });
    }

    return acc;
  }, []);

  // 只返回需要的字段：商品名、商品编码、单价、数量、总价
  return mergedData.map((item) => ({
    商品名称: item["商品名称"],
    商品编号: item["商品编号"],
    单价: item["单价"],
    商品数量: item["商品数量"],
    总价: item["总价"],
  }));
}

// 根据仓库SKU替换商品名并添加批次号和供应商信息
export function processWithSkuAndBatch(
  processedData,
  inventoryItems,
  suppliers = []
) {
  if (!processedData || processedData.length === 0) {
    throw new Error("没有处理后的数据");
  }

  if (!inventoryItems || inventoryItems.length === 0) {
    throw new Error("没有库存数据，请先添加库存项");
  }

  console.log(
    `开始处理 ${processedData.length} 条订单数据，匹配 ${inventoryItems.length} 条库存数据，${suppliers.length} 个供应商`
  );

  // 创建商品编号到库存项的映射
  const skuMap = {};
  inventoryItems.forEach((item) => {
    if (item.sku && item.sku.trim() !== "") {
      skuMap[item.sku.trim()] = item;
    }
  });

  // 创建供应商ID到供应商名称的映射
  const supplierMap = {};
  suppliers.forEach((supplier) => {
    if (supplier.supplierId && supplier.supplierId.trim() !== "") {
      supplierMap[supplier.supplierId.trim()] = supplier.name;
    }
  });

  // 统计信息
  let successCount = 0;
  let failedSkus = [];

  // 处理每条订单数据
  const enhancedData = processedData.map((orderItem) => {
    const productNo = orderItem["商品编号"];
    const originalProductName = orderItem["商品名称"];

    // 查找匹配的库存项（通过商品编号）
    let matchedInventoryItem = null;

    // 首先尝试通过商品编号精确匹配
    inventoryItems.forEach((item) => {
      if (item.sku && item.sku.trim() === productNo.toString().trim()) {
        matchedInventoryItem = item;
      }
    });

    // 如果没有找到，尝试通过物料名称模糊匹配
    if (!matchedInventoryItem) {
      inventoryItems.forEach((item) => {
        if (
          (item.materialName &&
            originalProductName &&
            originalProductName.includes(item.materialName)) ||
          item.materialName.includes(originalProductName)
        ) {
          matchedInventoryItem = item;
        }
      });
    }

    // 创建新的数据项
    const newItem = { ...orderItem };

    if (matchedInventoryItem) {
      // 用库存中对应的物料名称替换商品名称
      newItem["商品名称"] = matchedInventoryItem.materialName;
      // 添加税率
      newItem["税率"] = matchedInventoryItem.taxRate || "";

      successCount++;
      console.log(
        `匹配成功: 商品编号 ${productNo}, 原商品名 ${originalProductName} -> 物料名称 ${
          matchedInventoryItem.materialName
        }, 批次号 ${matchedInventoryItem.purchaseBatch}, 供应商ID ${
          newItem["供应商ID"] || "无"
        }`
      );
    } else {
      // 如果没有匹配的库存项，添加空税率
      newItem["税率"] = "";
      failedSkus.push(productNo);
      console.log(
        `未匹配: 商品编号 ${productNo}, 商品名称 ${originalProductName}`
      );
    }

    return newItem;
  });

  console.log(`SKU和税率处理完成，生成 ${enhancedData.length} 条增强数据`);

  // 返回处理后的数据和统计信息
  return {
    data: enhancedData,
    stats: {
      total: processedData.length,
      success: successCount,
      failed: failedSkus.length,
      failedSkus: failedSkus,
    },
  };
}

// 处理多个文件的数据合并
export function processMultipleFilesData(fileDataArray) {
  if (!fileDataArray || fileDataArray.length === 0) {
    throw new Error("没有文件数据需要处理");
  }

  console.log(`开始处理 ${fileDataArray.length} 个文件的数据`);

  // 合并所有文件的数据，以便跨文件处理售后服务单
  const allData = [];
  fileDataArray.forEach((fileData, index) => {
    console.log(`合并第 ${index + 1} 个文件，数据行数: ${fileData.length}`);
    allData.push(...fileData);
  });

  console.log(`所有文件数据合并完成，总数据行数: ${allData.length}`);

  // 对合并后的数据进行统一处理，包括售后服务单处理
  const processedData = processOrderData(allData);

  console.log(`数据处理完成，生成 ${processedData.length} 条记录`);

  return processedData;
}

// 扣减库存并创建记录
export async function deductInventory(enhancedData, inventoryItems) {
  if (!enhancedData || enhancedData.length === 0) {
    throw new Error("没有增强数据可以处理");
  }

  if (!inventoryItems || inventoryItems.length === 0) {
    throw new Error("没有库存数据");
  }

  console.log(`开始扣减库存，处理 ${enhancedData.length} 条订单数据`);

  // 创建商品编号到库存项的映射
  const skuMap = {};
  inventoryItems.forEach((item) => {
    if (item.sku && item.sku.trim() !== "") {
      skuMap[item.sku.trim()] = item;
    }
  });

  // 库存扣减记录
  const deductionRecords = [];
  let totalDeducted = 0;
  let deductionErrors = [];

  // 按商品编号分组，统计每个SKU的总扣减数量
  const skuDeductionMap = {};
  enhancedData.forEach((item) => {
    const productNo = item["商品编号"];
    const quantity = parseInt(item["商品数量"]) || 0;

    if (skuMap[productNo.toString().trim()]) {
      if (!skuDeductionMap[productNo]) {
        skuDeductionMap[productNo] = 0;
      }
      skuDeductionMap[productNo] += quantity;
    }
  });

  // 处理每个SKU的库存扣减
  for (const [sku, deductionQuantity] of Object.entries(skuDeductionMap)) {
    const inventoryItem = skuMap[sku];

    if (!inventoryItem) {
      deductionErrors.push(`SKU ${sku} 未找到对应的库存项`);
      continue;
    }

    const currentQuantity = parseInt(inventoryItem.quantity) || 0;

    if (currentQuantity < deductionQuantity) {
      deductionErrors.push(
        `SKU ${sku} 库存不足：当前库存 ${currentQuantity}，需要扣减 ${deductionQuantity}`
      );
      continue;
    }

    // 创建扣减记录
    const deductionRecord = {
      id: `deduction-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sku: sku,
      materialName: inventoryItem.materialName,
      purchaseBatch: inventoryItem.purchaseBatch,
      originalQuantity: currentQuantity,
      deductedQuantity: deductionQuantity,
      remainingQuantity: currentQuantity - deductionQuantity,
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      orderCount: enhancedData.filter((item) => item["商品编号"] === sku)
        .length,
    };

    deductionRecords.push(deductionRecord);
    totalDeducted += deductionQuantity;

    console.log(
      `库存扣减: SKU ${sku}, 物料名称 ${
        inventoryItem.materialName
      }, 原库存 ${currentQuantity}, 扣减 ${deductionQuantity}, 剩余 ${
        currentQuantity - deductionQuantity
      }`
    );
  }

  // 更新库存数据
  const updatedInventoryItems = inventoryItems.map((item) => {
    const sku = item.sku?.trim();
    if (skuDeductionMap[sku]) {
      const deductionQuantity = skuDeductionMap[sku];
      const currentQuantity = parseInt(item.quantity) || 0;
      const newQuantity = Math.max(0, currentQuantity - deductionQuantity);

      return {
        ...item,
        quantity: newQuantity,
        updatedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
      };
    }
    return item;
  });

  // 保存更新后的库存到数据库
  try {
    const { pushInventoryToMySQL } = await import("@/lib/mysqlConnection");
    await pushInventoryToMySQL(updatedInventoryItems);
    console.log("库存数据已更新到数据库");
  } catch (error) {
    console.error("更新库存数据到数据库失败:", error);
    deductionErrors.push(`更新数据库失败: ${error.message}`);
  }

  // 保存扣减记录到数据库
  try {
    const { saveDeductionRecords } = await import("@/lib/mysqlConnection");
    await saveDeductionRecords(deductionRecords);
    console.log("库存扣减记录已保存到数据库");
  } catch (error) {
    console.error("保存库存扣减记录失败:", error);
    deductionErrors.push(`保存扣减记录失败: ${error.message}`);
  }

  console.log(
    `库存扣减完成：共扣减 ${totalDeducted} 件商品，创建 ${deductionRecords.length} 条记录`
  );

  return {
    success: deductionErrors.length === 0,
    totalDeducted,
    deductionRecords,
    updatedInventoryItems,
    errors: deductionErrors,
  };
}

// 验证商品数据结构
export function validateProductDataStructure(data) {
  if (data.length === 0) {
    throw new Error("商品数据为空");
  }

  const firstRow = data[0];
  const requiredColumns = ["京东SKU", "商品名称"];

  for (const column of requiredColumns) {
    if (!(column in firstRow)) {
      throw new Error(`缺少必要的列: ${column}`);
    }
  }

  return true;
}

// 处理商品导入数据
export function processProductImportData(data) {
  if (!data || data.length === 0) {
    throw new Error("没有商品数据需要处理");
  }

  console.log(`开始处理 ${data.length} 条商品数据`);

  const processedProducts = data.map((row, index) => {
    // 提取必要字段
    const sku = row["京东SKU"] || row["SKU"] || row["sku"] || "";
    const productName = row["商品名称"] || row["产品名称"] || row["名称"] || "";
    const brand = row["品牌"] || row["Brand"] || "";
    const warehouse = row["仓库"] || row["Warehouse"] || "";

    // 验证必要字段
    if (!sku || sku.trim() === "") {
      throw new Error(`第 ${index + 1} 行：京东SKU不能为空`);
    }

    if (!productName || productName.trim() === "") {
      throw new Error(`第 ${index + 1} 行：商品名称不能为空`);
    }

    // 创建商品对象
    return {
      id: `product-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}-${index}`,
      sku: sku.toString().trim(),
      productName: productName.trim(),
      brand: brand ? brand.trim() : "",
      warehouse: warehouse ? warehouse.trim() : "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  console.log(`商品数据处理完成，生成 ${processedProducts.length} 条商品记录`);

  return processedProducts;
}
