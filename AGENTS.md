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
- **路径别名** `@/` → `./src/`
- **Cloudflare Edge Runtime**：所有 `src/app/api/` 路由必须以 `export const runtime = 'edge'` 开头，通过 `getRequestContext().env.DB` 访问 D1 数据库
- **数据库**：Cloudflare D1 (SQLite)，迁移位于 `migrations/`，手写 SQL
- **状态管理**：React Context + `useReducer`，禁止直接修改 state
- **金额计算必须用 `decimal.js`**，禁止 `parseFloat`。工具函数 `cleanAmountString()`/`cleanAmount()` 在 `src/lib/utils.js`
- **文件处理在浏览器端**（ExcelJS），API 仅做数据持久化
- **认证**：Cookie-based，默认密码 `qingyun2026`，通过环境变量 `AUTH_PASSWORD` 覆写

## 业务线

- **京东万商**（路由前缀 `/jd-business`、`/suppliers`、`/products`、`/brands`、`/invoice`、`/purchase`）→ `SimpleLayout` + `Sidebar`
- **食堂商城**（路由前缀 `/canteen-purchase`、`/canteen-invoice`）→ `CanteenLayout` + `CanteenSidebar`

## 核心模块

| 文件 | 职责 |
|---|---|
| `src/lib/settlementProcessor.js` | 结算单处理：验证→售后赔付→服务费收集→货款合并→赔付分摊→最终计算 |
| `src/lib/excelHandler.js` | Excel/CSV 读写，CSV 编码检测 UTF-8→GBK 回退，导出处商品编号文本格式 (`numFmt: '@'`) |
| `src/lib/invoiceExporter.js` | 发票申请单 Excel 导出，含合并单元格和税额计算 |
| `src/lib/reconciliation.js` | 订单与发票行对账，Dice 系数匹配商品名 |

## shadcn/ui 约定

- 风格 `new-york`，RSC 模式，`lucide-react` 图标库
- 所有 UI 组件在 `src/components/ui/`，非 TSX
- 路径简写：`@/components/ui/`、`@/lib/utils`、`@/hooks`

## CSS

- Tailwind CSS v3 + `tailwindcss-animate`
- shadcn 语义化 CSS 变量（`--primary`、`--destructive`、`--warning` 等）
- 中文字体栈：`PingFang SC, Microsoft YaHei`

## 注意

- **无自动化测试**，仅有手动测试
- **无 CI/CD 配置**（GitHub Actions 等）
- 部署使用 `@cloudflare/next-on-pages`，构建产物在 `.vercel/output/static/`
- `.env*` 在 `.gitignore` 中，密码等敏感信息不应提交
- 供应商信息在 `src/data/` 中为静态数据，无后端 API
