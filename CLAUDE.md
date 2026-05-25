# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 命令

```bash
npm run pages:dev       # 本地开发（端口8788，自动先 pages:build）
npm run build           # next build
npm run lint            # ESLint 9 flat config
npm run pages:deploy    # 部署到 Cloudflare Pages
npx wrangler d1 migrations apply jd --local   # 本地 D1 迁移
npx wrangler d1 migrations apply jd --remote  # 远程 D1 迁移
```

**没有 `npm run dev` 或 `npm start`** — 始终用 `pages:dev`。没有测试框架。

## 技术栈与架构

**Next.js 15 App Router + Cloudflare Pages + D1** · JavaScript（无 TS）· shadcn/ui New York · Tailwind CSS 3 · Decimal.js · Volta Node 24.14.1

- 路径别名: `@/*` → `./src/*`
- 数据库绑定: `env.DB`（D1, wrangler.toml 配置）
- 迁移: `migrations/*.sql`，按序号依次执行
- UI 组件: `src/components/ui/*`（shadcn 注册表）

### Context 层级（layout.js）

```
AuthProvider → AuthGuard → SettlementProvider → InvoiceProvider → ErrorBoundary → children
```

四个 Context：`AuthContext`（登录态）→ `SettlementContext`（结算单）→ `InvoiceContext`（发票）→ `SupplierContext`（供应商，非全局包装，页面级单独使用）。

### 核心业务模块

- **结算单处理**：`src/lib/settlementProcessor.js` — 解析京东结算单 CSV/Excel，过滤"货款"记录，合并相同 SKU 数量和金额，按货款比例分摊"售后卖家赔付费"，关联直营服务费和交易服务费
- **发票导出**：`src/lib/invoiceExporter.js` — 生成发票申请表 Excel，含公司/客户信息、明细行、合计行、签字区域
- **Excel 读写**：`src/lib/excelHandler.js` — 文件解析（CSV UTF-8 → GBK 回退，Excel），Excel 下载（商品编号列文本格式防自动转换）
- **商品/品牌管理**：CRUD 操作通过 `/api/products/*` 和 `/api/brand-mappings/*`，对接 D1 数据库
- **食堂模块**：独立于主营业务的食堂采购单、供应商、发票管理，路由 `/canteen-purchase`, `/canteen-suppliers`, `/canteen-invoice`，API 前缀 `/api/canteen-*`

### API Route 规则

每个 API route 文件**第一行必须是** `export const runtime = 'edge';`。DB 通过 `getRequestContext().env.DB` 获取（来自 `@cloudflare/next-on-pages`）。

## 关键规则

### 金额计算：必须用 Decimal.js

```javascript
import Decimal from "decimal.js";
import { cleanAmountString } from "@/lib/utils";
const amount = new Decimal(cleanAmountString(value));
```

`cleanAmountString()` 用于安全转向 Decimal 字符串，`cleanAmount()` 用于 JS 显示。禁止用 `parseFloat` 做金额加法。

### 商品编号：必须是字符串

```javascript
import { cleanProductCode } from "@/lib/utils";
const code = cleanProductCode(row["商品编号"]); // 处理 Excel ="..." 格式
```

### Context 状态管理：禁止直接修改

```javascript
// ✅ 用 action 替换整个状态
setProcessedData(newData);
// ❌ 直接修改
processedData.push(item);

// ✅ 批量添加用批量 action
addLineItems(items);
// ❌ 循环调用单个 action
items.forEach(i => addLineItem(i));
```

### 样式

使用 shadcn/ui 语义化 CSS 变量：`bg-card`, `text-foreground`, `border-border`，不用原始颜色值。

## 文件处理

- 支持 `.xlsx/.xls/.csv`（最大 50MB）
- CSV 编码：先 UTF-8，失败后 GBK
- Excel 导出：商品编号列设文本格式 `numFmt: '@'`
- 结算单必需列：`商品编号` + 金额列（`应结金额`/`金额`/`合计金额`/`总金额` 任一）

## 认证

Cookie 密码保护，默认密码 `qingyun2026`（30天有效期）。修改：环境变量 `AUTH_PASSWORD` 或改 `src/app/api/login/route.js`。

## 添加新内容

- **新供应商**: `src/data/suppliers.js` 的 `SUPPLIERS` 数组
- **新数据库字段**: 创建 `migrations/00XX_desc.sql`，然后本地+远程 D1 迁移
- **新服务费类型**: 同步改 `constants.js` → `settlementProcessor.js` → `utils.js` 的 `calculateColumnTotals` → `SettlementResultDisplay.js` → `DataDisplay.js`
