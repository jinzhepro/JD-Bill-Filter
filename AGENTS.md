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

## Context（共 3 个）

`AuthContext`（登录认证）、`SettlementContext`（结算单处理）、`InvoiceContext`（发票信息）。均通过 `useReducer` + `useMemo(actions)` 管理，暴露 `useXxx()` hook（含存在性检查）。不可直接修改 state。

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

## 组件清单（`src/components/`）

### 布局组件

| 文件                | 用途                                                                         |
| ------------------- | ---------------------------------------------------------------------------- |
| `MainLayout.js`     | 基础布局：固定左侧栏 `w-64 z-50` + 粘性顶栏 `z-40` + 主内容区 `p-6` 渐变背景 |
| `SimpleLayout.js`   | 京东业务线布局（MainLayout + Sidebar）                                       |
| `CanteenLayout.js`  | 食堂业务线布局（MainLayout + CanteenSidebar）                                |
| `Sidebar.js`        | 京东万商侧边栏导航（结算/供应商/商品/品牌/发票/采购）                        |
| `CanteenSidebar.js` | 食堂侧边栏导航                                                               |

### 业务组件

| 文件                             | 用途                                 |
| -------------------------------- | ------------------------------------ |
| `SettlementContent.js`           | 结算单处理主界面（上传→处理→展示）   |
| `SettlementFolderUpload.js`      | 批量文件夹上传（树形结构拖拽）       |
| `SettlementProcessModal.js`      | 启动结算处理流水线的模态框           |
| `SettlementResultDisplay.js`     | 合并/处理后的结算结果展示与导出      |
| `VirtualAssetUpload.js`          | 虚拟资产 CSV 上传处理                |
| `VirtualAssetResultDisplay.js`   | 虚拟资产处理结果展示                 |
| `ProductManager.js`              | 商品 SKU 映射 CRUD                   |
| `BrandManager.js`                | 品牌关键词→发票名称映射 CRUD         |
| `SupplierManager.js`             | 供应商列表查看与查找                 |
| `PurchaseOrderManager.js`        | 京东采购单管理（上传/查看/标记入账） |
| `CanteenPurchaseOrderManager.js` | 食堂采购单管理（含供应商映射）       |
| `InvoiceHistoryManager.js`       | 发票历史查看/导出/删除               |

### 发票组件

| 文件                     | 用途                                           |
| ------------------------ | ---------------------------------------------- |
| `InvoiceForm.js`         | 发票申请单表单（公司信息 + 客户信息 + 明细行） |
| `InvoiceImportModal.js`  | 从 Excel/CSV 导入发票数据                      |
| `InvoiceLineItems.js`    | 发票明细行可编辑表格（数量/单价/税率/金额）    |
| `HuanyuInvoiceModal.js`  | 寰宇供应商专用发票模态框                       |
| `CanteenInvoiceModal.js` | 食堂发票创建模态框                             |
| `CustomerImportModal.js` | 从结算数据导入客户信息                         |

### 通用组件

| 文件               | 用途                                           |
| ------------------ | ---------------------------------------------- |
| `FileUploader.js`  | 通用拖拽上传器（支持文件夹、校验扩展名+50MB）  |
| `DataDisplay.js`   | 通用表格组件（排序、复制、金额格式化）         |
| `ErrorBoundary.js` | 类组件错误边界（开发环境显示错误栈、重试按钮） |
| `AuthGuard.js`     | 路由守卫，未认证重定向到 `/login`              |

### UI 基座组件（`src/components/ui/`）

shadcn New York 风格：`badge.js`、`button.js`、`card.js`、`checkbox.js`、`dialog.js`、`input.js`、`modal.js`、`select.js`、`skeleton.js`、`table.js`、`textarea.js`、`toast.js`、`toaster.js`

## Hooks（`src/hooks/`）

| 文件                    | 用途                                                                                                                         |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `useProductMatching.js` | 获取商品映射（1000 条/页），返回 `products[]`、`unmatchedSkus[]`、`getProductDisplayName(sku)`，`useMemo` 实现 O(1) SKU 查找 |
| `use-toast.js`          | 消息通知系统（最多 1 条活动 Toast，1 分钟自动消失）                                                                          |

## 数据文件（`src/data/`）

| 文件                  | 用途                                                                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `suppliers.js`        | 京东万商供应商静态数据（`{ id, name, supplierId, matchString }[]`），导出 `SUPPLIERS`、`findSupplierByMatchString()`、`convertTextToSuppliers()` |
| `canteenSuppliers.js` | 食堂供应商静态数据（结构同上）                                                                                                                   |

## 页面路由映射

| 路由                          | 文件                                 | 说明                            |
| ----------------------------- | ------------------------------------ | ------------------------------- |
| `/`                           | `page.js`                            | 业务线选择器（京东万商 / 食堂） |
| `/login`                      | `login/page.js`                      | 密码登录页                      |
| `/jd-business`                | `jd-business/page.js`                | 京东结算处理（SimpleLayout）    |
| `/jd-business/virtual-assets` | `jd-business/virtual-assets/page.js` | 虚拟资产处理                    |
| `/products`                   | `products/page.js`                   | 商品 SKU 管理                   |
| `/brands`                     | `brands/page.js`                     | 品牌映射管理                    |
| `/suppliers`                  | `suppliers/page.js`                  | 供应商查看                      |
| `/invoice`                    | `invoice/page.js`                    | 发票申请单                      |
| `/invoice-history`            | `invoice-history/page.js`            | 发票历史                        |
| `/purchase`                   | `purchase/page.js`                   | 京东采购单管理                  |
| `/canteen-purchase`           | `canteen-purchase/page.js`           | 食堂采购单管理（CanteenLayout） |
| `/canteen-invoice`            | `canteen-invoice/page.js`            | 食堂发票（CanteenLayout）       |

所有页面以 `"use client"` 开头，JD 路由用 `SimpleLayout`，食堂路由用 `CanteenLayout`。

## 通用 UI 模式

### Modal 模式

所有模态框（发票导入、寰宇、食堂等）遵循统一模式：

- `isOpen` prop + `onClose()` 回调
- 提交按钮触发 API POST
- 成功 → Toast 通知 + Context 更新 + 关闭模态框

### Manager CRUD 模式

```
[搜索栏] [添加按钮] [批量导入按钮]
[分页控件]
[可排序数据表格 + 删除/编辑按钮]
[分页信息]
```

所有 Manager 组件：挂载时 fetch 数据，支持分页和搜索过滤。

## API 路由模式

### 统一响应格式

```javascript
// 成功
{ success: true, data: [...], pagination: { page, pageSize, total, totalPages } }
// 错误
{ success: false, error: "message" } // status: 500 或 400
```

- GET 均支持 `page`、`pageSize` 分页参数和搜索过滤
- POST 使用 `.bind()` 参数化查询防 SQL 注入
- DELETE 按 ID 删除

### 数据库表概览

| 表                        | 关键列                                                                                   | 用途                |
| ------------------------- | ---------------------------------------------------------------------------------------- | ------------------- |
| `product_mappings`        | `sku (UNIQUE)`, `product_name`, `brand_name`, `invoice_name`, `spec`, `unit`, `tax_rate` | 商品目录            |
| `brand_mappings`          | `brand_keywords`, `invoice_name`                                                         | 品牌关键词→发票名称 |
| `purchase_orders`         | `supplier_name`, `sku`, `quantity`, `amount_with_tax`, `is_entered`                      | 京东采购单          |
| `invoice_history`         | `export_date`, `invoice_date`, `customer_name`, `total_amount`                           | 发票头信息          |
| `invoice_history_items`   | `history_id (FK)`, `name`, `sku`, `quantity`, `price`, `amount`, `tax`                   | 发票明细行          |
| `canteen_purchase_orders` | `canteen_name`, `supplier_id`, `sku`, `quantity`, `amount_with_tax`                      | 食堂采购单          |
| `canteen_invoice_history` | `contract_no`, `customer_name`, `total_amount`                                           | 食堂发票            |
| `canteen_suppliers`       | —                                                                                        | 食堂供应商映射      |

全部 29 次迁移（0002-0029），位于 `migrations/` 目录。

## CSS 变量系统

shadcn New York 风格，语义化 HSL 变量：

```
--background / --foreground  — 页面背景和文字
--card / --card-foreground    — 卡片背景和文字
--primary / --primary-foreground — 主色调
--secondary / --secondary-foreground — 次色调
--destructive / --warning / --success — 状态色
--radius: 0.5rem              — 全局圆角
```

定义在 `src/app/globals.css`，Tailwind 配置在 `tailwind.config.js`。
