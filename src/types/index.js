// 数据行类型
export const DataRowType = {
  ORDER: "订单",
  REFUND: "取消退款单",
};

// 费用项类型
export const FeeItemType = {
  SERVICE_FEE: "直营服务费",
  PRODUCT_FEE: "商品费用",
  OTHER: "其他费用",
};

// 处理步骤
export const ProcessingStep = {
  UPLOAD: "upload",
  PRICE_INPUT: "price-input",
  PROCESSING: "processing",
  RESULT: "result",
};

// 商品状态
export const ProductStatus = {
  PENDING: "pending",
  VALID: "valid",
  INVALID: "invalid",
};

// 日志类型
export const LogType = {
  INFO: "info",
  SUCCESS: "success",
  ERROR: "error",
  WARNING: "warning",
};

// 默认单价配置
export const defaultPricesConfig = {
  10200796175741: {
    sku: "10200796175741",
    unitPrice: 42.5,
    productName: "",
    enabled: true,
  },
  10200814928185: {
    sku: "10200814928185",
    unitPrice: 55.5,
    productName: "",
    enabled: true,
  },
  10199074958287: {
    sku: "10199074958287",
    unitPrice: 40.5,
    productName: "",
    enabled: true,
  },
  10201815227215: {
    sku: "10201815227215",
    unitPrice: 43.5,
    productName: "",
    enabled: true,
  },
  10201814645784: {
    sku: "10201814645784",
    unitPrice: 43.5,
    productName: "",
    enabled: true,
  },
  10201817771173: {
    sku: "10201817771173",
    unitPrice: 43.5,
    productName: "",
    enabled: true,
  },
  10203301079131: {
    sku: "10203301079131",
    unitPrice: 38.3,
    productName: "",
    enabled: true,
  },
  10203301852356: {
    sku: "10203301852356",
    unitPrice: 38.3,
    productName: "",
    enabled: true,
  },
  10202009959202: {
    sku: "10202009959202",
    unitPrice: 55.0,
    productName: "",
    enabled: true,
  },
  10202010367245: {
    sku: "10202010367245",
    unitPrice: 55.0,
    productName: "",
    enabled: true,
  },
};
