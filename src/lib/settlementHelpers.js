import Decimal from "decimal.js";

/**
 * 生成唯一ID
 * @returns {string} 唯一标识符
 */
export function generateId() {
  return Date.now() + Math.random().toString(36).substr(2, 9);
}

/**
 * 清理字符串中的金额值，返回 Decimal 对象
 * @param {string|number} value - 原始值
 * @returns {Decimal} 清理后的金额
 */
export function cleanDecimalValue(value) {
  if (value instanceof Decimal) return value;
  if (typeof value === "number") return new Decimal(value);
  if (typeof value === "string") {
    const cleaned = parseFloat(value.replace(/[^0-9.-]/g, ""));
    return new Decimal(isNaN(cleaned) ? 0 : cleaned);
  }
  return new Decimal(0);
}

/**
 * 安全地将 Decimal 转换为数字
 * @param {Decimal} decimal - Decimal 对象
 * @returns {number} 数字值
 */
export function toNumber(decimal) {
  return decimal instanceof Decimal ? decimal.toNumber() : decimal;
}

/**
 * 解析粘贴的多行数据
 * 支持格式：
 * 1. 制表符分隔：SKU\t货款\t数量\t服务费
 * 2. 空格分隔：SKU 货款 数量 服务费
 * 3. 逗号分隔：SKU,货款,数量,服务费
 * 4. 竖线分隔：SKU|货款|数量|服务费
 * @param {string} content - 粘贴的内容
 * @returns {Array} - 解析后的行数据数组
 */
export function parsePastedContent(content) {
  if (!content.trim()) {
    return [];
  }

  const lines = content.split(/\r?\n/).filter((line) => line.trim());
  const parsedRows = [];

  for (const line of lines) {
    // 尝试不同的分隔符
    let parts = line.split(/\t/); // 制表符优先
    if (parts.length === 1) {
      parts = line.split(/[,|]/); // 逗号或竖线
    }
    if (parts.length === 1) {
      parts = line.split(/\s+/); // 空格
    }

    // 清理每个部分，移除前后空格
    parts = parts.map((part) => part.trim()).filter((part) => part !== "");

    if (parts.length >= 2) {
      let sku, amount, quantity, serviceFee;

      if (parts.length === 2) {
        sku = parts[0];
        quantity = parts[1];
        amount = "";
        serviceFee = "";
      } else if (parts.length === 3) {
        sku = parts[0];
        amount = parts[1];
        quantity = parts[2];
        serviceFee = "";
      } else {
        sku = parts[0];
        amount = parts[1];
        quantity = parts[2];
        serviceFee = parts[3];
      }

      const row = {
        id: generateId(),
        sku: sku || "",
        amount: amount || "",
        quantity: quantity || "",
        serviceFee: serviceFee || "",
      };
      parsedRows.push(row);
    }
  }

  return parsedRows;
}

/**
 * 合并相同SKU的行
 * @param {Array} rows - 行数据数组
 * @returns {Array} - 合并后的行数据数组
 */
export function mergeSameSkuRows(rows) {
  const skuMap = new Map();

  rows.forEach((row) => {
    const sku = row.sku.trim();
    if (!sku) return;

    if (skuMap.has(sku)) {
      const existing = skuMap.get(sku);

      const existingQuantity = cleanDecimalValue(existing.quantity);
      const currentQuantity = cleanDecimalValue(row.quantity);
      existing.quantity = existingQuantity.plus(currentQuantity).toString();

      const existingAmount = cleanDecimalValue(existing.amount);
      const currentAmount = cleanDecimalValue(row.amount);
      existing.amount = existingAmount.plus(currentAmount).toString();

      const existingServiceFee = cleanDecimalValue(existing.serviceFee);
      const currentServiceFee = cleanDecimalValue(row.serviceFee);
      existing.serviceFee = existingServiceFee.plus(currentServiceFee).toString();
    } else {
      skuMap.set(sku, { ...row });
    }
  });

  return Array.from(skuMap.values());
}
