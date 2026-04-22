# 发票导出混合月份分离导出 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 支持按月份分离导出发票，混合数据自动生成多个表格文件

**Architecture:** 每个 lineItem 添加 date 字段，导出时按月份分组，循环调用 exporter 生成多个文件，分别记录历史

**Tech Stack:** React, ExcelJS, D1 Database

---

## 文件改动清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/context/InvoiceContext.js` | 修改 | lineItem 默认增加 date 字段 |
| `src/components/InvoiceImportModal.js` | 修改 | 解析日期并传递给 lineItem |
| `src/components/InvoiceForm.js` | 修改 | handleExport 按月份分组导出 |
| `src/lib/invoiceExporter.js` | 修改 | 接收 month 参数调整文件名 |

---

### Task 1: InvoiceContext 添加 date 字段

**Files:**
- Modify: `src/context/InvoiceContext.js`

- [ ] **Step 1: 修改 initialState lineItem 默认值**

在 initialState 中 lineItems 的注释说明添加 date 字段，并在 addLineItem 默认值中添加：

```javascript
// initialState 不需要改，lineItems 是空数组

// handleAddItem 函数需要修改（在 InvoiceLineItems.js 中）
// 但 InvoiceContext.js 中 addAction 不涉及默认值，保持不变
```

**注意：** InvoiceContext.js 实际上不需要改动，因为 lineItem 的默认值是在 InvoiceLineItems.js 的 handleAddItem 中定义的。跳过此任务，在 Task 2 中一并处理。

---

### Task 2: InvoiceImportModal 传递日期到 lineItem

**Files:**
- Modify: `src/components/InvoiceImportModal.js:73-80`

- [ ] **Step 1: 修改 items.push 添加 date 字段**

将第 73-80 行的 items.push 改为：

```javascript
items.push({
  name: product.invoice_name || "其他",
  spec: product.spec || "",
  unit: "箱",
  quantity,
  price: parseFloat(price),
  taxRate: 0.13,
  date: parseDate(date),
});
```

- [ ] **Step 2: 修改 InvoiceLineItems.js handleAddItem 添加 date 默认值**

在 `src/components/InvoiceLineItems.js` 第 16-24 行，修改 handleAddItem：

```javascript
const handleAddItem = () => {
  addLineItem({
    name: "",
    spec: "",
    unit: "箱",
    quantity: 0,
    price: 0,
    taxRate: 0.13,
    date: new Date().toISOString().split("T")[0],
  });
};
```

- [ ] **Step 3: 运行 lint 验证**

Run: `npm run lint`
Expected: 无新增错误

- [ ] **Step 4: Commit**

```bash
git add src/components/InvoiceImportModal.js src/components/InvoiceLineItems.js
git commit -m "feat: lineItem 添加 date 字段支持"
```

---

### Task 3: InvoiceForm 按月份分组导出

**Files:**
- Modify: `src/components/InvoiceForm.js:33-112`

- [ ] **Step 1: 添加 getCurrentMonth 辅助函数**

在 handleExport 函数之前添加：

```javascript
const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};
```

- [ ] **Step 2: 修改 handleExport 按月份分组**

替换 handleExport 函数（第 33-112 行）：

```javascript
const handleExport = async () => {
  if (!basicInfo.companyName || !basicInfo.contractNo) {
    toast({ title: "请填写公司名称和合同号", variant: "destructive" });
    return;
  }
  if (!customerInfo.customerName || !customerInfo.taxId) {
    toast({ title: "请填写客户名称和纳税人识别号", variant: "destructive" });
    return;
  }
  if (lineItems.length === 0) {
    toast({ title: "请添加开票内容明细", variant: "destructive" });
    return;
  }
  
  const incompleteIndex = lineItems.findIndex((item) => 
    !item.name || !item.spec || !item.unit || !item.quantity || !item.price || item.quantity <= 0 || item.price <= 0 || item.name === "其他"
  );
  if (incompleteIndex !== -1) {
    const item = lineItems[incompleteIndex];
    let reason = "信息不完整";
    if (item.name === "其他") {
      reason = "商品未匹配品牌规则";
    }
    toast({ title: `第 ${incompleteIndex + 1} 行${reason}，请检查`, variant: "destructive" });
    return;
  }

  setIsExporting(true);
  
  try {
    const groupedByMonth = lineItems.reduce((acc, item) => {
      const month = item.date ? item.date.substring(0, 7) : getCurrentMonth();
      if (!acc[month]) acc[month] = [];
      acc[month].push(item);
      return acc;
    }, {});

    const months = Object.keys(groupedByMonth);
    const exportedMonths = [];

    for (const month of months) {
      const monthItems = groupedByMonth[month];
      
      await exportInvoice(basicInfo, customerInfo, monthItems, month);
      exportedMonths.push(month);

      const totalAmount = monthItems.reduce((sum, item) => {
        const quantity = new Decimal(item.quantity || 0);
        const price = new Decimal(item.price || 0);
        const taxRate = new Decimal(item.taxRate || 0.13);
        const total = quantity.times(price);
        return sum + total.toNumber();
      }, 0);

      const itemsWithCalculations = monthItems.map(item => {
        const quantity = new Decimal(item.quantity || 0);
        const price = new Decimal(item.price || 0);
        const taxRate = new Decimal(item.taxRate || 0.13);
        const amount = quantity.times(price).div(new Decimal(1).plus(taxRate));
        const tax = amount.times(taxRate);
        const total = amount.plus(tax);
        return {
          ...item,
          amount: amount.toNumber(),
          tax: tax.toNumber(),
          total: total.toNumber()
        };
      });

      const invoiceDateForHistory = monthItems[0]?.date || `${month}-01`;

      const historyRes = await fetch("/api/invoice-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceDate: invoiceDateForHistory,
          customerInfo,
          items: itemsWithCalculations,
          totalAmount
        })
      });
      const historyData = await historyRes.json();
      if (!historyData.success) {
        console.error("保存历史失败:", historyData.error);
      }
    }

    if (months.length === 1) {
      toast({ title: "发票导出成功" });
    } else {
      toast({ title: `导出完成：已生成 ${months.length} 个文件（${exportedMonths.join("、")}）` });
    }
  } catch (error) {
    toast({ title: `导出失败: ${error.message}`, variant: "destructive" });
  } finally {
    setIsExporting(false);
  }
};
```

- [ ] **Step 3: 运行 lint 验证**

Run: `npm run lint`
Expected: 无新增错误

- [ ] **Step 4: Commit**

```bash
git add src/components/InvoiceForm.js
git commit -m "feat: 发票导出按月份分组，支持多文件导出"
```

---

### Task 4: invoiceExporter 接收 month 参数

**Files:**
- Modify: `src/lib/invoiceExporter.js`

- [ ] **Step 1: 修改 exportInvoice 函数签名**

第 4 行改为：

```javascript
export async function exportInvoice(basicInfo, customerInfo, lineItems, month) {
```

- [ ] **Step 2: 修改文件命名**

第 156-157 行改为：

```javascript
const defaultMonth = new Date().toISOString().substring(0, 7);
const fileMonth = month || defaultMonth;
link.download = `${fileMonth}_${customerInfo.customerName || "未命名"}.xlsx`;
```

- [ ] **Step 3: 运行 lint 验证**

Run: `npm run lint`
Expected: 无新增错误

- [ ] **Step 4: Commit**

```bash
git add src/lib/invoiceExporter.js
git commit -m "feat: invoiceExporter 支持 month 参数自定义文件名"
```

---

### Task 5: 验证完整流程

- [ ] **Step 1: 运行 lint 全量检查**

Run: `npm run lint`
Expected: 无新增错误（原有 warning 可忽略）

- [ ] **Step 2: 手动测试**

1. 打开开发服务器：`npm run dev`
2. 访问发票页面，导入包含不同月份数据的内容
3. 点击导出，验证是否生成多个文件
4. 检查历史记录是否分别保存

- [ ] **Step 3: 最终 Commit**

```bash
git add -A
git commit -m "feat: 发票导出支持混合月份分离导出完成"
```