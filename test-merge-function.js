import Decimal from "decimal.js";
import { processOrderData, mergeSameSKU } from "./src/lib/dataProcessor.js";

// 模拟测试数据
const testData = [
  {
    订单编号: "ORD001",
    单据类型: "订单",
    费用项: "货款",
    商品编号: "10200796175741",
    商品名称: "测试商品1",
    商品数量: 2,
    金额: 100.0,
    总价: 105.0,
    单价: 52.5,
  },
  {
    订单编号: "ORD002",
    单据类型: "订单",
    费用项: "货款",
    商品编号: "10200796175741",
    商品名称: "测试商品1",
    商品数量: 3,
    金额: 150.0,
    总价: 153.0,
    单价: 51.0,
  },
  {
    订单编号: "ORD003",
    单据类型: "订单",
    费用项: "货款",
    商品编号: "10200796175741",
    商品名称: "测试商品1",
    商品数量: 1,
    金额: 50.0,
    总价: 52.5,
    单价: 52.5,
  },
];

console.log("测试数据:");
console.log(testData);

// 测试合并相同商品编码但不同单价的情况
console.log("\n测试合并相同商品编码但不同单价的情况:");
const result1 = mergeSameSKU(testData);
console.log("应该保留3条记录，因为单价不同:");
console.log(result1);

// 测试合并相同商品编码和相同单价的情况
const testDataSamePrice = [
  {
    订单编号: "ORD001",
    单据类型: "订单",
    费用项: "货款",
    商品编号: "10200796175741",
    商品名称: "测试商品1",
    商品数量: 2,
    金额: 100.0,
    总价: 105.0,
    单价: 52.5,
  },
  {
    订单编号: "ORD002",
    单据类型: "订单",
    费用项: "货款",
    商品编号: "10200796175741",
    商品名称: "测试商品1",
    商品数量: 3,
    金额: 150.0,
    总价: 157.5,
    单价: 52.5,
  },
];

console.log("\n测试合并相同商品编码和相同单价的情况:");
const result2 = mergeSameSKU(testDataSamePrice);
console.log("应该合并为1条记录，数量为5，金额为250，总价为262.5:");
console.log(result2);

// 验证计算结果
if (result2.length === 1) {
  const merged = result2[0];
  console.log("\n验证合并结果:");
  console.log(`商品数量: ${merged["商品数量"]} (期望: 5)`);
  console.log(`金额: ${merged["金额"]} (期望: 250)`);
  console.log(`总价: ${merged["总价"]} (期望: 262.5)`);
  console.log(`单价: ${merged["单价"]} (期望: 52.5)`);

  const isCorrect =
    merged["商品数量"] === 5 &&
    merged["金额"] === 250 &&
    merged["总价"] === 262.5 &&
    merged["单价"] === 52.5;

  console.log(`\n测试结果: ${isCorrect ? "✅ 通过" : "❌ 失败"}`);
} else {
  console.log("\n❌ 测试失败: 应该合并为1条记录");
}

// 测试过滤总价为0的记录
const testDataWithZeroPrice = [
  {
    订单编号: "ORD001",
    单据类型: "订单",
    费用项: "货款",
    商品编号: "10200796175741",
    商品名称: "测试商品1",
    商品数量: 2,
    金额: 100.0,
    总价: 105.0,
    单价: 52.5,
  },
  {
    订单编号: "ORD002",
    单据类型: "订单",
    费用项: "货款",
    商品编号: "10200796175741",
    商品名称: "测试商品1",
    商品数量: 3,
    金额: 150.0,
    总价: 0, // 总价为0，应该被过滤掉
    单价: 52.5,
  },
  {
    订单编号: "ORD003",
    单据类型: "订单",
    费用项: "货款",
    商品编号: "10200814928185",
    商品名称: "测试商品2",
    商品数量: 1,
    金额: 50.0,
    总价: null, // 总价为null，应该被过滤掉
    单价: 50.0,
  },
];

console.log("\n测试过滤总价为0或null的记录:");
const result3 = mergeSameSKU(testDataWithZeroPrice);
console.log("应该只保留1条记录（总价为105的记录）:");
console.log(result3);

if (result3.length === 1 && result3[0]["总价"] === 105.0) {
  console.log("✅ 过滤测试通过");
} else {
  console.log("❌ 过滤测试失败");
}

// 测试最终输出字段
console.log("\n测试最终输出字段:");
console.log("result2 的字段:", Object.keys(result2[0] || {}));
console.log("result3 的字段:", Object.keys(result3[0] || {}));

// 验证字段是否只包含：商品名称、商品编号、单价、商品数量、总价
const expectedFields = ["商品名称", "商品编号", "单价", "商品数量", "总价"];
const result2Fields = Object.keys(result2[0] || {});
const result3Fields = Object.keys(result3[0] || {});

const result2FieldsCorrect =
  expectedFields.every((field) => result2Fields.includes(field)) &&
  result2Fields.length === expectedFields.length;
const result3FieldsCorrect =
  expectedFields.every((field) => result3Fields.includes(field)) &&
  result3Fields.length === expectedFields.length;

console.log(
  `result2 字段测试: ${result2FieldsCorrect ? "✅ 通过" : "❌ 失败"}`
);
console.log(
  `result3 字段测试: ${result3FieldsCorrect ? "✅ 通过" : "❌ 失败"}`
);
