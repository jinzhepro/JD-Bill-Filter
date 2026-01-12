import Decimal from "decimal.js";

/**
 * 结算单数据处理器 - 合并相同SKU的应结金额
 * 优化版：高效处理大数据量，支持商品库匹配
 */

// 商品库缓存
let productCache = null;

/**
 * 加载商品库数据（从商品管理数据库）
 */
export async function loadProductCache() {
  if (productCache) return productCache;

  // 数据库功能已移除，返回空对象
  productCache = {};
  console.log("[结算单] 商品库功能已禁用");
  return productCache;
}

/**
 * 验证结算单数据结构
 */
export function validateSettlementDataStructure(data) {
  if (!data || data.length === 0) {
    throw new Error("数据为空");
  }

  const firstRow = data[0];
  const amountColumns = ["应结金额", "金额", "合计金额", "总金额"];

  if (!("商品编号" in firstRow)) {
    throw new Error("缺少必要的列: 商品编号");
  }

  const hasAmountColumn = amountColumns.some((col) => col in firstRow);
  if (!hasAmountColumn) {
    throw new Error(
      `缺少金额列，请确保文件包含以下任一列: ${amountColumns.join(", ")}`
    );
  }

  return true;
}

/**
 * 处理结算单数据 - 合并相同SKU的应结金额，并匹配商品名称
 */
export async function processSettlementData(data) {
  if (!data || data.length === 0) {
    throw new Error("没有结算单数据需要处理");
  }

  // 找到实际使用的金额列名
  const amountColumns = ["应结金额", "金额", "合计金额", "总金额"];
  const firstRow = data[0];
  const actualAmountColumn = amountColumns.find((col) => col in firstRow);

  if (!actualAmountColumn) {
    throw new Error("数据中没有找到金额列");
  }

  // 加载商品库
  const productMap = await loadProductCache();
  console.log(`[结算单] 商品库大小: ${Object.keys(productMap).length}`);

  // 使用 Map 存储合并后的数据
  const mergedData = new Map();

  // 遍历数据，直接累加金额
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const productNo = row["商品编号"];

    if (mergedData.has(productNo)) {
      // 已存在，累加金额
      const existing = mergedData.get(productNo);
      existing.金额 = existing.金额.plus(
        new Decimal(row[actualAmountColumn] || 0)
      );
    } else {
      // 新建记录，尝试匹配商品库名称
      const matchedName = productMap[productNo] || row["商品名称"] || "";
      mergedData.set(productNo, {
        商品编号: productNo,
        商品名称: matchedName,
        金额: new Decimal(row[actualAmountColumn] || 0),
      });
    }
  }

  // 转换为数组
  const result = [];
  let matchedCount = 0;
  let unmatchedCount = 0;

  for (const item of mergedData.values()) {
    const hasMatch = productMap[item.商品编号];
    if (hasMatch) {
      matchedCount++;
    } else {
      unmatchedCount++;
    }

    result.push({
      商品编号: item.商品编号,
      商品名称: item.商品名称,
      金额: item.金额.toNumber(),
    });
  }

  console.log(
    `[结算单] 处理完成: 匹配 ${matchedCount} 个，未匹配 ${unmatchedCount} 个`
  );
  return result;
}
