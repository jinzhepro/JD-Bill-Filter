# 发票导出功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 添加发票导出功能，用户可在独立页面填写发票信息并导出为带合并单元格的 Excel 文件

**Architecture:** 新建 `/invoice` 页面，包含发票表单组件；发票数据使用 Context 管理；Excel 导出使用 ExcelJS 实现合并单元格

**Tech Stack:** Next.js App Router, React, ExcelJS, shadcn/ui

---

## 文件结构

| 文件 | 负责 |
|------|------|
| `src/context/InvoiceContext.js` | 发票数据状态管理 |
| `src/lib/invoiceExporter.js` | Excel 导出逻辑（合并单元格） |
| `src/components/InvoiceForm.js` | 发票表单组件（三个卡片区域） |
| `src/components/InvoiceLineItems.js` | 开票内容明细表格组件 |
| `src/app/invoice/page.js` | 发票页面路由 |
| `src/components/Sidebar.js` | 添加发票导出菜单项 |

---

### Task 1: 创建 InvoiceContext

**Files:**
- Create: `src/context/InvoiceContext.js`

- [ ] **Step 1: 创建 InvoiceContext 状态管理**

```javascript
"use client";

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
} from "react";

const initialState = {
  basicInfo: {
    companyName: "",
    contractNo: "",
    applyDate: new Date().toISOString().split("T")[0],
    department: "",
    applicant: "",
  },
  customerInfo: {
    customerName: "",
    invoiceType: "增值税专用发票",
    companyFullName: "",
    taxId: "",
    bankName: "",
    bankAccount: "",
    address: "",
    phone: "",
  },
  lineItems: [],
};

const ActionTypes = {
  SET_BASIC_INFO: "SET_BASIC_INFO",
  SET_CUSTOMER_INFO: "SET_CUSTOMER_INFO",
  ADD_LINE_ITEM: "ADD_LINE_ITEM",
  UPDATE_LINE_ITEM: "UPDATE_LINE_ITEM",
  REMOVE_LINE_ITEM: "REMOVE_LINE_ITEM",
  RESET: "RESET",
};

function invoiceReducer(state, action) {
  switch (action.type) {
    case ActionTypes.SET_BASIC_INFO:
      return { ...state, basicInfo: { ...state.basicInfo, ...action.payload } };
    case ActionTypes.SET_CUSTOMER_INFO:
      return { ...state, customerInfo: { ...state.customerInfo, ...action.payload } };
    case ActionTypes.ADD_LINE_ITEM:
      return { ...state, lineItems: [...state.lineItems, action.payload] };
    case ActionTypes.UPDATE_LINE_ITEM:
      return {
        ...state,
        lineItems: state.lineItems.map((item, index) =>
          index === action.payload.index ? { ...item, ...action.payload.data } : item
        ),
      };
    case ActionTypes.REMOVE_LINE_ITEM:
      return {
        ...state,
        lineItems: state.lineItems.filter((_, index) => index !== action.payload),
      };
    case ActionTypes.RESET:
      return initialState;
    default:
      return state;
  }
}

const InvoiceContext = createContext();

export function InvoiceProvider({ children }) {
  const [state, dispatch] = useReducer(invoiceReducer, initialState);

  const actions = useMemo(() => ({
    setBasicInfo: (data) => dispatch({ type: ActionTypes.SET_BASIC_INFO, payload: data }),
    setCustomerInfo: (data) => dispatch({ type: ActionTypes.SET_CUSTOMER_INFO, payload: data }),
    addLineItem: (item) => dispatch({ type: ActionTypes.ADD_LINE_ITEM, payload: item }),
    updateLineItem: (index, data) => dispatch({ type: ActionTypes.UPDATE_LINE_ITEM, payload: { index, data } }),
    removeLineItem: (index) => dispatch({ type: ActionTypes.REMOVE_LINE_ITEM, payload: index }),
    reset: () => dispatch({ type: ActionTypes.RESET }),
  }), []);

  const value = useMemo(() => ({ ...state, ...actions }), [state, actions]);

  return <InvoiceContext.Provider value={value}>{children}</InvoiceContext.Provider>;
}

export function useInvoice() {
  const context = useContext(InvoiceContext);
  if (!context) {
    throw new Error("useInvoice must be used within an InvoiceProvider");
  }
  return context;
}
```

- [ ] **Step 2: 在 layout.js 中添加 InvoiceProvider**

修改 `src/app/layout.js`，在 SettlementProvider 外层或同级添加 InvoiceProvider。

---

### Task 2: 创建 invoiceExporter.js

**Files:**
- Create: `src/lib/invoiceExporter.js`

- [ ] **Step 1: 创建发票导出函数**

```javascript
import ExcelJS from "exceljs";
import Decimal from "decimal.js";

export async function exportInvoice(basicInfo, customerInfo, lineItems) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("发票");

  const TOTAL_COLUMNS = 10;

  worksheet.columns = Array.from({ length: TOTAL_COLUMNS }, () => ({ width: 15 }));

  const rowOffset = 1;

  const titleRow = worksheet.addRow(["发票开具申请表"]);
  titleRow.height = 30;
  titleRow.getCell(1).font = { bold: true, size: 16 };
  titleRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
  worksheet.mergeCells(rowOffset, 1, rowOffset, TOTAL_COLUMNS);

  const basicStartRow = rowOffset + 1;
  worksheet.addRow(["公司名称", basicInfo.companyName, "", "", "合同号", basicInfo.contractNo, "", "", "申请日期", basicInfo.applyDate]);
  worksheet.mergeCells(basicStartRow, 2, basicStartRow, 4);
  worksheet.mergeCells(basicStartRow, 6, basicStartRow, 7);
  worksheet.mergeCells(basicStartRow, 9, basicStartRow, 10);

  const basicRow2 = basicStartRow + 1;
  worksheet.addRow(["申请部门", basicInfo.department, "", "申请人", basicInfo.applicant, "", "", "部门负责人", "", ""]);
  worksheet.mergeCells(basicRow2, 2, basicRow2, 3);
  worksheet.mergeCells(basicRow2, 5, basicRow2, 7);
  worksheet.mergeCells(basicRow2, 8, basicRow2, 10);

  const customerStartRow = basicRow2 + 1;
  const customerFields = [
    ["客户名称", customerInfo.customerName],
    ["发票类型", customerInfo.invoiceType],
    ["公司全称", customerInfo.companyFullName],
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

  const lineItemsStartRow = customerStartRow + customerFields.length;

  const lineHeaderRow = worksheet.addRow(["开票内容", "商品名称", "规格", "单位", "数量", "单价(含税)", "金额(不含税)", "税率", "税额", "合计金额"]);
  lineHeaderRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } };
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

  const footerStartRow = totalRow.number + 1;
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

  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      if (!cell.border) {
        cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
      }
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `发票_${basicInfo.contractNo || "未命名"}.xlsx`;
  link.click();

  URL.revokeObjectURL(url);
  link.remove();
}
```

---

### Task 3: 创建 InvoiceLineItems 组件

**Files:**
- Create: `src/components/InvoiceLineItems.js`

- [ ] **Step 1: 创建开票内容明细表格组件**

```javascript
"use client";

import React from "react";
import { useInvoice } from "@/context/InvoiceContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import Decimal from "decimal.js";

export function InvoiceLineItems() {
  const { lineItems, addLineItem, updateLineItem, removeLineItem } = useInvoice();

  const handleAddItem = () => {
    addLineItem({
      name: "",
      spec: "",
      unit: "",
      quantity: 0,
      price: 0,
      taxRate: 0.13,
    });
  };

  const handleChange = (index, field, value) => {
    let parsedValue = value;
    if (field === "quantity" || field === "price" || field === "taxRate") {
      parsedValue = parseFloat(value) || 0;
    }
    updateLineItem(index, { [field]: parsedValue });
  };

  const calculateRow = (item) => {
    const quantity = new Decimal(item.quantity || 0);
    const price = new Decimal(item.price || 0);
    const taxRate = new Decimal(item.taxRate || 0.13);
    const amount = quantity.times(price).div(new Decimal(1).plus(taxRate));
    const tax = amount.times(taxRate);
    const total = amount.plus(tax);
    return {
      amount: amount.toFixed(2),
      tax: tax.toFixed(2),
      total: total.toFixed(2),
    };
  };

  const calculateTotals = () => {
    const totalQuantity = lineItems.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
    const totals = lineItems.reduce((sum, item) => {
      const row = calculateRow(item);
      return {
        amount: sum.amount + parseFloat(row.amount),
        tax: sum.tax + parseFloat(row.tax),
        total: sum.total + parseFloat(row.total),
      };
    }, { amount: 0, tax: 0, total: 0 });
    return {
      quantity: totalQuantity.toFixed(2),
      amount: totals.amount.toFixed(2),
      tax: totals.tax.toFixed(2),
      total: totals.total.toFixed(2),
    };
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="font-medium">开票内容明细</h3>
        <Button variant="outline" size="sm" onClick={handleAddItem}>
          <Plus className="w-4 h-4 mr-1" />
          添加行
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted">
              <th className="border border-border px-2 py-2 text-center w-8"></th>
              <th className="border border-border px-2 py-2 text-center">商品名称</th>
              <th className="border border-border px-2 py-2 text-center">规格</th>
              <th className="border border-border px-2 py-2 text-center">单位</th>
              <th className="border border-border px-2 py-2 text-center">数量</th>
              <th className="border border-border px-2 py-2 text-center">单价(含税)</th>
              <th className="border border-border px-2 py-2 text-center">金额(不含税)</th>
              <th className="border border-border px-2 py-2 text-center">税率</th>
              <th className="border border-border px-2 py-2 text-center">税额</th>
              <th className="border border-border px-2 py-2 text-center">合计金额</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item, index) => {
              const row = calculateRow(item);
              return (
                <tr key={index}>
                  <td className="border border-border px-1 py-1 text-center">
                    <Button variant="ghost" size="sm" onClick={() => removeLineItem(index)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </td>
                  <td className="border border-border px-1 py-1">
                    <Input className="h-8 border-0" value={item.name} onChange={(e) => handleChange(index, "name", e.target.value)} />
                  </td>
                  <td className="border border-border px-1 py-1">
                    <Input className="h-8 border-0" value={item.spec} onChange={(e) => handleChange(index, "spec", e.target.value)} />
                  </td>
                  <td className="border border-border px-1 py-1">
                    <Input className="h-8 border-0" value={item.unit} onChange={(e) => handleChange(index, "unit", e.target.value)} />
                  </td>
                  <td className="border border-border px-1 py-1">
                    <Input className="h-8 border-0 text-right" type="number" value={item.quantity} onChange={(e) => handleChange(index, "quantity", e.target.value)} />
                  </td>
                  <td className="border border-border px-1 py-1">
                    <Input className="h-8 border-0 text-right" type="number" value={item.price} onChange={(e) => handleChange(index, "price", e.target.value)} />
                  </td>
                  <td className="border border-border px-1 py-2 text-right">{row.amount}</td>
                  <td className="border border-border px-1 py-1">
                    <Input className="h-8 border-0 text-right" type="number" step="0.01" value={item.taxRate} onChange={(e) => handleChange(index, "taxRate", e.target.value)} />
                  </td>
                  <td className="border border-border px-1 py-2 text-right">{row.tax}</td>
                  <td className="border border-border px-1 py-2 text-right">{row.total}</td>
                </tr>
              );
            })}
            <tr className="bg-muted font-medium">
              <td className="border border-border px-2 py-2"></td>
              <td className="border border-border px-2 py-2 text-center" colSpan={3}>合计</td>
              <td className="border border-border px-2 py-2 text-right">{totals.quantity}</td>
              <td className="border border-border px-2 py-2"></td>
              <td className="border border-border px-2 py-2 text-right">{totals.amount}</td>
              <td className="border border-border px-2 py-2"></td>
              <td className="border border-border px-2 py-2 text-right">{totals.tax}</td>
              <td className="border border-border px-2 py-2 text-right">{totals.total}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

### Task 4: 创建 InvoiceForm 组件

**Files:**
- Create: `src/components/InvoiceForm.js`

- [ ] **Step 1: 创建发票表单组件**

```javascript
"use client";

import React, { useState } from "react";
import { useInvoice } from "@/context/InvoiceContext";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { InvoiceLineItems } from "./InvoiceLineItems";
import { exportInvoice } from "@/lib/invoiceExporter";
import { useToast } from "@/hooks/use-toast";
import { FileDown } from "lucide-react";

export function InvoiceForm() {
  const { basicInfo, customerInfo, lineItems, setBasicInfo, setCustomerInfo, reset } = useInvoice();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const handleBasicChange = (field, value) => {
    setBasicInfo({ [field]: value });
  };

  const handleCustomerChange = (field, value) => {
    setCustomerInfo({ [field]: value });
  };

  const handleExport = async () => {
    if (!basicInfo.companyName || !basicInfo.contractNo) {
      toast({ title: "请填写公司名称和合同号", variant: "destructive" });
      return;
    }
    if (!customerInfo.customerName || !customerInfo.companyFullName || !customerInfo.taxId) {
      toast({ title: "请填写客户名称、公司全称和纳税人识别号", variant: "destructive" });
      return;
    }
    if (lineItems.length === 0) {
      toast({ title: "请添加开票内容明细", variant: "destructive" });
      return;
    }

    setIsExporting(true);
    try {
      await exportInvoice(basicInfo, customerInfo, lineItems);
      toast({ title: "发票导出成功" });
    } catch (error) {
      toast({ title: `导出失败: ${error.message}`, variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleReset = () => {
    reset();
    toast({ title: "表单已清空" });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">公司名称 *</label>
              <Input value={basicInfo.companyName} onChange={(e) => handleBasicChange("companyName", e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">合同号 *</label>
              <Input value={basicInfo.contractNo} onChange={(e) => handleBasicChange("contractNo", e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">申请日期 *</label>
              <Input type="date" value={basicInfo.applyDate} onChange={(e) => handleBasicChange("applyDate", e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">申请部门</label>
              <Input value={basicInfo.department} onChange={(e) => handleBasicChange("department", e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">申请人</label>
              <Input value={basicInfo.applicant} onChange={(e) => handleBasicChange("applicant", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>客户信息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">客户名称 *</label>
              <Input value={customerInfo.customerName} onChange={(e) => handleCustomerChange("customerName", e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">发票类型 *</label>
              <Select value={customerInfo.invoiceType} onValueChange={(value) => handleCustomerChange("invoiceType", value)}>
                <option value="增值税专用发票">增值税专用发票</option>
                <option value="增值税普通发票">增值税普通发票</option>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">公司全称 *</label>
              <Input value={customerInfo.companyFullName} onChange={(e) => handleCustomerChange("companyFullName", e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">纳税人识别号 *</label>
              <Input value={customerInfo.taxId} onChange={(e) => handleCustomerChange("taxId", e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">开户银行</label>
              <Input value={customerInfo.bankName} onChange={(e) => handleCustomerChange("bankName", e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">银行账号</label>
              <Input value={customerInfo.bankAccount} onChange={(e) => handleCustomerChange("bankAccount", e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">公司地址</label>
              <Input value={customerInfo.address} onChange={(e) => handleCustomerChange("address", e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">联系电话</label>
              <Input value={customerInfo.phone} onChange={(e) => handleCustomerChange("phone", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>开票内容</CardTitle>
        </CardHeader>
        <CardContent>
          <InvoiceLineItems />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={handleReset}>
          清空表单
        </Button>
        <Button onClick={handleExport} disabled={isExporting}>
          <FileDown className="w-4 h-4 mr-2" />
          {isExporting ? "导出中..." : "导出发票"}
        </Button>
      </div>
    </div>
  );
}
```

---

### Task 5: 创建发票页面

**Files:**
- Create: `src/app/invoice/page.js`

- [ ] **Step 1: 创建发票页面路由**

```javascript
"use client";

import { SimpleLayout } from "@/components/SimpleLayout";
import { InvoiceForm } from "@/components/InvoiceForm";

export default function InvoicePage() {
  return (
    <SimpleLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">发票开具申请</h1>
        <p className="text-muted-foreground">填写发票信息后导出 Excel 文件</p>
        <InvoiceForm />
      </div>
    </SimpleLayout>
  );
}
```

---

### Task 6: 更新 Sidebar 添加菜单项

**Files:**
- Modify: `src/components/Sidebar.js`

- [ ] **Step 1: 添加发票导出菜单项**

修改 `src/components/Sidebar.js`，在 menuItems 数组中添加发票导出项：

```javascript
import { FileSpreadsheet, ArrowLeftRight, Receipt } from "lucide-react";

const menuItems = [
  {
    name: "结算单处理",
    href: "/",
    icon: <FileSpreadsheet className="w-5 h-5" />,
  },
  {
    name: "供应商转换",
    href: "/suppliers",
    icon: <ArrowLeftRight className="w-5 h-5" />,
  },
  {
    name: "发票导出",
    href: "/invoice",
    icon: <Receipt className="w-5 h-5" />,
  },
];
```

---

### Task 7: 更新 layout.js 添加 InvoiceProvider

**Files:**
- Modify: `src/app/layout.js`

- [ ] **Step 1: 添加 InvoiceProvider 到 layout**

```javascript
import { InvoiceProvider } from "@/context/InvoiceContext";

// 在 SettlementProvider 内部或同级添加
<InvoiceProvider>
  {children}
</InvoiceProvider>
```

---

### Task 8: 验证功能

- [ ] **Step 1: 运行开发服务器**

```bash
npm run dev
```

- [ ] **Step 2: 访问发票页面**

打开 http://localhost:3000/invoice

- [ ] **Step 3: 测试功能**

1. 填写基本信息和客户信息
2. 添加开票内容明细行
3. 点击"导出发票"
4. 检查生成的 Excel 文件是否包含正确的合并单元格

- [ ] **Step 4: 运行 lint**

```bash
npm run lint
```

---

## Self-Review

**Spec coverage:**
- 基本信息字段 ✓ Task 1, Task 4
- 客户信息字段 ✓ Task 1, Task 4
- 开票内容明细9列 ✓ Task 3
- 合并单元格规则 ✓ Task 2
- 边栏菜单项 ✓ Task 6
- 独立页面 ✓ Task 5

**Placeholder scan:** 无 TBD/TODO

**Type consistency:** InvoiceContext 字段与 InvoiceForm、invoiceExporter 使用一致