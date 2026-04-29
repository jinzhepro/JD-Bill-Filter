import ExcelJS from "exceljs";
import Decimal from "decimal.js";

/**
 * 导出发票申请表
 * @param {Object} basicInfo - 基本信息 {companyName, contractNo, applyDate, department, applicant}
 * @param {Object} customerInfo - 客户信息 {customerName, taxId, bankName, bankAccount, address, phone}
 * @param {Array<Object>} lineItems - 开票明细 [{name, spec, unit, quantity, price, taxRate}]
 * @param {string|null} month - 月份标签 (如 "2024-01" 或 null 表示其他月)
 * @returns {Promise<void>}
 */
export async function exportInvoice(basicInfo, customerInfo, lineItems, month) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("发票");

  const TOTAL_COLUMNS = 10;

  worksheet.columns = [
    { width: 18 },
    { width: 25 },
    { width: 12 },
    { width: 8 },
    { width: 10 },
    { width: 12 },
    { width: 15 },
    { width: 15 },
    { width: 12 },
    { width: 12 },
  ];

  worksheet.pageSetup = {
    orientation: 'portrait',
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
  worksheet.addRow(["公司名称", basicInfo.companyName, "", "", "合同号", basicInfo.contractNo, "", "申请日期", basicInfo.applyDate, ""]);
  worksheet.mergeCells(basicStartRow, 2, basicStartRow, 4);
  worksheet.mergeCells(basicStartRow, 6, basicStartRow, 7);
  worksheet.mergeCells(basicStartRow, 9, basicStartRow, 10);
  worksheet.getRow(basicStartRow).getCell(1).font = { bold: true };
  worksheet.getRow(basicStartRow).getCell(5).font = { bold: true };
  worksheet.getRow(basicStartRow).getCell(8).font = { bold: true };

  const basicRow2 = basicStartRow + 1;
  worksheet.addRow(["申请部门", basicInfo.department, "", "申请人", basicInfo.applicant, "", "", "部门负责人", "", ""]);
  worksheet.mergeCells(basicRow2, 2, basicRow2, 3);
  worksheet.mergeCells(basicRow2, 5, basicRow2, 7);
  worksheet.mergeCells(basicRow2, 9, basicRow2, 10);
  worksheet.getRow(basicRow2).getCell(1).font = { bold: true };
  worksheet.getRow(basicRow2).getCell(4).font = { bold: true };
  worksheet.getRow(basicRow2).getCell(8).font = { bold: true };
  worksheet.getRow(basicRow2).getCell(8).alignment = { horizontal: "center", vertical: "middle" };

  const customerFields = [
    ["客户名称", customerInfo.customerName],
    ["发票类型", "增值税专用发票（ √ ）     增值税普通发票（    ）"],
    ["公司全称", customerInfo.customerName],
    ["纳税人识别号", customerInfo.taxId],
    ["开户银行", customerInfo.bankName],
    ["银行账号", customerInfo.bankAccount],
    ["公司地址", customerInfo.address],
    ["联系电话", customerInfo.phone],
  ];

  customerFields.forEach(([label, value]) => {
    const row = worksheet.addRow([label, value, "", "", "", "", "", "", "", ""]);
    worksheet.mergeCells(row.number, 2, row.number, TOTAL_COLUMNS);
    row.getCell(1).font = { bold: true };
    row.getCell(1).alignment = { horizontal: "center" };
    row.getCell(2).alignment = { horizontal: "left" };
  });

  const lineHeaderRow = worksheet.addRow(["开票内容", "商品名称", "规格", "单位", "数量", "单价(含税)", "金额(不含税)", "税率", "税额", "合计金额"]);
  lineHeaderRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center" };
    cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
  });

  const lineItemsData = lineItems.map((item) => ({
    name: item.name || "",
    spec: item.spec || "",
    unit: item.unit || "",
    quantity: new Decimal(item.quantity || 0),
    price: new Decimal(item.price || 0),
    taxRate: new Decimal(item.taxRate || 0.13),
  }));

  lineItemsData.forEach((item) => {
    const amount = item.quantity.times(item.price).div(new Decimal(1).plus(item.taxRate));
    const tax = amount.times(item.taxRate);
    const total = amount.plus(tax);

    const row = worksheet.addRow(["", item.name, item.spec, item.unit, item.quantity.toFixed(2), item.price.toFixed(2), amount.toFixed(2), `${item.taxRate.times(100).toFixed(0)}%`, tax.toFixed(2), total.toFixed(2)]);
    row.eachCell((cell, colNumber) => {
      cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
      if (colNumber >= 5 && colNumber <= 10) {
        cell.alignment = { horizontal: "right" };
      }
    });
  });

  const totalQuantity = lineItemsData.reduce((sum, item) => sum.plus(item.quantity), new Decimal(0));
  const totalAmount = lineItemsData.reduce((sum, item) => {
    const amount = item.quantity.times(item.price).div(new Decimal(1).plus(item.taxRate));
    return sum.plus(amount);
  }, new Decimal(0));
  const totalTax = lineItemsData.reduce((sum, item) => {
    const amount = item.quantity.times(item.price).div(new Decimal(1).plus(item.taxRate));
    return sum.plus(amount.times(item.taxRate));
  }, new Decimal(0));
  const grandTotal = totalAmount.plus(totalTax);

  const totalRow = worksheet.addRow(["", "合计", "", "", totalQuantity.toFixed(2), "", totalAmount.toFixed(2), "", totalTax.toFixed(2), grandTotal.toFixed(2)]);
  worksheet.mergeCells(totalRow.number, 2, totalRow.number, 4);
  totalRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
    cell.alignment = { horizontal: "center" };
  });

  const mergeStart = lineHeaderRow.number;
  const mergeEnd = totalRow.number;
  worksheet.mergeCells(mergeStart, 1, mergeEnd, 1);
  worksheet.getCell(mergeStart, 1).alignment = { horizontal: "center", vertical: "middle" };

  const footerFields = [
    ["审核人", ""],
    ["发票代码", ""],
    ["发票号码", ""],
  ];

  footerFields.forEach(([label, value]) => {
    const row = worksheet.addRow([label, value, "", "", "", "", "", "", "", ""]);
    worksheet.mergeCells(row.number, 2, row.number, TOTAL_COLUMNS);
    row.getCell(1).font = { bold: true };
    row.getCell(1).alignment = { horizontal: "center" };
  });

  const monthLabel = month ? "当月" : "其他月";
  
  const monthRow = worksheet.addRow(["", "", "", "", "", "", "", "", "", monthLabel]);
  monthRow.getCell(TOTAL_COLUMNS).font = { bold: true };
  monthRow.getCell(TOTAL_COLUMNS).alignment = { horizontal: "right", vertical: "middle" };

  const lastRowNumber = monthRow.number;

  worksheet.eachRow((row) => {
    row.height = 25;
    row.eachCell((cell) => {
      if (!cell.border && row.number !== lastRowNumber) {
        cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
      }
      if (row.number !== lastRowNumber) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
      }
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const fileName = month ? `${month}_${customerInfo.customerName || "未命名"}.xlsx` : `其他月_${customerInfo.customerName || "未命名"}.xlsx`;
  link.download = fileName;
  link.click();

  URL.revokeObjectURL(url);
  link.remove();
}