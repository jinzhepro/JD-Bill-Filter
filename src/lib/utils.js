import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import Decimal from "decimal.js";

/**
 * 合并并优化 Tailwind CSS 类名
 * @param {...(string|Object|undefined|null|false)} inputs - 要合并的类名输入
 * @returns {string} 优化后的类名字符串
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * 清理金额字符串，移除货币符号和千位分隔符
 * ⚠️ 内部使用 parseFloat，仅用于近似显示
 * 金额计算请使用 cleanAmountString() + new Decimal()
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
 * 清理金额字符串，返回 Decimal 安全的字符串格式
 * 与 cleanAmount 不同，此函数不经过 parseFloat，避免精度丢失
 * @param {string|number} value - 金额值
 * @returns {string} 清理后的数字字符串，可直接传给 new Decimal()
 * @example
 * cleanAmountString("¥1,234.56") // "1234.56"
 * new Decimal(cleanAmountString("¥1,234.56")) // 精确保留原始数值
 */
export function cleanAmountString(value) {
  if (typeof value === "number") {
    return String(value);
  }
  if (typeof value === "string") {
    return value.replace(/[¥￥$,\s]/g, "") || "0";
  }
  return "0";
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
  if (strValue.startsWith("=") && strValue.includes('"')) {
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
  const formatted = Math.abs(num).toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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
 * 计算列总和（使用 Decimal.js 保证精度）
 * 内部通过 cleanAmountString 清洗数据，避免 parseFloat 精度丢失
 * @param {Array<Object>} data - 数据数组
 * @param {Array<string>} columns - 需要计算的列名数组
 * @returns {Object.<string, number>} 各列的总和
 */
export function calculateColumnTotals(
  data,
  columns = ["应结金额", "直营服务费", "交易服务费", "数量"],
) {
  return columns.reduce((totals, col) => {
    totals[col] = data
      .reduce((sum, row) => {
        const cleanStr = cleanAmountString(row[col]);
        return sum.plus(new Decimal(cleanStr));
      }, new Decimal(0))
      .toNumber();
    return totals;
  }, {});
}

export function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function calculateRowAmount(item) {
  const quantity = new Decimal(item.quantity || 0);
  const taxRate = new Decimal(item.taxRate || 0.13);
  let total;
  if (item.total !== undefined) {
    total = new Decimal(item.total);
  } else {
    const price = new Decimal(item.price || 0);
    total = price.times(quantity);
  }
  const amount = total.div(new Decimal(1).plus(taxRate));
  const tax = total.minus(amount);
  return {
    amount: amount.toFixed(2),
    tax: tax.toFixed(2),
    total: total.toFixed(2),
  };
}

export function groupItemsByMonth(items) {
  const currentMonth = getCurrentMonth();
  return items.reduce((acc, item, index) => {
    const itemMonth = item.date ? item.date.substring(0, 7) : currentMonth;
    const monthKey = itemMonth === currentMonth ? currentMonth : "其他月";
    if (!acc[monthKey]) acc[monthKey] = [];
    acc[monthKey].push({ ...item, originalIndex: index });
    return acc;
  }, {});
}

/**
 * 安全解析 JSON，失败时返回 null
 * @param {string} jsonString - JSON 字符串
 * @returns {Object|null} 解析结果或 null
 */
export function safeJsonParse(jsonString) {
  try {
    return JSON.parse(jsonString);
  } catch {
    return null;
  }
}

/**
 * 安全获取 localStorage 数据
 * @param {string} key - 存储键名
 * @returns {any} 存储的值或 null
 */
export function safeLocalStorageGet(key) {
  if (typeof window === "undefined") return null;
  try {
    const item = localStorage.getItem(key);
    return item ? safeJsonParse(item) : null;
  } catch {
    return null;
  }
}

/**
 * 安全设置 localStorage 数据
 * @param {string} key - 存储键名
 * @param {any} value - 要存储的值
 * @returns {boolean} 是否成功
 */
export function safeLocalStorageSet(key, value) {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/**
 * 静默处理错误（用于非关键操作）
 * @param {Function} fn - 要执行的函数
 * @returns {any} 函数返回值或 undefined（失败时）
 */
export function silentTry(fn) {
  try {
    return fn();
  } catch {
    return undefined;
  }
}
