# AGENTS.md

**电商业务结算助手** — 京东对账单处理系统，双业务线：京东万商（结算单/发票/商品）和食堂商城（采购单/开票）。

## 命令

```bash
npm run build           # next build（JS 项目，无类型检查）
npm run lint            # ESLint 9 flat config
npm run pages:dev       # 本地开发（端口8788，自动先 pages:build）
npm run pages:deploy    # 部署到 Cloudflare Pages（自动先 pages:build）
npx wrangler d1 migrations apply jd --local   # 本地 D1 迁移
npx wrangler d1 migrations apply jd --remote  # 远程 D1 迁移
```

**无 `npm run dev`/`npm start`** — 始终用 `pages:dev`。**无测试框架**。

## 架构

**Next.js 15 (App Router) + Cloudflare Pages + D1** · JavaScript (无 TS) · shadcn/ui New York · Tailwind CSS 3 · Decimal.js · Volta Node 24.14.1

- 路径别名: `@/*` → `./src/*`
- DB: `env.DB` (wrangler.toml D1 binding `DB`)，**无 ORM**，全部手写 SQL：`db.prepare(sql).bind(...).run() / all()`
- 批量操作：`db.batch([stmt1, stmt2, ...])`
- 迁移: `migrations/NNNN_desc.sql`（从0002开始，无0001和0018），按序号递增执行
- 根 layout: `AuthProvider → AuthGuard → SettlementProvider → InvoiceProvider → ErrorBoundary`
- 子页面**无嵌套 layout**，页面级用 `SimpleLayout`(京东万商) 或 `CanteenLayout`(食堂商城) 组件包装
- `SupplierContext` 页面级使用，不在根布局

## API Route 铁律

**每个 API route 文件必须声明 `export const runtime = 'edge';`**

```javascript
export const runtime = 'edge';
import { getRequestContext } from '@cloudflare/next-on-pages';
export async function GET(request) {
  const { env } = getRequestContext();
  const db = env.DB;
}
```

登录 API (`/api/login`) 是唯一用 `NextResponse` 的 route（操作 cookie）。

API 路由结构：`/api/products`, `/api/products/[id]`, `/api/products/add`, `/api/products/batch-import`, `/api/products/update-invoice-names`, `/api/brand-mappings`, `/api/brand-mappings/[id]`, `/api/purchase-orders`, `/api/invoice-history`, `/api/invoice-history/[id]`, `/api/invoice-history/update-names`, `/api/canteen-purchase-orders`, `/api/canteen-suppliers`, `/api/canteen-invoice-history`, `/api/canteen-invoice-history/[id]`, `/api/check-auth`, `/api/login`。

## 关键规则

### 金额计算 — Decimal.js 强制

**所有金额计算必须用 Decimal.js**，禁止原生 `+ - * /`：
```javascript
import { cleanAmountString } from "@/lib/utils";
const amount = new Decimal(cleanAmountString(value));
```
`cleanAmountString()` 返回纯数字字符串，`cleanAmount()` 经 `parseFloat` 仅用于展示。

### 商品编号 — 字符串 + 公式前缀

必须用 `cleanProductCode()` 处理 Excel 的 `="..."` 公式前缀。Excel 导出时用文本格式 `numFmt: '@'`。

### Context 状态管理 — 替换整个状态，不直接修改

```javascript
setProcessedData(newData);              // ✅
processedData.push(item);               // ❌
addLineItems(items);                    // ✅
items.forEach(i => addLineItem(i));     // ❌
```

### 结算单过滤

只处理 `SETTLEMENT_FEE_NAME_FILTER = "货款"` 的记录（`src/lib/constants.js`）。

### ESLint 特殊设置

`eslint.config.mjs` (flat config)：`no-undef: off`（兼容 edge runtime），`react/prop-types: off`，`react/no-unknown-property: ["error", { ignore: ["webkitdirectory"] }]`。

## 文件处理

| 格式 | 说明 |
|---|---|
| `.xlsx / .xls` | ExcelJS 读写，50MB 上限 |
| `.csv` | 先 UTF-8，失败 fallback GBK |
| `.docx` | mammoth 解析为 HTML 后提取表格（食堂专用） |
| CSV 导出 | 加 `\ufeff` BOM 前缀确保 Excel 识别 UTF-8 |

## 认证

Cookie 密码保护，默认密码 `qingyun2026`（30天有效期）。修改：设 `AUTH_PASSWORD` 环境变量，或改 `src/app/api/login/route.js`。

## 关键文件速查

| 文件 | 用途 |
|---|---|
| `src/lib/settlementProcessor.js` | 结算单核心处理（合并 SKU、分摊赔付费） |
| `src/lib/invoiceExporter.js` | 发票 Excel 导出（ExcelJS，11 列，含序号） |
| `src/lib/excelHandler.js` | Excel/CSV 读写（含 `{formula, result}` 解析） |
| `src/lib/virtualAssetProcessor.js` | 虚拟资产 CSV 处理（按 SKU 合并金额） |
| `src/lib/constants.js` | 全局常量（费用名称、列名、默认公司信息） |
| `src/lib/utils.js` | `cn`, `cleanAmount`, `cleanAmountString`, `cleanProductCode`, `formatAmount`, `calculateRowAmount` |
| `src/lib/reconciliation.js` | 对账逻辑 |
| `src/context/SettlementContext.js` | 结算单状态（useReducer，含撤回/日志/合并模式） |
| `src/context/InvoiceContext.js` | 发票状态（基本信息 + 客户信息 + 明细行） |
| `src/data/suppliers.js` | 供应商静态配置（SUPPLIERS 数组 + findSupplierByMatchString） |
| `env.d.ts` | Cloudflare D1 类型声明 |

## 新内容添加链路

- **新供应商**: `src/data/suppliers.js` 的 `SUPPLIERS` 数组
- **新数据库字段**: 创建 `migrations/NNNN_desc.sql` → `wrangler d1 migrations apply jd --local` → 测试 → `--remote`
- **新服务费类型**: `constants.js` → `settlementProcessor.js` → `utils.js` `calculateColumnTotals` → `SettlementResultDisplay.js` `amountFields` → `DataDisplay.js`
- **新页面**: `src/app/` 下建目录 + `page.js`，页面级用 `SimpleLayout` 或 `CanteenLayout` 包装，不要嵌套 layout
