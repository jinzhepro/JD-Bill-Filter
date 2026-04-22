# 发票导出支持混合月份分离导出

## 背景

当前发票导出功能只有单一 `invoiceDate`，所有明细共用一个日期。实际业务中导入的开票明细可能来自不同月份，需要支持按月份分离导出。

## 需求

1. 每条开票明细有独立的日期字段（导入时填充）
2. 导出时按月份分组：
   - 如果只有当前月数据 → 导出单个表格
   - 如果混合当前月和其他月 → 分开导出多个表格
3. 文件命名格式：`YYYY-MM_客户名.xlsx`
4. 每个导出的表格单独记录历史

## 设计

### 1. 数据结构

**InvoiceContext lineItem 增加字段：**
```javascript
{
  name: "",
  spec: "",
  unit: "箱",
  quantity: 0,
  price: 0,
  taxRate: 0.13,
  date: ""  // 新增：YYYY-MM-DD 格式
}
```

### 2. 导入逻辑改造

**InvoiceImportModal 解析日期：**
- 导入 Excel 时解析每行的日期字段
- 将日期传递给 lineItem

### 3. 导出逻辑改造

**InvoiceForm.handleExport 改造：**

1. 按月份分组 lineItems：
```javascript
const groupedByMonth = lineItems.reduce((acc, item) => {
  const month = item.date ? item.date.substring(0, 7) : getCurrentMonth();
  if (!acc[month]) acc[month] = [];
  acc[month].push(item);
  return acc;
}, {});
```

2. 判断月份数量：
   - 单月份：调用 `exportInvoice` 导出单个文件
   - 多月份：循环调用 `exportInvoice` 导出多个文件

3. 文件命名传递给 exporter：

**invoiceExporter.js 改造：**
- 接收 `month` 参数用于文件名
- 文件名格式：`${month}_${customerName}.xlsx`

### 4. 历史记录改造

导出多个表格时，分别调用 `/api/invoice-history` POST：
- 每个月份的数据记录一条历史
- `invoice_date` 使用该月份的数据日期（取第一条的 date 或月份第一天）

### 5. 当前月判断

```javascript
const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};
```

## 文件改动

| 文件 | 改动 |
|------|------|
| `src/context/InvoiceContext.js` | lineItem 默认增加 date 字段 |
| `src/components/InvoiceImportModal.js` | 解析导入数据的日期字段 |
| `src/components/InvoiceForm.js` | handleExport 按月份分组，循环导出 |
| `src/lib/invoiceExporter.js` | 接收 month 参数，调整文件名 |

## 用户提示

导出时如果有多个月份：
- Toast 提示：`导出完成：已生成 2 个文件（2026-04、2026-03）`
- 浏览器自动下载多个文件

## 测试场景

1. 导入单月份数据 → 导出单个文件
2. 导入当前月和其他月混合数据 → 导出两个文件，分别记录历史
3. 导入无日期的数据 → 默认使用当前月
4. 导入多个其他月份数据 → 每个月份单独导出