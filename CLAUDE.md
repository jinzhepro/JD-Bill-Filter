# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

**电商业务结算助手** — 京东对账单处理系统（中文界面）。支持 Excel/CSV 文件导入、智能订单合并、结算单处理、供应商转换、商品/品牌管理、发票开具与历史追踪。

## 重要参考文件

- **`AGENTS.md`** — 详细开发者指南（编码规范、Context 用法、关键规则），开发前必读
- **`README.md`** — 完整功能文档、项目结构、部署指南

## 常用命令

```bash
npm run dev            # 开发服务器 (http://localhost:3000)
npm run build          # 生产构建
npm start              # 生产服务器
npm run lint           # ESLint 检查

# Cloudflare Pages + D1（含 API routes 时必须用）
npm run pages:dev      # 本地 Pages 开发 (端口 8788，自动先 build)
npm run pages:deploy   # 部署到 Cloudflare Pages
npx wrangler d1 migrations apply jd --local   # 本地数据库迁移
npx wrangler d1 migrations apply jd --remote  # 远程数据库迁移
```

Node.js 24.14.1 (Volta 管理)。**无测试框架**，手动测试。

## 技术栈

Next.js 15.5.2 (App Router) · React 19 · JavaScript (无 TypeScript) · Tailwind CSS + shadcn/ui · Decimal.js · ExcelJS · Cloudflare Pages + D1

## 关键架构约束

### API Routes 必须使用 Edge Runtime

```javascript
export const runtime = 'edge';  // 必须在文件第一行
```

数据库通过 `getRequestContext().env.DB` 访问。

### 金额计算必须使用 Decimal.js

禁止浮点数运算。使用 `cleanAmount()` 清理货币字符串。

### 商品编号必须为字符串

使用 `cleanProductCode()` 清理 Excel 公式前缀 `="..."`。

### Context 状态禁止直接修改

始终通过 Context actions 更新 state，使用 `useReducer` 模式。

### 客户端组件必须声明

```javascript
"use client";
```

### 样式使用语义化 CSS 变量

`bg-card`, `text-foreground`, `border-border` — 禁止硬编码颜色。

## 核心文件速查

| 类别 | 路径 |
|------|------|
| 结算处理 | `src/lib/settlementProcessor.js`, `settlementHelpers.js` |
| 发票导出 | `src/lib/invoiceExporter.js` |
| 工具函数 | `src/lib/utils.js` (cleanAmount, cleanProductCode, cn, formatAmount) |
| 供应商数据 | `src/data/suppliers.js` |
| D1 迁移 | `migrations/*.sql` |
| 配置 | `wrangler.toml`, `next.config.mjs`, `jsconfig.json` (`@/*` → `./src/*`) |

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

## 认证

简单密码保护，默认密码: `qingyunyun2026`（硬编码在 `src/context/AuthContext.js:8`）。修改密码: 设置环境变量 `AUTH_PASSWORD`，或修改 `AuthContext.js` 和 `src/app/api/login/route.js`。

## Context 状态管理

| Context | 文件 | 用途 |
|---------|------|------|
| SettlementContext | `src/context/SettlementContext.js` | 结算单核心状态 |
| InvoiceContext | `src/context/InvoiceContext.js` | 发票开具状态 |
| SupplierContext | `src/context/SupplierContext.js` | 供应商状态 |
| AuthContext | `src/context/AuthContext.js` | 认证状态 |

**禁止直接修改 state** — 始终通过 Context actions（`useReducer` 模式）。

## 文件处理

- 支持格式：`.xlsx`, `.xls`, `.csv` (最大 50MB)
- CSV 编码：先尝试 UTF-8，失败后尝试 GBK
- Excel 导出：商品编号列设置为文本格式 (`numFmt: '@'`)
- 结算单处理：只处理"货款"记录，合并相同 SKU，分摊售后赔付费

## 结算单处理逻辑 (`src/lib/settlementProcessor.js`)

处理流程：
1. 收集"直营服务费"和"交易服务费"数据（按 SKU 分组）
2. 合并"货款"记录（相同 SKU 累加金额和数量）
3. 计算售后卖家赔付费总额，从某个 SKU 扣除
4. 生成最终结果，附加服务费数据

**添加新服务费类型时，需同步修改**：
- `src/lib/constants.js` — 添加常量
- `src/lib/settlementProcessor.js` — 添加收集函数、更新合并/结果逻辑
- `src/lib/utils.js` — 更新 `calculateColumnTotals` 默认列
- `src/components/SettlementResultDisplay.js` — 更新 `amountFields`
- `src/components/DataDisplay.js` — 更新合计计算和展示

## 数据库

5 张 D1 表：`product_mappings`, `brand_mappings`, `purchase_orders`, `invoice_history`, `invoice_history_items`。新增字段需创建迁移文件 `migrations/00XX_xxx.sql`。

## ESLint

ESLint 9 flat config (`eslint.config.mjs`)，忽略 `.next/`, `.wrangler/`, `.vercel/`, `migrations/` 等目录。`no-unused-vars` 为 warn 级别，`react/prop-types` 已关闭。
