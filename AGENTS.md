# JD-Bill-Filter

## 开发命令

| 命令                                           | 用途                                                |
| ---------------------------------------------- | --------------------------------------------------- |
| `npm run dev`                                  | Next.js 开发服务器                                  |
| `npm run lint`                                 | ESLint                                              |
| `npm run build`                                | Next.js 构建                                        |
| `npm run pages:build`                          | Cloudflare Pages 构建 (`@cloudflare/next-on-pages`) |
| `npm run pages:dev`                            | 构建后在 8788 端口模拟 Pages 环境                   |
| `npm run pages:deploy`                         | 构建并发布到 Cloudflare Pages                       |
| `npx wrangler d1 migrations apply jd --local`  | 本地 D1 迁移                                        |
| `npx wrangler d1 migrations apply jd --remote` | 远程 D1 迁移                                        |

## 架构关键点

- **纯 JavaScript**，仅 `env.d.ts` 声明 D1 类型（`DB: D1Database`）
- **路径别名** `@/` → `./src/`（`jsconfig.json` 配置）
- **Edge Runtime**：所有 `src/app/api/` 路由以 `export const runtime = 'edge'` 开头，通过 `getRequestContext().env.DB` 访问 D1
- **数据库**：Cloudflare D1 (SQLite)，迁移 `migrations/` 手写 SQL，`wrangler.toml` 绑定 `DB`
- **金额计算必须用 `decimal.js`**，禁用 `parseFloat`。工具函数 `cleanAmountString()`（推荐，无精度丢失）、`cleanAmount()`、`cleanProductCode()`、`formatAmount()`，均位于 `src/lib/utils.js`
- **文件处理在浏览器端**（ExcelJS），API 仅做持久化
- **认证**：Cookie-based，默认密码 `qingyun2026`，环境变量 `AUTH_PASSWORD` 覆写

## 业务线与页面路由

首页（`/`）选择业务线，进入不同侧边栏布局：

- **京东万商** → `SimpleLayout` + `Sidebar`。路由：`/jd-business`（结算单）、`/jd-business/virtual-assets`（虚拟资产）、`/suppliers`、`/products`、`/brands`、`/invoice`、`/purchase`、`/invoice-history`
- **食堂商城** → `CanteenLayout` + `CanteenSidebar`。路由：`/canteen-purchase`、`/canteen-invoice`

## 根布局包裹顺序

`AuthProvider → AuthGuard → SettlementProvider → InvoiceProvider → ErrorBoundary → {children} + Toaster`

所有客户端交互页面以 `"use client"` 开头。

## API 路由（Edge Runtime）

| 路径                                 | 方法            | 用途                     |
| ------------------------------------ | --------------- | ------------------------ |
| `/api/login`                         | POST, DELETE    | 登录 / 注销              |
| `/api/check-auth`                    | GET             | 验证登录状态             |
| `/api/products`                      | GET, POST       | 商品 SKU 映射 CRUD       |
| `/api/products/[id]`                 | DELETE          | 删除单个映射             |
| `/api/products/add`                  | POST            | 新增商品映射             |
| `/api/products/batch-import`         | POST            | 批量导入映射             |
| `/api/products/update-invoice-names` | POST            | 更新发票名称             |
| `/api/brand-mappings`                | GET, POST       | 品牌映射 CRUD            |
| `/api/brand-mappings/[id]`           | DELETE          | 删除品牌映射             |
| `/api/purchase-orders`               | GET, POST       | 采购单管理               |
| `/api/invoice-history`               | GET, POST       | 发票历史                 |
| `/api/invoice-history/[id]`          | DELETE          | 删除历史记录             |
| `/api/invoice-history/update-names`  | POST            | 批量更新历史记录名称     |
| `/api/canteen-purchase-orders`       | GET, POST       | 食堂采购单               |
| `/api/canteen-invoice-history`       | GET, POST       | 食堂发票历史             |
| `/api/canteen-invoice-history/[id]`  | DELETE          | 删除食堂发票历史         |

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
| `src/lib/constants.js`             | 常量                                                                                           |
| `src/lib/utils.js`                 | `cn()`（Tailwind 类合并）、`cleanAmountString()`/`cleanAmount()`、`cleanProductCode()`、`formatAmount()` 等 |

## Context（共 4 个）

`AuthContext`、`SettlementContext`、`InvoiceContext`、`SupplierContext`。均通过 `useReducer` + `useMemo(actions)` 管理，暴露 `useXxx()` hook（含存在性检查）。不可直接修改 state。

## 编码约定

- **状态管理**：`ActionTypes` + `switch` + 不可变更新（扩展运算符）
- **API 错误**：`Response.json({ success: false, error: error.message }, { status: 500 })`
- **D1 查询**：`db.prepare(sql).bind(...).all() | .first() | .run()`
- **分页**：并行 `SELECT ... LIMIT ? OFFSET ?` + `SELECT COUNT(*)`
- **UI**：`cn()` 合并 Tailwind 类，`lucide-react` 图标，shadcn 语义化 CSS 变量
- **导入**：ESM，`@/` 别名
- **供应商**：静态数据（`src/data/suppliers.js`、`src/data/canteenSuppliers.js`），无后端 API

## 注意

- **无自动化测试**，仅手动测试
- Node.js 版本通过 Volta 锁定 `24.14.1`
- `.env*` 在 `.gitignore` 中，勿提交密码
- 部署产物在 `.vercel/output/static/`

## 参考文档

- [从业务痛点到技术实践 — 架构设计详解](docs/blog/从业务痛点到技术实践-Next.js15-Cloudflare-D1-构建电商结算系统.md)
- [发票导出混合月份分离设计](docs/superpowers/specs/2026-04-22-invoice-export-mixed-months-design.md)
- [发票历史批量更新名称设计](docs/superpowers/specs/2026-05-08-invoice-history-update-names-design.md)
