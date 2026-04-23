# AGENTS.md - AI Agent 开发指南

## 项目概述

**JD Bill Filter** - 京东结算单处理系统（中文界面）

**技术栈**: Next.js 15.5.2 (App Router), React 19.2.0, JavaScript (无 TypeScript), Tailwind CSS 3.4.18, shadcn/ui (New York 风格), Decimal.js, ExcelJS, Cloudflare D1

**Node 版本**: Volta 管理 (24.14.1)

## 命令

```bash
npm run dev      # 开发服务器 (http://localhost:3000)
npm run build    # 生产构建
npm start        # 生产服务器
npm run lint     # ESLint 9 flat config

# Cloudflare Pages + D1
npm run pages:dev    # 本地开发（端口8788）
npm run pages:deploy # 部署到 Cloudflare Pages
npx wrangler d1 migrations apply jd --remote  # 远程数据库迁移
npx wrangler d1 migrations apply jd --local   # 本地数据库迁移
```

**无测试框架** - 仅手动测试。

## 部署架构

**Cloudflare Pages + D1 数据库**

- 所有 API routes 必须添加 `export const runtime = 'edge';`
- 数据库绑定: `DB` (wrangler.toml)
- 迁移文件: `migrations/*.sql`

**数据库表名注意**: 商品表名是 `product_mappings`（不是 `products`）

```javascript
// API 中查询商品
const res = await db.prepare('SELECT * FROM product_mappings').all();
```

## 认证保护

简单密码保护，默认密码: `qingyun2026`

修改密码: 
- 设置环境变量 `AUTH_PASSWORD`
- 或修改 `src/context/AuthContext.js` 和 `src/app/api/login/route.js`

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

使用 `cleanProductCode()` 处理 Excel 公式前缀:

```javascript
import { cleanProductCode } from "@/lib/utils";

const productCode = cleanProductCode(row["商品编号"]);
```

### 4. 组件要求

所有客户端组件必须以 `"use client"` 开头。

### 5. API Routes

所有 API routes 必须添加 edge runtime:

```javascript
export const runtime = 'edge';

import { getRequestContext } from '@cloudflare/next-on-pages';

export async function GET(request) {
  const { env } = getRequestContext();
  const db = env.DB;
  // ...
}
```

## 核心工具函数 (`src/lib/utils.js`)

- `cn(...inputs)` - 合并 Tailwind 类名
- `cleanAmount(value)` - 清理货币字符串 (¥, $, 逗号)
- `cleanProductCode(value)` - 处理 Excel 公式前缀，返回字符串
- `formatAmount(value, forcePositive)` - 格式化金额显示

## 数据库表结构

| 表名 | 用途 |
|------|------|
| `product_mappings` | 商品 SKU 映射 |
| `brand_mappings` | 品牌发票名称映射 |
| `purchase_orders` | 采购单批次数据 |
| `invoice_history` | 发票导出历史 |
| `invoice_history_items` | 发票明细项 |

## 文件处理

- 支持格式：`.xlsx`, `.xls`, `.csv` (最大 50MB)
- CSV 编码：先尝试 UTF-8，失败后尝试 GBK
- Excel 导出：商品编号列设置为文本格式 (`numFmt: '@'`)

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

使用 shadcn/ui 语义化 CSS 变量:

```javascript
// ✅ bg-card text-foreground border-border
// ❌ bg-white text-gray-800 border-gray-200
```

## 常见问题

**商品编号显示为科学计数法？** 导出时使用 `numFmt: '@'` 强制文本格式。

**金额计算精度丢失？** 所有金额计算必须使用 Decimal.js。

**CSV 文件中文乱码？** 系统自动尝试 UTF-8 和 GBK 编码。

**API 报错 "no such table"？** 表名是 `product_mappings`，不是 `products`。

**添加新供应商？** 在 `src/data/suppliers.js` 的 `SUPPLIERS` 数组添加配置。

**添加新数据库字段？** 
1. 创建迁移文件 `migrations/00XX_xxx.sql`
2. 运行 `npx wrangler d1 migrations apply jd --remote`
3. 运行 `npx wrangler d1 migrations apply jd --local`