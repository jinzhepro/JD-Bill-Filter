import { REQUIRED_ORDER_COLUMNS } from "./constants";

/**
 * 对账单数据处理模块
 * 提供订单数据验证和处理功能
 */

/**
 * 验证数据结构
 */
export function validateDataStructure(data) {
  if (data.length === 0) {
    throw new Error("数据为空");
  }

  const firstRow = data[0];

  for (const column of REQUIRED_ORDER_COLUMNS) {
    if (!(column in firstRow)) {
      throw new Error(`缺少必要的列: ${column}`);
    }
  }

  return true;
}

// 导出订单处理函数
export {
  processOrderData,
  processMultipleFilesData,
} from "./orderProcessor";