import Decimal from "decimal.js";

/**
 * 订单处理模块
 * 负责处理订单数据、售后服务单、非销售单等订单相关逻辑
 */

/**
 * 处理售后服务单数据
 * 合并相同商品编号的售后服务单金额
 */
export function processAfterSalesData(data) {
  const afterSalesData = data
    .filter((row) => row["单据类型"] === "售后服务单")
    .sort((a, b) => a["商品编号"] - b["商品编号"]);

  const mergedAfterSalesData = {};
  afterSalesData.forEach((row) => {
    const productNo = row["商品编号"];
    if (!mergedAfterSalesData[productNo]) {
      mergedAfterSalesData[productNo] = {
        商品编号: productNo,
        商品名称: row["商品名称"],
        单据类型: "售后服务单",
        金额: new Decimal(0),
      };
    }
    if (row["金额"] !== undefined && row["金额"] !== null) {
      mergedAfterSalesData[productNo].金额 = mergedAfterSalesData[
        productNo
      ].金额.plus(new Decimal(row["金额"]));
    }
  });

  Object.keys(mergedAfterSalesData).forEach((productNo) => {
    mergedAfterSalesData[productNo].金额 =
      mergedAfterSalesData[productNo].金额.toNumber();
  });

  return mergedAfterSalesData;
}

/**
 * 处理非销售单金额逻辑
 * 将非销售单金额调整到符合条件的订单记录中
 */
export function processNonSalesOrders(data) {
  const nonSalesOrders = data.filter((row) => row["单据类型"] === "非销售单");

  const processedNonSalesOrders = new Set();

  nonSalesOrders.forEach((nonSalesRow) => {
    const rowId = `${nonSalesRow["订单编号"]}_${nonSalesRow["商品编号"]}`;

    if (processedNonSalesOrders.has(rowId)) {
      return;
    }

    const nonSalesAmount = new Decimal(nonSalesRow["金额"] || 0);
    const nonSalesAbsAmount = nonSalesAmount.abs();

    let matchCount = 0;
    for (const row of data) {
      const rowAmount = new Decimal(row["金额"] || 0);

      if (rowAmount.greaterThan(nonSalesAbsAmount)) {
        const newAmount = rowAmount.plus(nonSalesAmount);
        row["金额"] = newAmount.toNumber();
        matchCount++;
        break;
      }
    }

    processedNonSalesOrders.add(rowId);
  });
}

/**
 * 处理订单数据并扣除售后服务单金额
 */
export function processOrderWithAfterSales(orderData, mergedAfterSalesData) {
  const usedAfterSales = new Set();

  return orderData.map((orderRow) => {
    const productNo = orderRow["商品编号"];
    const afterSalesInfo = mergedAfterSalesData[productNo];

    if (afterSalesInfo && !usedAfterSales.has(productNo)) {
      const originalAmount = new Decimal(orderRow["金额"] || 0);
      const afterSalesAmount = new Decimal(afterSalesInfo["金额"] || 0);
      const afterSalesAbs = afterSalesAmount.abs();

      if (originalAmount.greaterThan(afterSalesAbs)) {
        const newAmount = originalAmount.minus(afterSalesAbs);

        usedAfterSales.add(productNo);

        return {
          ...orderRow,
          金额: newAmount.toNumber(),
        };
      }
    }

    return orderRow;
  });
}

/**
 * 合并订单数据
 * 按订单编号分组，合并货款和直营服务费
 */
export function mergeOrders(orderData) {
  const mergeGroup = (orderData) => {
    const result = {};

    orderData.forEach((row) => {
      const orderNo = row["订单编号"];

      if (!result[orderNo]) {
        result[orderNo] = [];
      }

      result[orderNo].push(row);
    });

    return result;
  };

  const mergedData = mergeGroup(orderData);

  const groupedData = {};
  const newData = [];

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

    items.forEach((row) => {
      const productNo = row["商品编号"];
      const key = `${orderNo}_${productNo}`;

      if (!groupedData[key]) {
        groupedData[key] = [];
      }

      groupedData[key].push(row);
    });
  });

  const processedData = [];

  Object.keys(groupedData).forEach((orderNo) => {
    const items = groupedData[orderNo];

    if (items.length) {
      let totalPrice = new Decimal(0);
      items.forEach((item) => {
        if (item && item["金额"] !== undefined && item["金额"] !== null) {
          totalPrice = totalPrice.plus(new Decimal(item["金额"]));
        }
      });

      if (
        !items[0] ||
        items[0]["商品数量"] === undefined ||
        items[0]["商品数量"] === null
      ) {
        throw new Error("商品数量数据缺失");
      }

      const unitPrice = totalPrice.div(new Decimal(items[0]["商品数量"]));

      const newRow = {
        ...items.filter((item) => item["费用项"] === "货款")[0],
        总价: totalPrice.toNumber(),
        单价: unitPrice.toNumber(),
      };
      processedData.push(newRow);
    }
  });

  return processedData;
}

/**
 * 合并相同商品编号的记录
 */
export function mergeSameSKU(processedData) {
  const filteredData = processedData.filter(
    (item) =>
      item["总价"] !== undefined && item["总价"] !== null && item["总价"] > 0
  );

  const mergedData = filteredData.reduce((acc, current) => {
    const existingItem = acc.find(
      (item) => item["商品编号"] === current["商品编号"]
    );

    if (existingItem) {
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

  return mergedData.map((item) => ({
    商品名称: item["商品名称"],
    商品编号: item["商品编号"],
    单价: item["单价"],
    商品数量: item["商品数量"],
    总价: item["总价"],
  }));
}

/**
 * 处理多个文件的数据合并
 */
export function processMultipleFilesData(fileDataArray, processOrderData) {
  if (!fileDataArray || fileDataArray.length === 0) {
    throw new Error("没有文件数据需要处理");
  }

  const allData = [];
  fileDataArray.forEach((fileData) => {
    allData.push(...fileData);
  });

  const processedData = processOrderData(allData);

  return processedData;
}

/**
 * 主订单处理函数
 * 处理订单数据的完整流程
 */
export function processOrderData(data) {
  const mergedAfterSalesData = processAfterSalesData(data);
  processNonSalesOrders(data);

  let orderData = data
    .filter(
      (row) => row["单据类型"] === "订单" || row["单据类型"] === "取消退款单"
    )
    .sort((a, b) => a["订单编号"] - b["订单编号"]);

  orderData = processOrderWithAfterSales(orderData, mergedAfterSalesData);

  if (orderData.length === 0) {
    throw new Error("没有找到订单类型的数据");
  }

  const processedData = mergeOrders(orderData);
  const mergedProcessedData = mergeSameSKU(processedData);

  return mergedProcessedData;
}