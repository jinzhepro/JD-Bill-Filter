/**
 * 文件上传限制
 */
export const FILE_SIZE_LIMIT = 50 * 1024 * 1024; // 50MB

/**
 * 支持的文件类型
 */
export const VALID_FILE_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel", // .xls
  "text/csv", // .csv
  "application/csv", // .csv
];

/**
 * 支持的文件扩展名
 */
export const VALID_FILE_EXTENSIONS = [".xlsx", ".xls", ".csv"];

/**
 * 结算单相关常量
 */

/**
 * 结算单金额列名称（支持多种可能的列名）
 */
export const SETTLEMENT_AMOUNT_COLUMNS = [
  "应结金额",
  "金额",
  "合计金额",
  "总金额",
];

/**
 * 结算单数量列名称
 */
export const SETTLEMENT_QUANTITY_COLUMN = "商品数量";

/**
 * 结算单费用名称列名称
 */
export const SETTLEMENT_FEE_NAME_COLUMN = "费用名称";

/**
 * 结算单费用名称过滤条件（只处理货款记录）
 */
export const SETTLEMENT_FEE_NAME_FILTER = "货款";

/**
 * 直营服务费名称
 */
export const SETTLEMENT_SELF_OPERATION_FEE = "直营服务费";

/**
 * 数值列名称（用于Excel导出时的格式化）
 */
export const NUMERIC_COLUMNS = ["商品数量", "单价", "总价", "直营服务费"];

/**
 * 商品编码/编号列名称
 */
export const PRODUCT_CODE_COLUMNS = ["商品编码", "商品编号"];

/**
 * Excel导出时的数值格式（保留两位小数）
 */
export const EXPORT_NUMERIC_FORMAT = "0.00";

/**
 * Excel导出时的商品编号格式（文本格式，防止自动转换）
 */
export const PRODUCT_CODE_FORMAT = "@";
