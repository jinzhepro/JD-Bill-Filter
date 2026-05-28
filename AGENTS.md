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

## 架构速览

**Next.js 15 (App Router) + Cloudflare Pages + D1** · JavaScript (无 TS) · shadcn/ui New York · Tailwind CSS 3 · Decimal.js · Volta Node 24.14.1

- 路径别名: `@/*` → `./src/*`
- DB: `env.DB` (wrangler.toml D1 binding `DB`)
- 迁移: `migrations/NNNN_desc.sql`（4位序号，从0002开始，无0001和0018）按序号执行
- **布局**: 根 layout 包装 `AuthProvider → AuthGuard → SettlementProvider → InvoiceProvider → ErrorBoundary`；子路由**无嵌套 layout**，页面级用 `SimpleLayout`(京东万商) 或 `CanteenLayout`(食堂商城) 组件组合
- **SupplierContext**: 页面级使用，不在根布局（`src/context/SupplierContext.js` 是静态 Provider，数据来自 `src/data/suppliers.js`）

## 路由

| 路径 | 内容 |
|---|---|
| `/` | 业务选择（京东万商 / 食堂商城） |
| `/jd-business` | 结算单处理（SimpleLayout + Sidebar） |
| `/jd-business/virtual-assets` | 虚拟资产 |
| `/purchase` | 采购单 |
| `/invoice` | 发票导出 |
| `/products` | 商品管理 |
| `/brands` | 品牌映射 |
| `/suppliers` | 供应商转换 |
| `/invoice-history` | 发票历史 |
| `/canteen-purchase` | 食堂采购单（CanteenLayout + CanteenSidebar） |
| `/canteen-invoice` | 食堂开票 |
| `/canteen-suppliers` | 食堂供应商 |
| `/login` | 登录页 |

## API Route 铁律

**每个 API route 文件必须首行（或 import 后首行）声明 `export const runtime = 'edge';`**

DB 通过 `getRequestContext().env.DB` 获取：

```javascript
export const runtime = 'edge';
import { getRequestContext } from '@cloudflare/next-on-pages';
export async function GET(request) {
  const { env } = getRequestContext();
  const db = env.DB;
}
```

登录 API 使用 `NextResponse`（因为需要操作 cookie）——这是唯一用 `NextResponse` 的 route：
```javascript
import { NextResponse } from 'next/server';
const response = NextResponse.json({ success: true });
response.cookies.set('auth_token', password, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 2592000, path: '/' });
```

### 所有 API Route

| 前缀 | 方法 | 说明 |
|---|---|---|
| `/api/login` | POST/DELETE | 登录/登出（NextResponse + cookie） |
| `/api/check-auth` | GET | 认证检查 |
| `/api/products` | GET/POST | 商品 SKU 映射 |
| `/api/products/:id` | PUT/DELETE | 单条商品 |
| `/api/products/add` | POST | 新增 |
| `/api/products/batch-import` | POST | 批量导入 |
| `/api/products/update-invoice-names` | POST | 更新发票名称 |
| `/api/brand-mappings` | GET/POST | 品牌映射 |
| `/api/brand-mappings/:id` | PUT/DELETE | 单条品牌 |
| `/api/purchase-orders` | GET/POST/PUT/DELETE | 采购单 CRUD |
| `/api/invoice-history` | GET/POST | 发票历史 |
| `/api/invoice-history/:id` | DELETE | 删除单条 |
| `/api/invoice-history/update-names` | POST | 更新发票名称 |
| `/api/canteen-purchase-orders` | GET/POST/DELETE | 食堂采购单 |
| `/api/canteen-suppliers` | GET/POST/PUT/DELETE | 食堂供应商 |
| `/api/canteen-invoice-history` | GET/POST | 食堂发票历史 |
| `/api/canteen-invoice-history/:id` | DELETE | 删除单条 |

批量查询/插入用 `db.batch()` 提升性能（见 `src/app/api/invoice-history/route.js` 的 `db.batch(batch)` 模式）。

## 关键规则（违反会导致 bug）

### 金额计算 — Decimal.js 强制
**所有金额计算必须用 Decimal.js**，禁止 `+ - * /` 浮点运算：
```javascript
import Decimal from "decimal.js";
import { cleanAmountString } from "@/lib/utils";
const amount = new Decimal(cleanAmountString(value));
```

### 商品编号 — 字符串 + 公式前缀
商品编号是**字符串**。Excel 可能加 `="..."` 公式前缀。必须用 `cleanProductCode()` 处理：
```javascript
import { cleanProductCode } from "@/lib/utils";
const code = cleanProductCode(row["商品编号"]);
```
Excel 导出时商品编号列用文本格式 (`numFmt: '@'`)。

### Context 状态管理 — 替换整个状态，不要直接修改
```javascript
const { processedData, setProcessedData } = useSettlement();
setProcessedData(newData);  // ✅
processedData.push(item);   // ❌

const { addLineItems } = useInvoice();
addLineItems(items);  // ✅
items.forEach(i => addLineItem(i));  // ❌
```

### 结算单过滤
只处理 `SETTLEMENT_FEE_NAME_FILTER = "货款"` 的记录（见 `src/lib/constants.js`）。

### 表格序号列
所有 UI 表格均已添加"序号"列作为首列，CSS 类 `w-12 text-center text-muted-foreground`（紧凑表格用 `w-10` 或 `w-8`）。Excel 导出的发票申请表也包含"序号"列。

## ESLint 配置（和默认值不同）

`eslint.config.mjs` (flat config) 的关键设置：
- `react/prop-types: off` — JS 项目无 prop-types 验证
- `no-undef: off` — 不检查未定义变量（兼容 Cloudflare D1 的 `process.env` 在 edge runtime 中的行为）
- `react/no-unknown-property: ["error", { ignore: ["webkitdirectory"] }]` — 允许 `webkitdirectory` 属性（文件上传用）
- `no-unused-vars: warn` — 仅警告
- `react/react-in-jsx-scope: off` — Next.js 自动注入 React

## 数据库

- D1 数据库名 `jd`，binding `DB`
- 无 ORM，全部手写 SQL：`db.prepare(sql).bind(...).run() / all()`
- 批量操作：`db.batch([preparedStatement1, preparedStatement2, ...])`
- 迁移文件：`migrations/NNNN_desc.sql`，数字递增。
  添加新字段步骤：创建迁移 → `npx wrangler d1 migrations apply jd --local` → 测试 → `--remote`

## 文件处理细节

| 格式 | 说明 |
|---|---|
| `.xlsx / .xls` | ExcelJS 读写，50MB 上限 |
| `.csv` | 先尝试 UTF-8 解码，失败后 fallback 到 GBK |
| `.docx` | mammoth 库解析为 HTML 后提取表格（食堂采购单专用） |
| CSV 导出 | 内容加 `\ufeff` BOM 前缀确保 Excel 正确识别 UTF-8 |

### 新服务费类型添加链路
添加新费用类型需要按顺序修改：`constants.js` → `settlementProcessor.js` → `utils.js` 的 `calculateColumnTotals` → `SettlementResultDisplay.js` 的 `amountFields` → `DataDisplay.js`

## 认证

Cookie 密码保护，默认密码 `qingyun2026`（30天有效期）。
修改方式：设 `AUTH_PASSWORD` 环境变量，或改 `src/app/api/login/route.js`。

## 关键文件速查

| 文件 | 用途 |
|---|---|
| `src/lib/settlementProcessor.js` | 结算单核心处理（合并 SKU、分摊赔付费） |
| `src/lib/invoiceExporter.js` | 发票 Excel 导出（ExcelJS，11 列，含序号） |
| `src/lib/excelHandler.js` | Excel/CSV 读写（含公式对象解析 `{formula, result}`） |
| `src/lib/constants.js` | 全局常量（费用名称、列名、默认公司信息） |
| `src/lib/utils.js` | 工具函数（cn, cleanAmount, cleanAmountString, cleanProductCode, formatAmount, calculateRowAmount 等） |
| `src/lib/reconciliation.js` | 对账逻辑 |
| `src/data/suppliers.js` | 供应商静态配置（SUPPLIERS 数组 + findSupplierByMatchString） |
| `src/context/SettlementContext.js` | 结算单状态（useReducer，含撤回/日志/合并模式） |
| `src/context/InvoiceContext.js` | 发票状态（基本信息 + 客户信息 + 明细行） |
| `src/hooks/useProductMatching.js` | SKU→商品名称匹配 Hook |
| `src/hooks/use-toast.js` | 通知提示 Hook |
| `env.d.ts` | Cloudflare D1 类型声明（`interface CloudflareEnv { DB: D1Database }`） |

## 添加新内容

- **新供应商**: 在 `src/data/suppliers.js` 的 `SUPPLIERS` 数组添加 `{ id, name, supplierId, matchString }`
- **新数据库字段**: 创建 `migrations/NNNN_desc.sql`，运行 `wrangler d1 migrations apply jd --local && --remote`
- **新服务费类型**: 按 "constants.js → settlementProcessor.js → utils.js → SettlementResultDisplay.js → DataDisplay.js" 链路同步修改
- **新页面**: 在 `src/app/` 下建目录 + `page.js`，页面级用 `SimpleLayout` 或 `CanteenLayout` 组件包装，不要嵌套 layout
