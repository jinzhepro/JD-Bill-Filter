import Decimal from "decimal.js";
import { SETTLEMENT_AMOUNT_COLUMNS } from "./constants";
import { cleanAmount } from "./utils";

/**
 * 结算单数据处理器 - 合并相同SKU的应结金额
 */

/**
 * 验证结算单数据结构
 */
export function validateSettlementDataStructure(data) {
  if (!data || data.length === 0) {
    throw new Error("数据为空");
  }

  const firstRow = data[0];

  if (!("商品编号" in firstRow)) {
    throw new Error("缺少必要的列: 商品编号");
  }

  const hasAmountColumn = SETTLEMENT_AMOUNT_COLUMNS.some((col) => col in firstRow);
  if (!hasAmountColumn) {
    throw new Error(
      `缺少金额列，请确保文件包含以下任一列: ${SETTLEMENT_AMOUNT_COLUMNS.join(", ")}`
    );
  }

  return true;
}

/**
 * 处理结算单数据 - 合并相同SKU的应结金额
 */
export async function processSettlementData(data) {
  if (!data || data.length === 0) {
    throw new Error("没有结算单数据需要处理");
  }

  const firstRow = data[0];
  const actualAmountColumn = SETTLEMENT_AMOUNT_COLUMNS.find((col) => col in firstRow);

  if (!actualAmountColumn) {
    throw new Error("数据中没有找到金额列");
  }

  // 使用 Map 存储合并后的数据
  const mergedData = new Map();

  // 遍历数据，直接累加金额
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const productNo = row["商品编号"];

    if (mergedData.has(productNo)) {
      // 已存在，累加金额
      const existing = mergedData.get(productNo);
      const cleanAmountValue = cleanAmount(row[actualAmountColumn] || 0);
      existing.金额 = existing.金额.plus(new Decimal(cleanAmountValue));
    } else {
      // 新建记录
      const cleanAmountValue = cleanAmount(row[actualAmountColumn] || 0);
      mergedData.set(productNo, {
        商品编号: productNo,
        金额: new Decimal(cleanAmountValue),
      });
    }
  }

  // 转换为数组
  const result = [];

  for (const item of mergedData.values()) {
    result.push({
      商品编号: item.商品编号,
      金额: item.金额.toNumber(),
    });
  }

  return result;
}
