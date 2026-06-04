# JD-Bill-Filter

## 开发命令

| 命令 | 用途 |
|---|---|
| `npm run dev` | Next.js 开发服务器 |
| `npm run lint` | ESLint |
| `npm run build` | Next.js 构建 |
| `npm run pages:build` | Cloudflare Pages 构建 (`@cloudflare/next-on-pages`) |
| `npm run pages:dev` | 本地模拟 Pages 环境 (port 8788) |
| `npm run pages:deploy` | 构建 + 发布到 Cloudflare Pages |
| `npx wrangler d1 migrations apply jd --local` | 本地 D1 迁移 |
| `npx wrangler d1 migrations apply jd --remote` | 远程 D1 迁移 |

## 架构关键点

- **纯 JavaScript**，无 TypeScript（仅 `env.d.ts` 声明 D1 类型）
- **路径别名** `@/` → `./src/`（配置在 `jsconfig.json`）
- **Cloudflare Edge Runtime**：所有 `src/app/api/` 路由必须以 `export const runtime = 'edge'` 开头，通过 `getRequestContext().env.DB` 访问 D1 数据库
- **数据库**：Cloudflare D1 (SQLite)，迁移位于 `migrations/`，手写 SQL，通过 `wrangler.toml` 中 `[[d1_databases]]` 绑定 `DB`
- **状态管理**：React Context + `useReducer`，禁止直接修改 state。4 个 Context：`AuthContext`、`SettlementContext`、`InvoiceContext`、`SupplierContext`
- **金额计算必须用 `decimal.js`**，禁止 `parseFloat`。工具函数 `cleanAmountString()`/`cleanAmount()` 在 `src/lib/utils.js`
- **文件处理在浏览器端**（ExcelJS），API 仅做数据持久化
- **认证**：Cookie-based，默认密码 `qingyun2026`，通过环境变量 `AUTH_PASSWORD` 覆写
- **页面路由结构**：首页（`/`）选择业务线 → `/jd-business`（京东万商）或 `/canteen-purchase`（食堂商城）

## 业务线

- **京东万商**（路由前缀 `/jd-business`、`/suppliers`、`/products`、`/brands`、`/invoice`、`/purchase`）→ `SimpleLayout` + `Sidebar`
- **食堂商城**（路由前缀 `/canteen-purchase`、`/canteen-invoice`）→ `CanteenLayout` + `CanteenSidebar`

## 布局组件层次

根布局 `src/app/layout.js`（Server Component）按以下顺序包裹：

```
AuthProvider → AuthGuard → SettlementProvider → InvoiceProvider → ErrorBoundary → {children} + Toaster
```

所有业务页面通过 `SimpleLayout`（京东）或 `CanteenLayout`（食堂）提供侧边栏导航。

## API 路由

所有 `src/app/api/` 下的路由文件遵循相同模式：

```js
export const runtime = 'edge';
import { getRequestContext } from '@cloudflare/next-on-pages';

export async function GET(request) {
  const { env } = getRequestContext();
  const db = env.DB;
  // ...
}
```

可用端点：

| 路径 | 方法 | 用途 |
|---|---|---|
| `/api/login` | POST | 密码登录 |
| `/api/check-auth` | GET | 验证登录状态 |
| `/api/products` | GET, POST | 商品 SKU 映射 CRUD |
| `/api/products/[id]` | DELETE | 删除单个映射 |
| `/api/products/add` | POST | 新增商品映射 |
| `/api/products/batch-import` | POST | 批量导入映射 |
| `/api/products/update-invoice-names` | POST | 更新发票名称 |
| `/api/brand-mappings` | GET, POST | 品牌映射 CRUD |
| `/api/brand-mappings/[id]` | DELETE | 删除品牌映射 |
| `/api/purchase-orders` | GET, POST | 采购单管理 |
| `/api/invoice-history` | GET, POST | 发票历史 |
| `/api/invoice-history/[id]` | DELETE | 删除历史记录 |
| `/api/invoice-history/update-names` | POST | 批量更新历史记录名称 |
| `/api/canteen-purchase-orders` | GET, POST | 食堂采购单 |
| `/api/canteen-invoice-history` | GET, POST | 食堂发票历史 |
| `/api/canteen-invoice-history/[id]` | DELETE | 删除食堂发票历史 |
| `/api/tax-classification/analyze` | POST | 税务分类分析 |

## 核心模块

| 文件 | 职责 |
|---|---|
| `src/lib/settlementProcessor.js` | 结算单处理：验证→售后赔付→服务费收集→货款合并→赔付分摊→最终计算 |
| `src/lib/settlementHelpers.js` | 结算单辅助函数（供应商识别、数据转换等） |
| `src/lib/excelHandler.js` | Excel/CSV 读写，CSV 编码检测 UTF-8→GBK 回退，导出处商品编号文本格式 (`numFmt: '@'`) |
| `src/lib/invoiceExporter.js` | 发票申请单 Excel 导出，含合并单元格和税额计算 |
| `src/lib/reconciliation.js` | 订单与发票行对账，Dice 系数匹配商品名 |
| `src/lib/virtualAssetProcessor.js` | 虚拟资产 CSV 处理，按 SKU 合并实际金额 |
| `src/lib/fileValidation.js` | 文件类型（.xlsx/.xls/.csv）和大小（50MB）验证 |
| `src/lib/constants.js` | 常量定义 |
| `src/lib/utils.js` | 通用工具函数：`cn()`（Tailwind 类合并）、`cleanAmount()`/`cleanAmountString()`、`formatAmount()`、`safeJsonParse()`、`safeLocalStorageGet()`/`Set()`、`silentTry()` 等 |

## Hooks

| 文件 | 用途 |
|---|---|
| `src/hooks/use-toast.js` | shadcn toast 通知 |
| `src/hooks/useProductMatching.js` | 商品匹配逻辑 |

## shadcn/ui 约定

- 风格 `new-york`，RSC 模式，`lucide-react` 图标库
- 所有 UI 组件在 `src/components/ui/`，非 TSX
- 路径简写：`@/components/ui/`、`@/lib/utils`、`@/hooks`

## CSS

- Tailwind CSS v3 + `tailwindcss-animate`
- shadcn 语义化 CSS 变量（`--primary`、`--destructive`、`--warning` 等）
- 中文字体栈：`PingFang SC, Microsoft YaHei`

## 编码模式

- **导入风格**：ESM `import`，路径使用 `@/` 别名
- **组件**：需客户端交互的页面/组件以 `"use client";` 开头
- **Reducer 模式**：`ActionTypes` 对象 + `switch` 分发 + 不可变更新（扩展运算符）
- **Context 模式**：`createContext()` → `XxxProvider`（`useReducer` + `useMemo(actions)`）→ `useXxx()` 自定义 hook（含 context 存在性检查）
- **API 错误处理**：统一 `Response.json({ success: false, error: error.message }, { status: 500 })`
- **D1 查询**：`db.prepare(sql).bind(...params).all() | .first() | .run()`
- **分页查询模式**：并行 `SELECT ... LIMIT ? OFFSET ?` + `SELECT COUNT(*)`
- **UI 组件**：使用 `cn()` 合并 Tailwind 类名，图标来自 `lucide-react`

## 参考文档

- [从业务痛点到技术实践 — 架构设计详解](docs/blog/从业务痛点到技术实践-Next.js15-Cloudflare-D1-构建电商结算系统.md)
- [发票导出混合月份分离设计](docs/superpowers/specs/2026-04-22-invoice-export-mixed-months-design.md)
- [发票历史批量更新名称设计](docs/superpowers/specs/2026-05-08-invoice-history-update-names-design.md)

## 注意

- **无自动化测试**，仅有手动测试
- **无 CI/CD 配置**（GitHub Actions 等）
- 部署使用 `@cloudflare/next-on-pages`，构建产物在 `.vercel/output/static/`
- `.env*` 在 `.gitignore` 中，密码等敏感信息不应提交
- 供应商信息在 `src/data/` 中为静态数据，无后端 API
- Node.js 版本通过 Volta 锁定为 `24.14.1`
