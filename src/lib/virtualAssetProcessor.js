/**
 * 虚拟资产CSV处理器
 * 合并相同SKU的虚拟资产记录，汇总实际金额
 */
import Decimal from "decimal.js";
import { cleanAmountString, cleanProductCode } from "./utils";

/**
 * 虚拟资产CSV的期望列名
 */
export const VIRTUAL_ASSET_COLUMNS = [
  "订单号",
  "商品skuId",
  "虚拟资产名称",
  "实际金额",
  "账户Id",
  "商家Id",
  "完成时间",
  "区域主体ID",
];

/**
 * 验证CSV数据结构是否包含必要的列
 * @param {Array<Object>} data - CSV解析后的数据
 * @throws {Error} 如果缺少必要列
 */
export function validateVirtualAssetStructure(data) {
  if (!data || data.length === 0) {
    throw new Error("数据为空");
  }

  const headers = Object.keys(data[0]);
  const requiredColumns = ["商品skuId", "实际金额"];

  const missingColumns = requiredColumns.filter(
    (col) => !headers.includes(col)
  );

  if (missingColumns.length > 0) {
    throw new Error(
      `CSV缺少必要列: ${missingColumns.join("、")}。当前列: ${headers.join("、")}`
    );
  }
}

/**
 * 按商品skuId合并虚拟资产数据，汇总实际金额
 * @param {Array<Object>} rawData - 原始CSV数据
 * @returns {Array<Object>} 合并后的数据
 */
export function processVirtualAssetData(rawData) {
  if (!rawData || rawData.length === 0) {
    return [];
  }

  // 按商品skuId分组
  const groupedMap = new Map();

  rawData.forEach((row) => {
    const sku = cleanProductCode(row["商品skuId"]);
    if (!sku) return; // 跳过空SKU

    const amount = new Decimal(cleanAmountString(row["实际金额"]));

    if (groupedMap.has(sku)) {
      const entry = groupedMap.get(sku);
      entry.实际金额 = entry.实际金额.plus(amount);
    } else {
      groupedMap.set(sku, {
        商品skuId: sku,
        虚拟资产名称: row["虚拟资产名称"] || "",
        实际金额: amount,
        账户Id: row["账户Id"] || "",
        商家Id: row["商家Id"] || "",
        区域主体ID: row["区域主体ID"] || "",
      });
    }
  });

  // 转换为输出格式
  const result = [];
  for (const [, entry] of groupedMap) {
    result.push({
      商品skuId: entry.商品skuId,
      虚拟资产名称: entry.虚拟资产名称,
      实际金额: entry.实际金额.toFixed(2),
    });
  }

  // 按实际金额降序排列
  result.sort((a, b) => {
    const amountA = new Decimal(a.实际金额);
    const amountB = new Decimal(b.实际金额);
    return amountB.minus(amountA).toNumber();
  });

  return result;
}

/**
 * 计算虚拟资产汇总的合计
 * @param {Array<Object>} data - 合并后的数据
 * @returns {Object} 合计信息
 */
export function calculateVirtualAssetTotals(data) {
  if (!data || data.length === 0) {
    return { 实际金额: 0, SKU数: 0 };
  }

  let totalAmount = new Decimal(0);

  data.forEach((row) => {
    totalAmount = totalAmount.plus(new Decimal(cleanAmountString(row.实际金额)));
  });

  return {
    实际金额: totalAmount.toFixed(2),
    SKU数: data.length,
  };
}
