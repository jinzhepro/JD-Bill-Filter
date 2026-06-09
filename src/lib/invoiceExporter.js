import ExcelJS from "exceljs";
import Decimal from "decimal.js";

export async function exportInvoice(
  basicInfo,
  customerInfo,
  lineItems,
  month,
  hideMonthLabel = false,
  invoiceType = "专票",
  remark = "",
) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("发票");

  const TOTAL_COLUMNS = 10;

  worksheet.columns = [
    { width: 6 },
    { width: 18 },
    { width: 65 },
    { width: 12 },
    { width: 10 },
    { width: 10 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
  ];

  worksheet.pageSetup = {
    orientation: "portrait",
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margin: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5 },
  };

  const rowOffset = 1;

  const titleRow = worksheet.addRow(["发票开具申请表"]);
  titleRow.height = 30;
  titleRow.getCell(1).font = { bold: true, size: 16 };
  titleRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
  worksheet.mergeCells(rowOffset, 1, rowOffset, TOTAL_COLUMNS);

  const basicStartRow = rowOffset + 1;
  worksheet.addRow([
    "",
    "公司名称",
    basicInfo.companyName,
    "",
    "合同号",
    basicInfo.contractNo,
    "",
    "申请日期",
    basicInfo.applyDate,
    "",
  ]);
  worksheet.mergeCells(basicStartRow, 3, basicStartRow, 4);
  worksheet.mergeCells(basicStartRow, 6, basicStartRow, 7);
  worksheet.mergeCells(basicStartRow, 9, basicStartRow, 10);
  worksheet.getRow(basicStartRow).getCell(2).font = { bold: true };
  worksheet.getRow(basicStartRow).getCell(5).font = { bold: true };
  worksheet.getRow(basicStartRow).getCell(8).font = { bold: true };

  const basicRow2 = basicStartRow + 1;
  worksheet.addRow([
    "",
    "申请部门",
    basicInfo.department,
    "",
    "申请人",
    basicInfo.applicant,
    "",
    "部门负责人",
    "",
    "",
  ]);
  worksheet.mergeCells(basicRow2, 3, basicRow2, 4);
  worksheet.mergeCells(basicRow2, 6, basicRow2, 7);
  worksheet.getRow(basicRow2).getCell(2).font = { bold: true };
  worksheet.getRow(basicRow2).getCell(5).font = { bold: true };
  worksheet.mergeCells(basicRow2, 9, basicRow2, 10);
  worksheet.getRow(basicRow2).getCell(8).font = { bold: true };
  worksheet.getRow(basicRow2).getCell(8).alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  const customerFields = [
    ["客户名称", customerInfo.customerName],
    [
      "发票类型",
      invoiceType === "普票"
        ? "增值税专用发票（    ）     增值税普通发票（ √ ）"
        : "增值税专用发票（ √ ）     增值税普通发票（    ）",
    ],
    ["公司全称", customerInfo.customerName],
    ["纳税人识别号", customerInfo.taxId],
    ["开户银行", customerInfo.bankName],
    ["银行账号", customerInfo.bankAccount],
    ["公司地址", customerInfo.address],
    ["联系电话", customerInfo.phone],
  ];

  customerFields.forEach(([label, value]) => {
    const row = worksheet.addRow([
      "",
      label,
      value,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ]);
    worksheet.mergeCells(row.number, 3, row.number, TOTAL_COLUMNS);
    row.getCell(2).font = { bold: true };
    row.getCell(2).alignment = { horizontal: "center" };
    row.getCell(3).alignment = { horizontal: "left" };
  });

  const lineHeaderRow = worksheet.addRow([
    "序号",
    "开票内容",
    "商品名称",
    "规格",
    "单位",
    "数量",
    "单价(含税)",
    "税率",
    "税额",
    "合计金额",
  ]);
  lineHeaderRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center" };
    cell.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
    };
  });

  const lineItemsData = lineItems.map((item) => {
    const qty = new Decimal(item.quantity || 0);
    const rate = new Decimal(item.taxRate || 0);

    let totalDecimal, priceDecimal;
    if (item.total !== undefined && qty.gt(0)) {
      totalDecimal = new Decimal(item.total);
      priceDecimal = totalDecimal.div(qty);
    } else {
      priceDecimal = new Decimal(item.price || 0);
      totalDecimal = priceDecimal.times(qty);
    }

    let amountDecimal, taxDecimal;
    if (item.amount !== undefined) {
      amountDecimal = new Decimal(item.amount);
    } else {
      amountDecimal = totalDecimal.div(new Decimal(1).plus(rate));
    }
    taxDecimal = totalDecimal.minus(amountDecimal);

    return {
      name: item.name || "",
      spec: item.spec || "",
      unit: item.unit || "",
      quantity: qty,
      price: priceDecimal,
      total: totalDecimal,
      amount: amountDecimal,
      tax: taxDecimal,
      taxRate: rate,
    };
  });

  lineItemsData.forEach((item, rowIndex) => {
    const row = worksheet.addRow([
      rowIndex + 1,
      "",
      item.name,
      item.spec,
      item.unit,
      item.quantity.toNumber(),
      item.price.toNumber(),
      item.taxRate.toNumber(),
      item.tax.toNumber(),
      item.total.toNumber(),
    ]);
    row.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      };
      if (colNumber >= 6 && colNumber <= TOTAL_COLUMNS) {
        cell.alignment = { horizontal: "right" };
      }
      if (colNumber === 6 || colNumber === 9 || colNumber === 10) {
        cell.numFmt = "0.00";
      }
      if (colNumber === 7) {
        cell.numFmt = "0.000000";
      }
      if (colNumber === 8) {
        cell.numFmt = "0%";
      }
    });
  });

  const totalQuantity = lineItemsData.reduce(
    (sum, item) => sum.plus(item.quantity),
    new Decimal(0),
  );
  const grandTotal = lineItemsData.reduce(
    (sum, item) => sum.plus(item.total),
    new Decimal(0),
  );
  const totalAmount = lineItemsData.reduce(
    (sum, item) => sum.plus(item.amount),
    new Decimal(0),
  );
  const totalTax = grandTotal.minus(totalAmount);

  const totalRow = worksheet.addRow([
    "",
    "",
    "合计",
    "",
    "",
    totalQuantity.toNumber(),
    "",
    "",
    totalTax.toNumber(),
    grandTotal.toNumber(),
  ]);
  worksheet.mergeCells(totalRow.number, 3, totalRow.number, 5);
  totalRow.eachCell((cell, colNumber) => {
    cell.font = { bold: true };
    cell.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
    };
    cell.alignment = { horizontal: "center" };
    if (colNumber === 6 || colNumber === 9 || colNumber === 10) {
      cell.numFmt = "0.00";
    }
  });

  const mergeStart = lineHeaderRow.number;
  const mergeEnd = totalRow.number;
  worksheet.mergeCells(mergeStart, 2, mergeEnd, 2);
  worksheet.getCell(mergeStart, 2).alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  const footerFields = [
    ["审核人", ""],
    ["发票代码", ""],
    ["发票号码", ""],
  ];

  footerFields.forEach(([label, value]) => {
    const row = worksheet.addRow([
      "",
      label,
      value,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ]);
    worksheet.mergeCells(row.number, 3, row.number, TOTAL_COLUMNS);
    row.getCell(2).font = { bold: true };
    row.getCell(2).alignment = { horizontal: "center" };
  });

  if (remark) {
    const remarkRow = worksheet.addRow([
      "",
      "备注",
      remark,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ]);
    worksheet.mergeCells(remarkRow.number, 3, remarkRow.number, TOTAL_COLUMNS);
    remarkRow.getCell(2).font = { bold: true };
    remarkRow.getCell(2).alignment = { horizontal: "center" };
  }

  let monthLabel;
  let fileName;

  if (month && /^\d{4}-\d{2}$/.test(month)) {
    monthLabel = "当月";
    fileName = `${month}_${customerInfo.customerName || "未命名"}.xlsx`;
  } else if (month && typeof month === "string") {
    monthLabel = month;
    fileName = `${month}_${customerInfo.customerName || "未命名"}.xlsx`;
  } else {
    monthLabel = "其他月";
    fileName = `其他月_${customerInfo.customerName || "未命名"}.xlsx`;
  }

  let lastRowNumber;

  if (!hideMonthLabel) {
    const monthRow = worksheet.addRow([
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      monthLabel,
    ]);
    monthRow.getCell(TOTAL_COLUMNS).font = { bold: true };
    monthRow.getCell(TOTAL_COLUMNS).alignment = {
      horizontal: "right",
      vertical: "middle",
    };
    lastRowNumber = monthRow.number;
  } else {
    lastRowNumber = null;
  }

  worksheet.eachRow((row) => {
    row.height = 25;
    row.eachCell((cell) => {
      if (!cell.border && row.number !== lastRowNumber) {
        cell.border = {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        };
      }
      if (row.number !== lastRowNumber) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
      }
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();

  URL.revokeObjectURL(url);
  link.remove();
}
