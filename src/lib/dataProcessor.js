import { LogType } from "@/types";

export {
  processOrderData,
  processMultipleFilesData,
} from "./orderProcessor";

export function validateDataStructure(data) {
  if (data.length === 0) {
    throw new Error("数据为空");
  }

  const firstRow = data[0];
  const requiredColumns = [
    "订单编号",
    "单据类型",
    "费用项",
    "商品编号",
    "商品名称",
    "商品数量",
    "金额",
  ];

  for (const column of requiredColumns) {
    if (!(column in firstRow)) {
      throw new Error(`缺少必要的列: ${column}`);
    }
  }

  return true;
}