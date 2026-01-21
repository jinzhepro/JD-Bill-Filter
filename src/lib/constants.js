export const FILE_SIZE_LIMIT = 50 * 1024 * 1024;

export const VALID_FILE_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "application/csv",
];

export const VALID_FILE_EXTENSIONS = [".xlsx", ".xls", ".csv"];

export const REQUIRED_ORDER_COLUMNS = [
  "订单编号",
  "单据类型",
  "费用项",
  "商品编号",
  "商品名称",
  "商品数量",
  "金额",
];

export const SETTLEMENT_AMOUNT_COLUMNS = [
  "应结金额",
  "金额",
  "合计金额",
  "总金额",
];

export const SETTLEMENT_QUANTITY_COLUMN = "商品数量";

export const SETTLEMENT_FEE_NAME_COLUMN = "费用名称";

export const SETTLEMENT_FEE_NAME_FILTER = "货款";

export const NUMERIC_COLUMNS = ["商品数量", "单价", "总价"];

export const PRODUCT_CODE_COLUMNS = ["商品编码", "商品编号"];

export const EXPORT_NUMERIC_FORMAT = "0.00";

export const PRODUCT_CODE_FORMAT = "@";
