# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

电商业务结算助手 — 基于 Next.js 15 (App Router, JavaScript) 的京东结算单处理系统，部署于 Cloudflare Pages + D1 数据库。支持结算单文件导入处理、供应商转换、商品/品牌管理、发票开具、采购单管理等京东万商业务，以及食堂采购单管理和食堂开票功能。

## 常用命令

```bash
npm run dev        # 本地开发服务器 (localhost:3000)
npm run build      # 生产构建 (next build)
npm run lint       # ESLint 代码检查 (ESLint 9 flat config)
npm run pages:dev  # Cloudflare Pages 本地开发 (端口 8788，自动先 build)
npm run pages:build # Cloudflare Pages 构建
npm run pages:deploy # 部署到 Cloudflare Pages
npm start          # 启动生产服务器
```

### D1 数据库迁移

```bash
npx wrangler d1 migrations apply jd --local   # 本地数据库
npx wrangler d1 migrations apply jd --remote  # 远程数据库
```

## 技术栈

- **框架**: Next.js 15.5.2 (App Router, JavaScript, 无 TypeScript)
- **UI**: shadcn/ui (New York 风格) + Tailwind CSS 3.4.18 + Lucide React 图标
- **状态管理**: React Context + useReducer
- **高精度计算**: Decimal.js（所有金额运算必须使用）
- **文件处理**: ExcelJS (Excel 读写), 原生 FileReader API (CSV)
- **部署**: Cloudflare Pages + D1 数据库 (SQLite)
- **Node**: 24.14.1 (Volta 管理)

## 架构概览

### 两大业务线

项目有两条独立的业务线，通过首页 `/` 选择进入：

1. **京东万商业务** (`/jd-business`) — 主业务，功能完整
   - 使用 `MainLayout` + `Sidebar` 布局
   - 页面: 结算单处理、供应商转换、商品管理、品牌管理、发票开具、采购单管理、虚拟资产汇总
   
2. **食堂商城业务** (`/canteen-*`) — 子业务
   - 使用 `CanteenLayout` (内部使用 MainLayout + CanteenSidebar)
   - 页面: 食堂采购单 (`/canteen-purchase`)、食堂开票 (`/canteen-invoice`)

### 目录结构

```
src/
├── app/                    # Next.js App Router 页面和 API
│   ├── page.js            # 首页 — 业务选择 (京东/食堂)
│   ├── layout.js          # 根布局: Auth → AuthGuard → SettlementProvider → InvoiceProvider
│   ├── login/             # 登录页
│   ├── jd-business/       # 京东万商业务页面
│   ├── canteen-*/         # 食堂业务页面
│   ├── suppliers/         # 供应商转换
│   ├── products/          # 商品管理
│   ├── brands/            # 品牌映射
│   ├── invoice/           # 发票开具
│   ├── invoice-history/   # 发票历史
│   ├── purchase/          # 采购单管理
│   └── api/               # API Routes (D1 数据库 CRUD)
├── components/            # React 组件
│   ├── ui/               # shadcn/ui 基础组件 (button, input, select, table, dialog...)
│   └── *.js              # 业务组件 (每个页面一个主组件)
├── context/               # React Context 状态管理
│   ├── AuthContext.js     # 认证状态 (cookie-based)
│   ├── SettlementContext.js # 结算单处理状态 (useReducer)
│   └── InvoiceContext.js  # 发票开具状态 (useReducer)
├── lib/                   # 核心业务逻辑 (纯函数)
│   ├── settlementProcessor.js  # 结算单处理核心逻辑
│   ├── excelHandler.js    # Excel/CSV 读写
│   ├── invoiceExporter.js # 发票 Excel 导出
│   ├── reconciliation.js  # 对账逻辑 (Dice 系数匹配)
│   ├── virtualAssetProcessor.js # 虚拟资产CSV处理
│   ├── utils.js           # 通用工具 (金额清理、格式化、cn())
│   └── constants.js       # 全局常量
├── data/                  # 静态数据
│   ├── suppliers.js       # 供应商列表
│   └── canteenSuppliers.js # 食堂供应商列表
└── hooks/                 # 自定义 Hooks
    ├── use-toast.js       # 通知 Hook
    └── useProductMatching.js # SKU 与商品映射匹配
```

### 认证系统

- 简单密码保护，默认密码 `qingyun2026`
- 通过 `AUTH_PASSWORD` 环境变量覆盖
- Cookie-based (httpOnly, secure, sameSite=strict)
- API 端点: `POST /api/login` (登录), `DELETE /api/login` (登出), `GET /api/check-auth` (验证)

### 状态管理模式

使用 `Context + useReducer` 模式：
- 每个 Context 定义一个 `initialState` 和 `reducer` 函数
- Actions 通过 `useMemo` 包装确保引用稳定性
- Provider 通过 `useMemo` 优化 value 避免不必要重渲染
- 派生数据（如计算汇总值）在组件层用 `useMemo` 计算，避免状态冗余

### API Routes 模式

所有 API Routes 遵循统一模式：
```javascript
export const runtime = 'edge';  // 必须第一行 — Cloudflare Edge Runtime
import { getRequestContext } from '@cloudflare/next-on-pages';

export async function GET(request) {
  const { env } = getRequestContext();
  const db = env.DB;  // D1 数据库绑定
  // ... 业务逻辑
}
```

API 端点列表：
- `/api/products` — 商品映射 CRUD + 分页搜索
- `/api/brand-mappings` — 品牌映射 CRUD + 分页搜索
- `/api/invoice-history` — 发票历史 CRUD + 批量查询
- `/api/purchase-orders` — 采购单 CRUD + 批量导入
- `/api/canteen-purchase-orders` — 食堂采购单 CRUD + 关联供应商
- `/api/canteen-invoice-history` — 食堂开票历史 CRUD
- `/api/login` / `/api/check-auth` — 认证
- `/api/tax-classification` — 税收分类

### 数据库

使用 Cloudflare D1 (SQLite)，迁移文件在 `migrations/` 目录，按序号命名。主要表：
- `product_mappings` — SKU 与商品名称映射
- `brand_mappings` — 品牌关键词与发票名称映射
- `invoice_history` / `invoice_history_items` — 发票历史
- `purchase_orders` — 采购单
- `canteen_purchase_orders` — 食堂采购单（关联 canteen_suppliers）
- `canteen_invoice_history` / `canteen_invoice_history_items` — 食堂开票历史
- `canteen_suppliers` — 食堂供应商

### 关键开发规范

**金额计算** — 始终使用 Decimal.js 避免浮点精度问题：
```javascript
import Decimal from "decimal.js";
import { cleanAmountString } from "@/lib/utils";
const amount = new Decimal(cleanAmountString(value));
```

**商品编号** — 必须字符串化并清理 Excel 等号前缀：
```javascript
import { cleanProductCode } from "@/lib/utils";
const productCode = cleanProductCode(row["商品编号"]);
```

**CSV 编码** — 先尝试 UTF-8 读取，若检测不到中文则自动尝试 GBK 重新读取。

**客户端组件** — 所有交互组件必须加 `"use client"` 指令。

**CSS 规范** — 使用 shadcn/ui 语义化 CSS 变量 (`bg-card`, `text-foreground`, `border-border`)，避免直接使用 `bg-white`, `text-gray-800` 等。

**Context 状态** — 禁止直接修改 state，始终使用 Context 提供的 action 函数。

### 文件处理

- 支持 `.xlsx`, `.xls`, `.csv` 格式，最大 50MB
- 读取: 使用 `readFile(file, fileType)` — 内部自动区分 Excel/CSV
- 导出: 使用 `downloadExcel(data, fileName)` — 商品编号列设置为文本格式 (`numFmt: '@'`)
- 发票导出: 使用 `exportInvoice(basicInfo, customerInfo, lineItems, month, ...)` — 生成标准发票申请表格式

### 对账逻辑

`reconciliation.js` 中的 `reconcileOrderWithInvoice()` 使用 Dice 系数匹配采购单与发票明细，按数量+含税金额精确匹配。匹配状态: `matched` / `unmatched` / `partial` / `missing`。
