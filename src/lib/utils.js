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
 * 例如：="123456" -> 123456
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
  // 处理格式：="123456" 或="数字"
  if (strValue.startsWith('=') && strValue.includes('"')) {
    const match = strValue.match(/^="([^"]+)"$/);
    if (match) {
      return match[1];
    }
  }
  return strValue;
}

/**
 * 格式化金额显示
 * @param {number} value - 金额值
 * @param {boolean} forcePositive - 是否强制显示为正数
 * @returns {string} 格式化后的金额字符串
 * @example
 * formatAmount(1234.56) // "¥1,234.56"
 * formatAmount(-500, true) // "¥500.00"
 */
export function formatAmount(value, forcePositive = false) {
  const num = parseFloat(value || 0);
  const formatted = Math.abs(num).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  if (forcePositive || num >= 0) {
    return `¥${formatted}`;
  }
  return `-¥${formatted}`;
}

/**
 * 格式化金额显示（React 组件版本）
 * @param {number} value - 金额值
 * @param {boolean} forcePositive - 是否强制显示为正数
 * @returns {JSX.Element} 格式化后的金额元素
 * @example
 * formatAmountJSX(1234.56) // <span>¥1,234.56</span>
 */
export function formatAmountJSX(value, forcePositive = false) {
  const num = parseFloat(value || 0);
  const formatted = Math.abs(num).toFixed(2);
  if (forcePositive || num >= 0) {
    return <span className="text-primary font-medium">¥{formatted}</span>;
  }
  return <span className="text-destructive font-medium">-¥{formatted}</span>;
}

/**
 * 计算列总和
 * @param {Array} data - 数据数组
 * @param {Array} columns - 需要计算的列名数组
 * @returns {Object} 各列的总和
 */
export function calculateColumnTotals(data, columns = ["应结金额", "直营服务费", "交易服务费", "数量"]) {
  if (!data || data.length === 0) {
    return {};
  }

  const totals = {};

  columns.forEach((column) => {
    const total = data.reduce((sum, row) => {
      const value = parseFloat(row[column] || 0);
      return sum + (isNaN(value) ? 0 : value);
    }, 0);
    totals[column] = total;
  });

  return totals;
}
