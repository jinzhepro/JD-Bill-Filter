import Decimal from "decimal.js";
import { SETTLEMENT_AMOUNT_COLUMNS, SETTLEMENT_QUANTITY_COLUMN, SETTLEMENT_FEE_NAME_FILTER, SETTLEMENT_SELF_OPERATION_FEE } from "./constants";
import { cleanAmount } from "./utils";

/**
 * 清理字符串中的Tab和换行字符
 */
function cleanString(value) {
  if (typeof value === "string") {
    return value.replace(/[\t\n\r]/g, "").trim();
  }
  return value;
}

/**
 * 结算单数据处理器 - 合并相同SKU的应结金额和数量
 * 只处理费用名称为"货款"的记录
 */

/**
 * 验证结算单数据结构
 * 检查是否包含必要的列：商品编号、金额列，可选费用名称列
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
 * 处理结算单数据 - 合并相同SKU的应结金额和数量
 * 只处理费用名称为"货款"的记录
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

  // 检查是否存在费用名称列
  const hasFeeNameColumn = "费用名称" in firstRow;

  // 调试日志
  console.log("settlementProcessor - firstRow:", firstRow);
  console.log("settlementProcessor - hasFeeNameColumn:", hasFeeNameColumn);
  console.log("settlementProcessor - SETTLEMENT_FEE_NAME_FILTER:", SETTLEMENT_FEE_NAME_FILTER);
  console.log("settlementProcessor - data.length:", data.length);
  console.log("settlementProcessor - cleanString(费用名称):", cleanString(firstRow["费用名称"]));

  // 检查是否存在数量列（在货款记录中查找）
  let hasQuantityColumn = false;
  for (const row of data) {
    // 如果有费用名称列，只检查"货款"记录
    if (hasFeeNameColumn && cleanString(row["费用名称"]) !== SETTLEMENT_FEE_NAME_FILTER) {
      continue;
    }
    if (cleanString(row[SETTLEMENT_QUANTITY_COLUMN])) {
      hasQuantityColumn = true;
      break;
    }
  }

  // 调试日志
  console.log("settlementProcessor - hasQuantityColumn:", hasQuantityColumn);

  // 使用 Map 存储合并后的数据
  const mergedData = new Map();

  // 使用 Map 存储按商品编号分组的直营服务费
  const selfOperationFeeMap = new Map();

  // 遍历数据，只处理费用名称为"货款"的记录，合并金额和数量
  let processedCount = 0;
  let skippedCount = 0;
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const productNo = cleanString(row["商品编号"]);
    const feeName = cleanString(row["费用名称"]);

    // 如果存在费用名称列，只处理"货款"记录
    if (hasFeeNameColumn && feeName !== SETTLEMENT_FEE_NAME_FILTER) {
      // 处理直营服务费记录（按商品编号分组）
      if (feeName === SETTLEMENT_SELF_OPERATION_FEE && productNo) {
        const cleanAmountValue = cleanAmount(row[actualAmountColumn] || 0);
        if (selfOperationFeeMap.has(productNo)) {
          const existing = selfOperationFeeMap.get(productNo);
          existing.直营服务费 = existing.直营服务费.plus(new Decimal(cleanAmountValue));
        } else {
          selfOperationFeeMap.set(productNo, {
            商品编号: productNo,
            直营服务费: new Decimal(cleanAmountValue),
          });
        }
      }
      skippedCount++;
      continue;
    }

    processedCount++;

    if (mergedData.has(productNo)) {
      // 已存在，累加金额和数量
      const existing = mergedData.get(productNo);
      const cleanAmountValue = cleanAmount(row[actualAmountColumn] || 0);
      existing.应结金额 = existing.应结金额.plus(new Decimal(cleanAmountValue));

      // 如果存在数量列，累加数量（负数金额对应负数数量）
      if (hasQuantityColumn) {
        const cleanQuantityValue = cleanAmount(row[SETTLEMENT_QUANTITY_COLUMN] || 0);
        const quantitySign = cleanAmountValue < 0 ? -1 : 1;
        existing.数量 = existing.数量.plus(new Decimal(cleanQuantityValue).times(quantitySign));
      }
    } else {
      // 新建记录
      const cleanAmountValue = cleanAmount(row[actualAmountColumn] || 0);
      const initialData = {
        商品编号: productNo,
        应结金额: new Decimal(cleanAmountValue),
      };

      // 如果存在数量列，添加数量字段（负数金额对应负数数量）
      if (hasQuantityColumn) {
        const cleanQuantityValue = cleanAmount(row[SETTLEMENT_QUANTITY_COLUMN] || 0);
        const quantitySign = cleanAmountValue < 0 ? -1 : 1;
        initialData.数量 = new Decimal(cleanQuantityValue).times(quantitySign);
      }

      mergedData.set(productNo, initialData);
    }
  }

  // 调试日志
  console.log("settlementProcessor - selfOperationFeeMap.size:", selfOperationFeeMap.size);
  console.log("settlementProcessor - processedCount:", processedCount);
  console.log("settlementProcessor - skippedCount:", skippedCount);

  // 转换为数组，并过滤掉金额为0的记录
  const result = [];

  console.log("settlementProcessor - mergedData.size:", mergedData.size);

  for (const item of mergedData.values()) {
    // 跳过金额为0的记录
    if (item.应结金额.eq(new Decimal(0))) {
      console.log("settlementProcessor - 跳过金额为0的记录:", item.商品编号);
      continue;
    }

    const resultItem = {
      商品编号: item.商品编号,
      应结金额: item.应结金额.toNumber(),
    };

    // 如果存在数量列，添加到结果中
    if (hasQuantityColumn) {
      resultItem.数量 = item.数量.toNumber();
    }

    // 添加直营服务费（如果有对应的记录）
    if (selfOperationFeeMap.has(item.商品编号)) {
      resultItem.直营服务费 = selfOperationFeeMap.get(item.商品编号).直营服务费.toNumber();
    } else {
      resultItem.直营服务费 = 0;
    }

    // 计算净结金额（应结金额 + 直营服务费，直营服务费为负数）
    const netAmount = item.应结金额.plus(new Decimal(resultItem.直营服务费));
    resultItem.净结金额 = netAmount.toNumber();

    result.push(resultItem);
  }

  // 调试日志
  console.log("settlementProcessor - result.length:", result.length);
  return result;
}
