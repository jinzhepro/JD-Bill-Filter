// 日志类型
export const LogType = {
  INFO: "info",
  SUCCESS: "success",
  ERROR: "error",
  WARNING: "warning",
};

// 库存项类型定义
export const InventoryItemType = {
  MATERIAL: "material", // 原材料
  PRODUCT: "product", // 成品
  SEMI_FINISHED: "semi_finished", // 半成品
  CONSUMABLES: "consumables", // 耗材
};

// 库存状态类型
export const InventoryStatusType = {
  IN_STOCK: "in_stock", // 在库
  OUT_OF_STOCK: "out_of_stock", // 缺货
  LOW_STOCK: "low_stock", // 库存不足
  RESERVED: "reserved", // 已预留
};
