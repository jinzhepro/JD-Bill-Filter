import Decimal from "decimal.js";
import { SETTLEMENT_AMOUNT_COLUMNS, SETTLEMENT_QUANTITY_COLUMN, SETTLEMENT_FEE_NAME_FILTER, SETTLEMENT_SELF_OPERATION_FEE } from "./constants";
import { cleanAmount } from "./utils";
import { logger } from "./logger";

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
 * 验证结算单数据结构
 * 检查是否包含必要的列：商品编号、金额列，可选费用名称列
 * @param {Array} data - 结算单数据
 * @returns {boolean} 验证是否通过
 * @throws {Error} 如果数据结构不符合要求
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
 * 计算售后卖家赔付费总额
 * @param {Array} data - 结算单数据
 * @param {string} actualAmountColumn - 实际金额列名
 * @param {boolean} hasFeeNameColumn - 是否有费用名称列
 * @returns {Decimal} 售后卖家赔付费总额
 */
function calculateTotalAfterSalesCompensation(data, actualAmountColumn, hasFeeNameColumn) {
  let total = new Decimal(0);

  for (const row of data) {
    if (hasFeeNameColumn && cleanString(row["费用名称"]) === "售后卖家赔付费") {
      const cleanAmountValue = cleanAmount(row[actualAmountColumn] || 0);
      total = total.plus(new Decimal(cleanAmountValue));
      logger.log(`售后卖家赔付费: ${cleanAmountValue}, 累计总额: ${total.toNumber()}`);
    }
  }

  return total;
}

/**
 * 收集直营服务费数据
 * @param {Array} data - 结算单数据
 * @param {string} actualAmountColumn - 实际金额列名
 * @param {boolean} hasFeeNameColumn - 是否有费用名称列
 * @returns {Map} 按商品编号分组的直营服务费
 */
function collectSelfOperationFees(data, actualAmountColumn, hasFeeNameColumn) {
  const selfOperationFeeMap = new Map();

  for (const row of data) {
    const productNo = cleanString(row["商品编号"]);
    const feeName = cleanString(row["费用名称"]);

    if (hasFeeNameColumn && feeName === SETTLEMENT_SELF_OPERATION_FEE && productNo) {
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
  }

  return selfOperationFeeMap;
}

/**
 * 合并相同SKU的货款数据
 * @param {Array} data - 结算单数据
 * @param {string} actualAmountColumn - 实际金额列名
 * @param {boolean} hasFeeNameColumn - 是否有费用名称列
 * @param {boolean} hasQuantityColumn - 是否有数量列
 * @returns {Object} 包含合并后数据和处理统计的对象
 */
function mergeSKUData(data, actualAmountColumn, hasFeeNameColumn, hasQuantityColumn) {
  const mergedData = new Map();
  let processedCount = 0;
  let skippedCount = 0;

  for (const row of data) {
    const productNo = cleanString(row["商品编号"]);
    const feeName = cleanString(row["费用名称"]);

    // 跳过非货款记录
    if (hasFeeNameColumn && feeName !== SETTLEMENT_FEE_NAME_FILTER &&
        feeName !== SETTLEMENT_SELF_OPERATION_FEE && feeName !== "售后卖家赔付费") {
      skippedCount++;
      continue;
    }

    // 处理货款记录
    if (!hasFeeNameColumn || feeName === SETTLEMENT_FEE_NAME_FILTER) {
      processedCount++;

      if (mergedData.has(productNo)) {
        // 已存在，累加金额和数量
        const existing = mergedData.get(productNo);
        const cleanAmountValue = cleanAmount(row[actualAmountColumn] || 0);
        existing.应结金额 = existing.应结金额.plus(new Decimal(cleanAmountValue));

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

        if (hasQuantityColumn) {
          const cleanQuantityValue = cleanAmount(row[SETTLEMENT_QUANTITY_COLUMN] || 0);
          const quantitySign = cleanAmountValue < 0 ? -1 : 1;
          initialData.数量 = new Decimal(cleanQuantityValue).times(quantitySign);
        }

        mergedData.set(productNo, initialData);
      }
    }
  }

  return { mergedData, processedCount, skippedCount };
}

/**
 * 查找可以扣除赔付费的SKU
 * @param {Map} mergedData - 合并后的SKU数据
 * @param {Decimal} totalAfterSalesCompensation - 售后赔付费总额
 * @returns {string|null} 可以扣除赔付费的商品编号
 */
function findCompensationDeductionSKU(mergedData, totalAfterSalesCompensation) {
  const compensationAbs = totalAfterSalesCompensation.abs();

  for (const item of mergedData.values()) {
    if (item.应结金额.gt(compensationAbs)) {
      logger.log(`选择商品编号 ${item.商品编号} 扣除赔付费: ${totalAfterSalesCompensation.toNumber()}`);
      return item.商品编号;
    }
  }

  return null;
}

/**
 * 应用赔付费扣除并生成最终结果
 * @param {Map} mergedData - 合并后的SKU数据
 * @param {Map} selfOperationFeeMap - 直营服务费数据
 * @param {Decimal} totalAfterSalesCompensation - 售后赔付费总额
 * @param {string} compensationDeductedFromSku - 扣除赔付费的SKU
 * @param {boolean} hasQuantityColumn - 是否有数量列
 * @returns {Array} 最终处理结果
 */
function applyCompensationDeduction(mergedData, selfOperationFeeMap, totalAfterSalesCompensation, compensationDeductedFromSku, hasQuantityColumn) {
  const result = [];

  for (const item of mergedData.values()) {
    // 跳过金额为0的记录
    if (item.应结金额.eq(new Decimal(0))) {
      logger.log("跳过金额为0的记录:", item.商品编号);
      continue;
    }

    // 计算赔付费扣除
    let compensationDeducted = new Decimal(0);
    if (compensationDeductedFromSku === item.商品编号 && !totalAfterSalesCompensation.eq(new Decimal(0))) {
      compensationDeducted = totalAfterSalesCompensation;
      logger.log(`商品编号 ${item.商品编号} 扣除赔付费: ${compensationDeducted.toNumber()}`);
    }

    // 计算最终金额
    const finalAmount = item.应结金额.plus(compensationDeducted);

    const resultItem = {
      商品编号: item.商品编号,
      应结金额: finalAmount.toNumber(),
    };

    // 添加数量列（如果存在）
    if (hasQuantityColumn) {
      resultItem.数量 = item.数量.toNumber();
    }

    // 添加直营服务费（如果有）
    if (selfOperationFeeMap.has(item.商品编号)) {
      resultItem.直营服务费 = selfOperationFeeMap.get(item.商品编号).直营服务费.toNumber();
    } else {
      resultItem.直营服务费 = 0;
    }

    // 计算净结金额
    const netAmount = finalAmount.plus(new Decimal(resultItem.直营服务费));
    resultItem.净结金额 = netAmount.toNumber();

    result.push(resultItem);
  }

  return result;
}

/**
 * 检查是否存在数量列
 * @param {Array} data - 结算单数据
 * @param {boolean} hasFeeNameColumn - 是否有费用名称列
 * @returns {boolean} 是否存在数量列
 */
function checkQuantityColumn(data, hasFeeNameColumn) {
  for (const row of data) {
    // 如果有费用名称列，只检查"货款"记录
    if (hasFeeNameColumn && cleanString(row["费用名称"]) !== SETTLEMENT_FEE_NAME_FILTER) {
      continue;
    }
    if (cleanString(row[SETTLEMENT_QUANTITY_COLUMN])) {
      return true;
    }
  }

  return false;
}

/**
 * 处理结算单数据 - 合并相同SKU的应结金额和数量
 * 只处理费用名称为"货款"的记录
 * @param {Array} data - 结算单数据
 * @returns {Array} 处理后的结算单数据
 * @throws {Error} 如果数据处理失败
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

  // 调试日志（仅在开发环境输出）
  logger.log("settlementProcessor - firstRow:", firstRow);
  logger.log("settlementProcessor - hasFeeNameColumn:", hasFeeNameColumn);
  logger.log("settlementProcessor - SETTLEMENT_FEE_NAME_FILTER:", SETTLEMENT_FEE_NAME_FILTER);
  logger.log("settlementProcessor - data.length:", data.length);
  logger.log("settlementProcessor - cleanString(费用名称):", cleanString(firstRow["费用名称"]));

  // 检查是否存在数量列
  const hasQuantityColumn = checkQuantityColumn(data, hasFeeNameColumn);
  logger.log("settlementProcessor - hasQuantityColumn:", hasQuantityColumn);

  // 计算售后卖家赔付费总额
  const totalAfterSalesCompensation = calculateTotalAfterSalesCompensation(data, actualAmountColumn, hasFeeNameColumn);

  // 收集直营服务费数据
  const selfOperationFeeMap = collectSelfOperationFees(data, actualAmountColumn, hasFeeNameColumn);

  // 合并SKU数据
  const { mergedData, processedCount, skippedCount } = mergeSKUData(data, actualAmountColumn, hasFeeNameColumn, hasQuantityColumn);

  // 调试日志
  logger.log("settlementProcessor - selfOperationFeeMap.size:", selfOperationFeeMap.size);
  logger.log("settlementProcessor - processedCount:", processedCount);
  logger.log("settlementProcessor - skippedCount:", skippedCount);

  // 查找可以扣除赔付费的SKU
  const compensationDeductedFromSku = findCompensationDeductionSKU(mergedData, totalAfterSalesCompensation);

  // 应用赔付费扣除并生成最终结果
  const result = applyCompensationDeduction(
    mergedData,
    selfOperationFeeMap,
    totalAfterSalesCompensation,
    compensationDeductedFromSku,
    hasQuantityColumn
  );

  logger.log("settlementProcessor - mergedData.size:", mergedData.size);
  logger.log("settlementProcessor - totalAfterSalesCompensation:", totalAfterSalesCompensation.toNumber());
  logger.log("settlementProcessor - result.length:", result.length);

  return result;
}
