# JD-Bill-Filter

## 开发命令

| 命令                                           | 用途                                                |
| ---------------------------------------------- | --------------------------------------------------- |
| `npm run dev`                                  | 等价 `pages:dev`（先 build 再 wrangler, 端口 8788） |
| `npm run lint`                                 | ESLint                                              |
| `npm run build`                                | `next build`（标准 Next.js 构建）                   |
| `npm run pages:build`                          | `@cloudflare/next-on-pages`（构建 Pages 产物）      |
| `npm run pages:dev`                            | pages:build → wrangler pages dev :8788              |
| `npm run pages:deploy`                         | pages:build → wrangler pages deploy                 |
| `npx wrangler d1 migrations apply jd --local`  | 本地 D1 迁移                                        |
| `npx wrangler d1 migrations apply jd --remote` | 远程 D1 迁移                                        |

## 架构关键点

- **纯 JavaScript**，仅 `env.d.ts` 声明 D1 类型（`DB: D1Database`）
- **路径别名** `@/` → `./src/`（`jsconfig.json` 配置）
- **Edge Runtime**：所有 `src/app/api/` 路由以 `export const runtime = 'edge'` 开头，通过 `getRequestContext().env.DB` 访问 D1
- **数据库**：Cloudflare D1 (SQLite)，迁移 `migrations/` 手写 SQL（27+ 次迁移），`wrangler.toml` 绑定 `DB` + `nodejs_compat` 标志
- **金额计算必须用 `decimal.js`**，禁用 `parseFloat`。工具函数 `cleanAmountString()`（推荐，无精度丢失）、`cleanAmount()`、`cleanProductCode()`、`formatAmount()`，均位于 `src/lib/utils.js`
- **文件处理在浏览器端**（ExcelJS），API 仅做持久化
- **认证**：Cookie-based，默认密码 `qingyun2026`，环境变量 `AUTH_PASSWORD` 覆写
- **DEFAULT_COMPANY_INFO** 在 `src/lib/constants.js` 中配置（公司名、合同号等）
- **next.config**: `reactStrictMode: true`, `ppr: false`

## 业务线与页面路由

首页（`/`）选择业务线，进入不同侧边栏布局：

- **京东万商** → `SimpleLayout` + `Sidebar`。路由：`/jd-business`、`/jd-business/virtual-assets`、`/suppliers`、`/products`、`/brands`、`/invoice`、`/purchase`、`/invoice-history`
- **食堂商城** → `CanteenLayout` + `CanteenSidebar`。路由：`/canteen-purchase`、`/canteen-invoice`

## 根布局包裹顺序

`AuthProvider → AuthGuard → SettlementProvider → InvoiceProvider → ErrorBoundary → {children} + Toaster`

所有客户端交互页面以 `"use client"` 开头。

## API 路由（Edge Runtime）

`/api/login` `[POST/DELETE]` · `/api/check-auth` `[GET]` · `/api/products` `[GET/POST]` · `/api/products/[id]` `[DELETE]` · `/api/products/add` `[POST]` · `/api/products/batch-import` `[POST]` · `/api/products/update-invoice-names` `[POST]` · `/api/brand-mappings` `[GET/POST]` · `/api/brand-mappings/[id]` `[DELETE]` · `/api/purchase-orders` `[GET/POST]` · `/api/invoice-history` `[GET/POST]` · `/api/invoice-history/[id]` `[DELETE]` · `/api/invoice-history/update-names` `[POST]` · `/api/canteen-purchase-orders` `[GET/POST]` · `/api/canteen-invoice-history` `[GET/POST]` · `/api/canteen-invoice-history/[id]` `[DELETE]`

## 核心模块

| 文件                               | 职责                                                                                           |
| ---------------------------------- | ---------------------------------------------------------------------------------------------- |
| `src/lib/settlementProcessor.js`   | 结算单处理流水线（验证→售后赔付→服务费→货款合并→赔付分摊→最终计算）                            |
| `src/lib/settlementHelpers.js`     | 供应商识别、数据转换等辅助                                                                     |
| `src/lib/excelHandler.js`          | Excel/CSV 读写，CSV UTF-8→GBK 回退，导出商品编号文本格式                                      |
| `src/lib/invoiceExporter.js`       | 发票申请单导出（合并单元格 + 税额计算）                                                        |
| `src/lib/reconciliation.js`        | 订单与发票行对账，Dice 系数匹配商品名                                                          |
| `src/lib/virtualAssetProcessor.js` | 虚拟资产 CSV 处理，按 SKU 合并实际金额                                                         |
| `src/lib/fileValidation.js`        | 文件类型（xlsx/xls/csv）和大小（50MB）校验                                                     |
| `src/lib/constants.js`             | 常量（文件大小限制、列名映射、默认公司信息等）                                                 |
| `src/lib/utils.js`                 | `cn()`、`cleanAmountString()`/`cleanAmount()`、`cleanProductCode()`、`formatAmount()` 等       |

## Context（共 4 个）

`AuthContext`、`SettlementContext`、`InvoiceContext`、`SupplierContext`。均通过 `useReducer` + `useMemo(actions)` 管理，暴露 `useXxx()` hook（含存在性检查）。不可直接修改 state。

## 编码约定

- **状态管理**：`ActionTypes` + `switch` + 不可变更新（扩展运算符）
- **API 错误**：`Response.json({ success: false, error: error.message }, { status: 500 })`
- **D1 查询**：`db.prepare(sql).bind(...).all() | .first() | .run()`，分页并行 `SELECT ... LIMIT ? OFFSET ?` + `SELECT COUNT(*)`
- **UI**：`cn()` 合并 Tailwind 类，`lucide-react` 图标，shadcn 语义化 CSS 变量（new-york 风格）
- **导入**：ESM，`@/` 别名
- **供应商**：静态数据（`src/data/suppliers.js`、`src/data/canteenSuppliers.js`），无后端 API
- **ESLint 非默认规则**：`no-undef: off`、`react/prop-types: off`、`react-hooks/set-state-in-effect: off`、`react/no-unknown-property: ignore webkitdirectory`
- **无 Prettier/formatter** 配置

## 注意

- **无自动化测试**，仅手动测试
- Node.js 版本通过 Volta 锁定 `24.14.1`
- `.env*` 在 `.gitignore` 中，勿提交密码
- 部署产物在 `.vercel/output/static/`（由 `@cloudflare/next-on-pages` 生成，用于 Cloudflare Pages，非 Vercel）

## 参考文档

- [架构设计详解](docs/blog/从业务痛点到技术实践-Next.js15-Cloudflare-D1-构建电商结算系统.md)
- [发票导出混合月份分离设计](docs/superpowers/specs/2026-04-22-invoice-export-mixed-months-design.md)
- [发票历史批量更新名称设计](docs/superpowers/specs/2026-05-08-invoice-history-update-names-design.md)
