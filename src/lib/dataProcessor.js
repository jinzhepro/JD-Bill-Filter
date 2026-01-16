import { LogType } from "@/types";
import { REQUIRED_ORDER_COLUMNS } from "./constants";

export {
  processOrderData,
  processMultipleFilesData,
} from "./orderProcessor";

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