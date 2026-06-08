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
- **数据库**：Cloudflare D1 (SQLite)，迁移 `migrations/` 手写 SQL（29 次迁移，0002-0029），`wrangler.toml` 绑定 `DB` + `nodejs_compat` 标志
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

## 结算处理流水线（`settlementProcessor.js`）

1. **验证** — 检查必需列（商品编号、金额列）
2. **筛选** — 仅提取"货款"行
3. **合并 SKU** — 按商品编码合并数量和金额（Decimal.js）
4. **费用计算** — 售后赔付费（按货款比例分摊）、直营服务费/交易服务费
5. **最终计算** — 应结金额 = 货款 - 分摊赔付

> 所有金额计算必须使用 `cleanAmountString()` + `new Decimal()`，禁止 `parseFloat`。

## 核心模块

| 文件                               | 职责                                                                                     |
| ---------------------------------- | ---------------------------------------------------------------------------------------- |
| `src/lib/settlementProcessor.js`   | 结算单处理流水线（验证→售后赔付→服务费→货款合并→赔付分摊→最终计算）                      |
| `src/lib/settlementHelpers.js`     | 供应商识别、数据转换等辅助                                                               |
| `src/lib/excelHandler.js`          | Excel/CSV 读写，CSV UTF-8→GBK 回退，导出商品编号文本格式                                 |
| `src/lib/invoiceExporter.js`       | 发票申请单导出（合并单元格 + 税额计算）                                                  |
| `src/lib/reconciliation.js`        | 订单与发票行对账，Dice 系数匹配商品名                                                    |
| `src/lib/virtualAssetProcessor.js` | 虚拟资产 CSV 处理，按 SKU 合并实际金额                                                   |
| `src/lib/fileValidation.js`        | 文件类型（xlsx/xls/csv）和大小（50MB）校验                                               |
| `src/lib/constants.js`             | 常量（文件大小限制、列名映射、默认公司信息等）                                           |
| `src/lib/utils.js`                 | `cn()`、`cleanAmountString()`/`cleanAmount()`、`cleanProductCode()`、`formatAmount()` 等 |

## Context（共 4 个）

`AuthContext`（登录认证）、`SettlementContext`（结算单处理）、`InvoiceContext`（发票信息）、`SupplierContext`（供应商列表与查找）。均通过 `useReducer` + `useMemo(actions)` 管理，暴露 `useXxx()` hook（含存在性检查）。不可直接修改 state。

### Context 模式（所有 4 个统一范式）

```javascript
const ActionTypes = { SET_X: "SET_X", ... };

function reducer(state, action) {
  switch (action.type) {
    case ActionTypes.SET_X: return { ...state, x: action.payload };
    default: return state;
  }
}

export function XProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const actions = useMemo(() => ({
    setX: (v) => dispatch({ type: ActionTypes.SET_X, payload: v }),
  }), []);
  const value = useMemo(() => ({ ...state, ...actions }), [state, actions]);
  return <XContext.Provider value={value}>{children}</XContext.Provider>;
}
```

## 组件模式

- **所有交互页面**：`"use client"` 开头，搭配 `SimpleLayout`（京东）或 `CanteenLayout`（食堂）
- **MainLayout** 结构：固定左侧栏 `w-64 z-50` + 粘性顶栏 `z-40` + 主内容区 `p-6` 渐变背景
- **ErrorBoundary**：类组件，捕获 JS 错误，开发环境显示错误栈，提供"重试"和"刷新"按钮
- **FileUploader**：拖拽上传，支持多文件，浏览器端通过 ExcelJS 解析
- **DataDisplay**：通用表格展示，支持列排序、复制、金额格式化

## 文件处理模式

- **Excel (.xlsx/.xls)**：ExcelJS 浏览器端解析 → JSON 行数据
- **CSV**：先试 UTF-8 解码，无中文则回退 GBK
- **导出**：Excel 商品编号列设为文本格式（`"@"`）防止 Excel 自动转换数字
- **校验**：类型（xlsx/xls/csv）+ 大小（50MB 上限）

## 编码约定

- **状态管理**：`ActionTypes` + `switch` + 不可变更新（扩展运算符）
- **API 错误**：`Response.json({ success: false, error: error.message }, { status: 500 })`
- **D1 查询**：`db.prepare(sql).bind(...).all() | .first() | .run()`，分页并行 `SELECT ... LIMIT ? OFFSET ?` + `SELECT COUNT(*)`
- **UI**：`cn()` 合并 Tailwind 类，`lucide-react` 图标，shadcn 语义化 CSS 变量（new-york 风格）
- **导入**：ESM，`@/` 别名
- **供应商**：静态数据（`src/data/suppliers.js`、`src/data/canteenSuppliers.js`），无后端 API
- **ESLint 非默认规则**：`no-undef: off`、`react/prop-types: off`、`react-hooks/set-state-in-effect: off`、`react/no-unknown-property: ignore webkitdirectory`
- **无 Prettier/formatter** 配置

## 注意 & 常见陷阱

- **无自动化测试**，仅手动测试
- Node.js 版本通过 Volta 锁定 `24.14.1`
- `.env*` 在 `.gitignore` 中，勿提交密码
- 部署产物在 `.vercel/output/static/`（由 `@cloudflare/next-on-pages` 生成，用于 Cloudflare Pages，非 Vercel）
- **金额计算必须用 `cleanAmountString()` + `new Decimal()`**，`cleanAmount()`（内部用 parseFloat）仅用于近似显示
- **商品编号** Excel 可能自动转数字，解析用 `cleanProductCode()`，导出用文本格式 `@`
- **CSV 编码**：解析器自动回退 GBK，无需手动指定编码
- **Excel 公式单元格**：`getCellValue()` 处理 `{ formula, result }` 结构
- **Edge Runtime 限制**：无 Node.js `fs` 模块，所有文件处理在浏览器端
- **D1 查询**：始终用 `.bind()` 参数化查询，避免 SQL 注入

## 参考文档

- [架构设计详解](docs/blog/从业务痛点到技术实践-Next.js15-Cloudflare-D1-构建电商结算系统.md)
- [发票导出混合月份分离设计](docs/superpowers/specs/2026-04-22-invoice-export-mixed-months-design.md)
- [发票历史批量更新名称设计](docs/superpowers/specs/2026-05-08-invoice-history-update-names-design.md)
