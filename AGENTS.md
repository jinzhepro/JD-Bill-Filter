# AGENTS.md - AI Agent 开发指南

## 项目概述

**电商业务结算助手** - 京东对账单处理系统（中文界面）

**技术栈**: Next.js 15.5.2 (App Router), React 19.2.0, JavaScript (无 TypeScript), Tailwind CSS 3.4.18, shadcn/ui (New York 风格), Decimal.js, ExcelJS, Tesseract.js (OCR), Cloudflare Pages + D1

**Node 版本**: Volta 管理 (24.14.1)

**路径别名**: `@/*` → `./src/*`（jsconfig.json）

## 命令

```bash
npm run dev      # 开发服务器 (http://localhost:3000)
npm run build    # 生产构建
npm start        # 生产服务器
npm run lint     # ESLint 9 flat config

# Cloudflare Pages + D1
npm run pages:build  # 构建 Pages 输出（必须先运行）
npm run pages:dev    # 本地 Pages 开发（端口8788，自动先 build）
npm run pages:deploy # 部署到 Cloudflare Pages（自动先 build）
npx wrangler d1 migrations apply jd --remote  # 远程数据库迁移
npx wrangler d1 migrations apply jd --local   # 本地数据库迁移
```

**无测试框架** - 仅手动测试。

## 部署架构

**Cloudflare Pages + D1 数据库**

- 所有 API routes 必须添加 `export const runtime = 'edge';`（在第一行）
- 数据库绑定: `DB` (wrangler.toml)
- 迁移文件: `migrations/*.sql`，按序号顺序执行

**数据库表**:

| 表名 | 用途 |
|------|------|
| `product_mappings` | 商品 SKU 映射 |
| `brand_mappings` | 品牌发票名称映射 |
| `purchase_orders` | 采购单批次数据 |
| `invoice_history` | 发票导出历史 |
| `invoice_history_items` | 发票明细项 |

## 页面路由

| 路径 | 功能 |
|------|------|
| `/` | 首页（结算单处理） |
| `/suppliers` | 供应商转换 |
| `/products` | 商品管理 |
| `/brands` | 品牌管理 |
| `/invoice` | 发票开具 |
| `/invoice-history` | 发票历史 |
| `/purchase` | 采购单管理 |
| `/login` | 登录页 |

## 认证保护

简单密码保护，默认密码: `qingyun2026`（硬编码在 `src/context/AuthContext.js:8`）

修改密码: 设置环境变量 `AUTH_PASSWORD`，或修改 `AuthContext.js` 和 `src/app/api/login/route.js`。

## Context 状态管理

| Context | 文件 | 用途 |
|---------|------|------|
| SettlementContext | `src/context/SettlementContext.js` | 结算单核心状态 |
| InvoiceContext | `src/context/InvoiceContext.js` | 发票开具状态 |
| SupplierContext | `src/context/SupplierContext.js` | 供应商状态 |
| AuthContext | `src/context/AuthContext.js` | 认证状态 |
| ThemeContext | `src/context/ThemeContext.js` | 主题状态 |
| LoadingContext | `src/context/LoadingContext.js` | 全局加载状态 |

**禁止直接修改 state** - 始终使用 Context actions:

```javascript
import { useSettlement } from "@/context/SettlementContext";

const { processedData, setProcessedData } = useSettlement();
// ✅ setProcessedData(newData)
// ❌ processedData.push(newItem)
```

## 关键规则

### 金额计算

**必须使用 Decimal.js** - 禁止使用浮点数运算:

```javascript
import Decimal from "decimal.js";
import { cleanAmount } from "@/lib/utils";

const amount = new Decimal(cleanAmount(value));
```

### 商品编号处理

商品编号 **必须是字符串**。Excel 会自动转换为数字或添加公式前缀 `="..."`。

使用 `cleanProductCode()` 清理:

```javascript
import { cleanProductCode } from "@/lib/utils";

const productCode = cleanProductCode(row["商品编号"]);
```

### API Routes

```javascript
export const runtime = 'edge';  // 必须放在文件第一行

import { getRequestContext } from '@cloudflare/next-on-pages';

export async function GET(request) {
  const { env } = getRequestContext();
  const db = env.DB;
  // ...
}
```

### 组件

所有客户端组件必须以 `"use client"` 开头。

## 核心工具函数 (`src/lib/utils.js`)

- `cn(...inputs)` - 合并 Tailwind 类名 (clsx + tailwind-merge)
- `cleanAmount(value)` - 清理货币字符串 (¥, ￥, $, 逗号, 空格)
- `cleanProductCode(value)` - 处理 Excel 公式前缀 `="..."`，返回字符串
- `formatAmount(value, forcePositive)` - 格式化金额显示（字符串）
- `formatAmountJSX(value, forcePositive)` - 格式化金额显示（React 组件，正数 primary/负数 destructive）
- `calculateColumnTotals(data, columns)` - 计算列总和

## 文件处理

- 支持格式：`.xlsx`, `.xls`, `.csv` (最大 50MB)
- CSV 编码：先尝试 UTF-8，失败后尝试 GBK
- Excel 导出：商品编号列设置为文本格式 (`numFmt: '@'`)
- 结算单处理：只处理"货款"记录，合并相同 SKU，分摊售后赔付费

## 样式规范

使用 shadcn/ui 语义化 CSS 变量:

```javascript
// ✅ bg-card text-foreground border-border
// ❌ bg-white text-gray-800 border-gray-200
```

## 添加新内容

- **新供应商**: 在 `src/data/suppliers.js` 的 `SUPPLIERS` 数组添加配置
- **新数据库字段**: 创建迁移文件 `migrations/00XX_xxx.sql`，然后运行 `npx wrangler d1 migrations apply jd --local` 和 `--remote`

## 其他重要文件

- `src/lib/settlementProcessor.js` - 结算单核心处理逻辑
- `src/lib/settlementHelpers.js` - 结算辅助函数
- `src/lib/invoiceExporter.js` - 发票导出逻辑
- `src/lib/excelHandler.js` - Excel 文件处理
- `src/lib/fileValidation.js` - 文件验证
- `src/lib/constants.js` - 全局常量
- `env.d.ts` - Cloudflare 环境类型声明（D1 绑定等）

## ESLint 配置

ESLint 9 flat config (`eslint.config.mjs`)，忽略 `.next/`, `.wrangler/`, `.vercel/`, `migrations/` 等目录。`no-unused-vars` 为 warn 级别，`react/prop-types` 已关闭。