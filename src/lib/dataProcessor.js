import { LogType } from "@/types";
import Decimal from "decimal.js";

// 验证数据结构
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

// 处理订单数据
export function processOrderData(data) {
  // 筛选单据类型为"订单"的数据
  const orderData = data
    .filter(
      (row) => row["单据类型"] === "订单" || row["单据类型"] === "取消退款单"
    )
    .sort((a, b) => a["订单编号"] - b["订单编号"]);

  if (orderData.length === 0) {
    throw new Error("没有找到订单类型的数据");
  }

  const mergeGroup = (orderData) => {
    const result = {};

    // 遍历所有订单数据
    orderData.forEach((row) => {
      const orderNo = row["订单编号"];

      // 如果结果中还没有这个订单编号，创建一个新数组
      if (!result[orderNo]) {
        result[orderNo] = [];
      }

      // 将当前行数据添加到对应订单编号的数组中
      result[orderNo].push(row);
    });

    return result;
  };

  const mergedData = mergeGroup(orderData);
  console.log(mergedData);

  const groupedData = {};
  const newData = [];

  // 使用mergedData作为数据源生成groupedData
  Object.keys(mergedData).forEach((orderNo) => {
    const items = mergedData[orderNo];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item["费用项"] === "合流共配回收运费") {
        items.forEach((n) => {
          if (
            n["商品名称"].includes(item["商品名称"].slice(0, 10)) &&
            n["费用项"] === "货款"
          ) {
            items[i] = {
              ...n,
              金额: item["金额"],
            };
          }
        });
      }
    }

    // console.log(items);

    items.forEach((row) => {
      const productNo = row["商品编号"];
      const key = `${orderNo}_${productNo}`;

      if (!groupedData[key]) {
        groupedData[key] = [];
      }

      groupedData[key].push(row);
    });
  });

  console.log(groupedData);

  // 处理配对的数据
  const processedData = [];

  Object.keys(groupedData).forEach((orderNo) => {
    const items = groupedData[orderNo];

    // console.log(items);

    // 只有同时有货款和直营服务费行才处理
    if (items.length) {
      // 使用 Decimal 处理精度问题，循环计算所有items的金额总和
      let totalPrice = new Decimal(0);
      items.forEach((item) => {
        // 检查item和金额是否存在
        if (item && item["金额"] !== undefined && item["金额"] !== null) {
          totalPrice = totalPrice.plus(new Decimal(item["金额"]));
        }
        // console.log(items, totalPrice.toNumber());
      });

      // 检查第一个item和商品数量是否存在
      if (
        !items[0] ||
        items[0]["商品数量"] === undefined ||
        items[0]["商品数量"] === null
      ) {
        throw new Error("商品数量数据缺失");
      }

      const unitPrice = totalPrice.div(new Decimal(items[0]["商品数量"]));
      // console.log("total", totalPrice.toNumber());
      // 创建新的合并行，保留货款行的所有原始数据并添加总价和单价
      const newRow = {
        ...items.filter((item) => item["费用项"] === "货款")[0],
        总价: totalPrice.toNumber(),
        单价: unitPrice.toNumber(),
      };
      processedData.push(newRow);
    }
  });

  // 合并processedData，相同商品编码和单价的记录合并金额和数量
  const mergedProcessedData = mergeSameSKU(processedData);

  // console.log(mergedProcessedData);
  return mergedProcessedData;
}

// 合并相同商品编码和单价的记录
export function mergeSameSKU(processedData) {
  // 先过滤掉总价为0或未定义的记录
  const filteredData = processedData.filter(
    (item) =>
      item["总价"] !== undefined && item["总价"] !== null && item["总价"] > 0
  );

  const mergedData = filteredData.reduce((acc, current) => {
    const existingItem = acc.find(
      (item) =>
        item["商品编号"] === current["商品编号"] &&
        item["单价"] === current["单价"]
    );

    if (existingItem) {
      // 使用 Decimal 确保精度
      existingItem["金额"] = new Decimal(existingItem["金额"] || 0)
        .plus(new Decimal(current["金额"] || 0))
        .toNumber();
      existingItem["商品数量"] = new Decimal(existingItem["商品数量"] || 0)
        .plus(new Decimal(current["商品数量"] || 0))
        .toNumber();
      existingItem["总价"] = new Decimal(existingItem["总价"] || 0)
        .plus(new Decimal(current["总价"] || 0))
        .toNumber();
    } else {
      acc.push({ ...current });
    }

    return acc;
  }, []);

  // 只返回需要的字段：商品名、商品编码、单价、数量、总价
  return mergedData.map((item) => ({
    商品名称: item["商品名称"],
    商品编号: item["商品编号"],
    单价: item["单价"],
    商品数量: item["商品数量"],
    总价: item["总价"],
  }));
}

// 处理多个文件的数据合并
export function processMultipleFilesData(fileDataArray) {
  if (!fileDataArray || fileDataArray.length === 0) {
    throw new Error("没有文件数据需要处理");
  }

  console.log(`开始处理 ${fileDataArray.length} 个文件的数据`);

  // 处理每个文件的数据
  const allProcessedData = [];

  fileDataArray.forEach((fileData, index) => {
    try {
      console.log(`处理第 ${index + 1} 个文件，数据行数: ${fileData.length}`);
      const processedData = processOrderData(fileData);
      allProcessedData.push(...processedData);
      console.log(
        `第 ${index + 1} 个文件处理完成，生成 ${processedData.length} 条记录`
      );
    } catch (error) {
      console.error(`处理第 ${index + 1} 个文件时出错:`, error);
      throw new Error(`处理第 ${index + 1} 个文件时出错: ${error.message}`);
    }
  });

  console.log(`所有文件处理完成，总记录数: ${allProcessedData.length}`);

  // 对所有处理后的数据进行最终的SKU和单价合并
  const finalMergedData = mergeSameSKU(allProcessedData);

  console.log(`最终合并完成，生成 ${finalMergedData.length} 条记录`);

  return finalMergedData;
}
