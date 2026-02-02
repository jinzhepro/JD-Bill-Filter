import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * 合并并优化 Tailwind CSS 类名
 * @param {...any} inputs - 要合并的类名输入
 * @returns {string} 优化后的类名字符串
 * @example
 * cn("text-red-500", "font-bold", { "bg-blue-500": true })
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * 清理金额字符串，移除货币符号和千位分隔符
 * 支持处理包含 ¥、￥、$、逗号和空格的金额字符串
 * @param {string|number} value - 金额值
 * @returns {number} 清理后的数字
 * @example
 * cleanAmount("¥1,234.56") // 1234.56
 * cleanAmount("$ 789.00") // 789
 */
export function cleanAmount(value) {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    return parseFloat(value.replace(/[¥￥$,\s]/g, "")) || 0;
  }
  return 0;
}

/**
 * 清理商品编号，处理 Excel 自动添加的等号前缀
 * 例如: ="123456" -> 123456
 * @param {string|number} value - 商品编号值
 * @returns {string} 清理后的商品编号
 * @example
 * cleanProductCode('="123456"') // "123456"
 * cleanProductCode(789012) // "789012"
 */
export function cleanProductCode(value) {
  if (value === null || value === undefined) {
    return "";
  }
  const strValue = String(value);
  // 处理格式: ="123456" 或 ="数字"
  if (strValue.startsWith('=') && strValue.includes('"')) {
    const match = strValue.match(/^="([^"]+)"$/);
    if (match) {
      return match[1];
    }
  }
  return strValue;
}
