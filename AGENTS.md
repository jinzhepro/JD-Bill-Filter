# AGENTS.md - AI Agent 开发指南

## 项目概述

**JD Bill Filter** - 京东结算单处理系统（中文界面）

**技术栈**: Next.js 16.2.3 (App Router), React 19.2.0, JavaScript (无 TypeScript), Tailwind CSS 3.4.18, shadcn/ui (New York 风格), Decimal.js, ExcelJS

**Node 版本**: Volta 管理 (24.14.1)

## 命令

```bash
npm run dev      # 开发服务器 (http://localhost:3000)
npm run build    # 生产构建
npm start        # 生产服务器
npm run lint     # ESLint 9 flat config
```

**无测试框架** - 仅手动测试。

## 关键规则

### 1. 状态管理

**SettlementContext** (`src/context/SettlementContext.js`) 是核心状态管理器。

**禁止直接修改 state** - 始终使用 Context actions:

```javascript
import { useSettlement } from "@/context/SettlementContext";

const { processedData, setProcessedData } = useSettlement();
// ✅ setProcessedData(newData)
// ❌ processedData.push(newItem)
```

Context 值已在 Provider 中用 `useMemo` 包装，组件中无需额外包装。

### 2. 金额计算

**必须使用 Decimal.js** - 禁止使用浮点数:

```javascript
import Decimal from "decimal.js";
import { cleanAmount } from "@/lib/utils";

const amount = new Decimal(cleanAmount(value));
const total = amount.plus(new Decimal(10));
```

### 3. 商品编号处理

商品编号 **必须是字符串**。Excel 会自动转换为数字或使用公式格式。

使用 `cleanProductCode()` 处理 Excel 公式前缀（`="123456"` → `"123456"`）:

```javascript
import { cleanProductCode } from "@/lib/utils";

const productCode = cleanProductCode(row["商品编号"]);
```

Excel 公式单元格返回 `{ formula: '...', result: ... }` 对象。

### 4. 组件要求

所有客户端组件必须以 `"use client"` 开头。

## 核心工具函数 (`src/lib/utils.js`)

- `cn(...inputs)` - 合并 Tailwind 类名
- `cleanAmount(value)` - 清理货币字符串 (¥, $, 逗号)
- `cleanProductCode(value)` - 处理 Excel 公式前缀，返回字符串
- `formatAmount(value, forcePositive)` - 格式化金额显示

## 常量定义 (`src/lib/constants.js`)

```javascript
SETTLEMENT_AMOUNT_COLUMNS = ["应结金额", "金额", "合计金额", "总金额"];
SETTLEMENT_QUANTITY_COLUMN = "商品数量";
SETTLEMENT_FEE_NAME_FILTER = "货款";
SETTLEMENT_SELF_OPERATION_FEE = "直营服务费";
NUMERIC_COLUMNS = ["商品数量", "单价", "总价", "直营服务费"];
PRODUCT_CODE_COLUMNS = ["商品编码", "商品编号"];
PRODUCT_CODE_FORMAT = "@"; // Excel 文本格式
```

## 文件处理

- 支持格式：`.xlsx`, `.xls`, `.csv` (最大 50MB)
- CSV 编码：先尝试 UTF-8，失败后尝试 GBK
- Excel 导出：商品编号列设置为文本格式 (`numFmt: '@'`)
- 无数据库 - 所有数据在内存中处理

## 核心业务逻辑 (`src/lib/settlementProcessor.js`)

1. **数据验证**: 检查必需列（商品编号、金额列）
2. **过滤**: 只处理"货款"记录
3. **合并**: 按 SKU 合并货款和数量
4. **直营服务费**: 按商品编号分组累加
5. **售后赔付费**: 计算总额，按货款比例分摊
6. **最终计算**:
   - 货款 = 应结金额 - 分摊的赔付费
   - 收入 = 货款 + 直营服务费

## Excel 处理 (`src/lib/excelHandler.js`)

```javascript
import { readFile, downloadExcel } from "@/lib/excelHandler";

const data = await readFile(file, fileType);
await downloadExcel(data, fileName, totals, dataChanges);
```

## 发票导出 (`src/lib/invoiceExporter.js`)

```javascript
import { exportInvoice } from "@/lib/invoiceExporter";

await exportInvoice(basicInfo, customerInfo, lineItems);
```

## 供应商转换 (`src/data/suppliers.js`)

```javascript
import { findSupplierByMatchString, convertTextToSuppliers } from "@/data/suppliers";

const supplier = findSupplierByMatchString(text);
const results = convertTextToSuppliers(text);
```

## 项目结构

```
src/
├── app/
│   ├── page.js              # 首页（结算单处理）
│   ├── invoice/page.js      # 发票开具申请
│   ├── suppliers/page.js    # 供应商转换
│   └── layout.js            # 根布局
├── components/ui/           # shadcn/ui 基础组件
├── context/
│   ├── SettlementContext.js # 结算单状态（核心）
│   ├── InvoiceContext.js    # 发票状态
│   └── SupplierContext.js   # 供应商状态
├── lib/
│   ├── settlementProcessor.js   # 结算单处理
│   ├── excelHandler.js          # Excel 处理
│   ├── invoiceExporter.js       # 发票导出
│   ├── settlementHelpers.js     # 辅助函数
│   ├── utils.js                 # 工具函数
│   ├── constants.js             # 常量定义
│   └── fileValidation.js        # 文件验证
├── data/suppliers.js        # 供应商配置
└── hooks/use-toast.js       # Toast 提示
```

## 导入顺序

```javascript
// 1. React
import React, { useState } from "react";

// 2. 第三方库
import Decimal from "decimal.js";
import ExcelJS from "exceljs";

// 3. 项目内部（@/ 别名）
import { useSettlement } from "@/context/SettlementContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// 4. 相对路径
import { MyComponent } from "./MyComponent";
```

## 样式规范

使用 shadcn/ui 语义化 CSS 变量，避免自定义颜色:

```javascript
// ✅ bg-card text-foreground border-border
// ❌ bg-white text-gray-800 border-gray-200
```

## 常见问题

**商品编号显示为科学计数法？** 导出时使用 `numFmt: '@'` 强制文本格式。

**金额计算精度丢失？** 所有金额计算必须使用 Decimal.js。

**CSV 文件中文乱码？** 系统自动尝试 UTF-8 和 GBK 编码。

**添加新供应商？** 在 `src/data/suppliers.js` 的 `SUPPLIERS` 数组添加配置。