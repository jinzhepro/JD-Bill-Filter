# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 开发命令

| 命令 | 用途 |
|------|------|
| `npm run dev` | 启动 Next.js 开发服务器 |
| `npm run build` | Next.js 构建 |
| `npm run lint` | ESLint 检查 |
| `npm run pages:build` | Cloudflare Pages 构建 (`@cloudflare/next-on-pages`) |
| `npm run pages:dev` | 在 8788 端口模拟 Pages 环境（自动先构建） |
| `npm run pages:deploy` | 构建并发布到 Cloudflare Pages |
| `npx wrangler d1 migrations apply jd --local` | 本地 D1 迁移 |
| `npx wrangler d1 migrations apply jd --remote` | 远程 D1 迁移 |

## 技术栈

- **框架**: Next.js 15.5 (App Router)，纯 JavaScript（无 TypeScript）
- **UI**: shadcn/ui (New York) + Tailwind CSS 3.4 + Lucide React
- **状态管理**: React Context + useReducer
- **部署**: Cloudflare Pages + D1 (SQLite)
- **运行时**: Edge Runtime（所有 API 路由）
- **数值计算**: decimal.js（禁用 parseFloat）
- **文件处理**: ExcelJS（浏览器端），CSV 原生 API
- **Node.js**: Volta 锁定 24.14.1

## 架构概览

### 项目结构

```
src/
├── app/              # App Router 页面 + API 路由
│   ├── layout.js     # 根布局（AuthProvider → AuthGuard → SettlementProvider → InvoiceProvider → ErrorBoundary）
│   ├── page.js       # 首页：选择业务线
│   ├── jd-business/  # 京东万商业务线
│   ├── canteen-purchase/ / canteen-invoice/  # 食堂商城业务线
│   ├── login/ / suppliers/ / products/ / brands/ / invoice/ / invoice-history/ / purchase/
│   └── api/          # Edge Runtime API 路由，通过 getRequestContext().env.DB 访问 D1
├── components/       # React 组件
│   └── ui/           # shadcn/ui 基础组件
├── context/          # AuthContext / SettlementContext / InvoiceContext / SupplierContext
├── lib/              # 核心业务逻辑（结算处理、对账、导出、文件处理）
├── data/             # 供应商静态数据
└── hooks/            # use-toast
migrations/           # D1 SQL 迁移
```

### 两条业务线

1. **京东万商** (`SimpleLayout` + `Sidebar`): 结算单处理、虚拟资产、供应商转换、商品/品牌管理、发票管理、采购单、发票历史
2. **食堂商城** (`CanteenLayout` + `CanteenSidebar`): 食堂采购单、食堂发票

### 核心模块职责

| 文件 | 职责 |
|------|------|
| `src/lib/settlementProcessor.js` | 结算单处理流水线（验证→售后赔付→服务费→货款合并→赔付分摊→最终计算） |
| `src/lib/settlementHelpers.js` | 供应商识别、数据转换辅助函数 |
| `src/lib/excelHandler.js` | Excel/CSV 读写，CSV UTF-8→GBK 回退 |
| `src/lib/invoiceExporter.js` | 发票申请单导出（合并单元格 + 税额计算） |
| `src/lib/reconciliation.js` | 订单与发票行对账，Dice 系数匹配商品名 |
| `src/lib/virtualAssetProcessor.js` | 虚拟资产 CSV 处理，按 SKU 合并实际金额 |
| `src/lib/fileValidation.js` | 文件类型和大小校验 |
| `src/lib/constants.js` | 常量定义 |
| `src/lib/utils.js` | 工具函数：`cn()`, `cleanAmountString()`, `cleanAmount()`, `cleanProductCode()`, `formatAmount()` |

## 编码约定

- **所有 API 路由以 `export const runtime = 'edge'` 开头**，通过 `getRequestContext().env.DB` 获取 D1 实例
- **金额计算必须用 `decimal.js`** (new Decimal(x))，禁止 parseFloat。优先用 `cleanAmountString()` 避免精度丢失
- **文件处理在浏览器端**（ExcelJS），API 仅做数据库持久化
- **状态管理**：`ActionTypes` + `switch` + 不可变更新（展开运算符），不可直接修改 state
- **API 响应格式**：`Response.json({ success: true/false, data/error })`
- **D1 查询**：`db.prepare(sql).bind(...).all() | .first() | .run()`
- **UI**：`cn()` 合并 Tailwind 类，使用 shadcn 语义化 CSS 变量（`bg-card`, `text-foreground`）
- **导入**：ESM，`@/` 别名映射到 `./src/`
- **认证**：Cookie-based，默认密码 `qingyun2026`，环境变量 `AUTH_PASSWORD` 覆写
- **供应商数据**：静态数据（`src/data/suppliers.js`, `src/data/canteenSuppliers.js`），无后端 API
- **无自动化测试**，仅手动测试
- **客户端组件必须以 `"use client"` 开头**
- **商品编号必须用 `cleanProductCode()` 处理**（去除 Excel 公式前缀）
- **Excel 导出时商品编号列设为文本格式** (`numFmt: '@'`)

## 参考文档

- 详细架构文档见 [AGENTS.md](AGENTS.md)
- [架构设计详解](docs/blog/从业务痛点到技术实践-Next.js15-Cloudflare-D1-构建电商结算系统.md)
