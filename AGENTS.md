# AGENTS.md

**电商业务结算助手** — 京东对账单处理系统，双业务线：京东万商（结算单/发票/商品）和食堂商城（采购单/开票）。

## 命令

```bash
npm run build           # next build
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
- DB: `env.DB` (wrangler.toml, D1 binding `DB`)
- 迁移: `migrations/*.sql` 按序号执行
- **布局**: 根 layout 包装 `AuthProvider → AuthGuard → SettlementProvider → InvoiceProvider → ErrorBoundary`；子路由**无嵌套 layout**，页面级用 `SimpleLayout`(京东万商) 或 `CanteenLayout`(食堂商城) 组件组合。`SupplierContext` 页面级使用，不在根布局。

### 路由结构

```
/                          → 业务选择
/jd-business               → 结算单处理（SimpleLayout + Sidebar）
/purchase                  → 采购单
/invoice                   → 发票导出
/products                  → 商品管理
/brands                    → 品牌映射
/suppliers                 → 供应商转换
/invoice-history           → 发票历史
/canteen-purchase          → 食堂采购单（CanteenLayout + CanteenSidebar）
/canteen-invoice           → 食堂开票
/canteen-suppliers         → 食堂供应商
/login                     → 登录页
```

## API Route

每个 API route 必须有 `export const runtime = 'edge';`（首行或在 import 后）。DB 通过 `getRequestContext().env.DB` 获取：

```javascript
export const runtime = 'edge';
import { getRequestContext } from '@cloudflare/next-on-pages';
export async function GET(request) {
  const { env } = getRequestContext();
  const db = env.DB;
}
```

| Route 前缀 | 用途 |
|---|---|
| `/api/login` | 登录/登出 (POST/DELETE) |
| `/api/check-auth` | 认证检查 |
| `/api/products/*` | 商品 SKU 映射 CRUD |
| `/api/brand-mappings/*` | 品牌发票名称 CRUD |
| `/api/purchase-orders/*` | 采购单 CRUD |
| `/api/invoice-history/*` | 发票历史 CRUD |
| `/api/canteen-purchase-orders/*` | 食堂采购单 CRUD |
| `/api/canteen-suppliers/*` | 食堂供应商 CRUD |
| `/api/canteen-invoice-history/*` | 食堂发票历史 CRUD |

## 关键规则

### 金额计算
**必须用 Decimal.js**，禁止浮点数：
```javascript
import Decimal from "decimal.js";
import { cleanAmountString } from "@/lib/utils";
const amount = new Decimal(cleanAmountString(value));
```

### 商品编号处理
商品编号是**字符串**。Excel 可能加 `="..."` 公式前缀。用 `cleanProductCode()`：
```javascript
import { cleanProductCode } from "@/lib/utils";
const code = cleanProductCode(row["商品编号"]);
```

### Context 状态管理
用 actions 替换整个状态，不要直接修改：
```javascript
const { processedData, setProcessedData } = useSettlement();
setProcessedData(newData);  // ✅
processedData.push(item);   // ❌

const { addLineItems } = useInvoice();
addLineItems(items);  // ✅
items.forEach(i => addLineItem(i));  // ❌
```

### 客户端组件
所有交互式组件文件以 `"use client"` 开头。

### 样式
用 shadcn/ui 语义化 CSS 变量（`bg-card text-foreground`），不用原始颜色。

## 认证

Cookie 密码保护，默认密码 `qingyun2026`（30天有效期）。修改：设 `AUTH_PASSWORD` 环境变量或改 `src/app/api/login/route.js`。

## 文件处理

- 支持 `.xlsx/.xls/.csv`（最大 50MB）
- CSV 编码：先 UTF-8，失败后 GBK
- Excel 导出：商品编号列用文本格式 (`numFmt: '@'`)
- 结算单过滤：只处理 `SETTLEMENT_FEE_NAME_FILTER`（"货款"）记录

## 关键文件

| 文件 | 用途 |
|---|---|
| `src/lib/settlementProcessor.js` | 结算单核心处理逻辑（合并 SKU、分摊赔付费） |
| `src/lib/invoiceExporter.js` | 发票导出逻辑 |
| `src/lib/excelHandler.js` | Excel 文件读写 |
| `src/lib/reconciliation.js` | 对账逻辑 |
| `src/lib/constants.js` | 全局常量（费用名称、列名、默认公司信息） |
| `src/lib/utils.js` | 工具函数（cn, cleanAmount, cleanProductCode, formatAmount 等） |
| `src/data/suppliers.js` | 供应商配置（SUPPLIERS 数组） |
| `src/context/SettlementContext.js` | 结算单状态 |
| `src/context/InvoiceContext.js` | 发票状态 |
| `src/context/SupplierContext.js` | 供应商状态 |
| `src/context/AuthContext.js` | 认证状态 |
| `env.d.ts` | Cloudflare D1 类型声明 |

## 添加新内容

- **新供应商**: 在 `src/data/suppliers.js` 的 `SUPPLIERS` 数组添加
- **新数据库字段**: 创建 `migrations/00XX_desc.sql`，运行 `wrangler d1 migrations apply jd --local && --remote`
- **新服务费类型**: 同步改 `constants.js` → `settlementProcessor.js` → `utils.js` 的 `calculateColumnTotals` → `SettlementResultDisplay.js` 的 `amountFields` → `DataDisplay.js`
