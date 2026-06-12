# JD-Bill-Filter

京东对账单处理系统 — Next.js 15 App Router (JavaScript), Cloudflare Pages + D1.

## 开发命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | Build + 启动 wrangler Pages 开发服务器 (端口 8788) |
| `npm run lint` | ESLint 9 flat config (无需参数) |
| `npm run pages:deploy` | 构建 + 部署到 Cloudflare Pages |
| `npx wrangler d1 migrations apply jd --local` | 本地 D1 迁移 |
| `npx wrangler d1 migrations apply jd --remote` | 远程 D1 迁移 |
| `npx wrangler d1 execute jd --local --command="SQL"` | 本地 D1 直接 SQL 查询 |

无测试套件。

## 架构要点

- **单包项目**，无 monorepo。入口 `src/app/page.js`（业务选择页：京东万商 / 食堂商城）。路由: `/jd-business`, `/canteen-purchase`, `/suppliers`, `/products`, `/brands`, `/invoice`, `/invoice-history`, `/purchase`, `/canteen-invoice`, `/login`
- **API Routes** (`src/app/api/*/route.js`) — 每个文件**第一行**加 `export const runtime = "edge"`，然后 `import { getRequestContext } from "@cloudflare/next-on-pages"` 获取 `env.DB` (D1)
- **UI**: shadcn/ui New York 风格 + Tailwind CSS + Lucide 图标。使用语义化 CSS 变量 (`bg-card`, `text-foreground`)，不要硬编码颜色
- **状态管理**: 3 个 React Context — `SettlementContext` (useReducer), `InvoiceContext`, `AuthContext`。禁止直接修改 context state，始终用提供的 action/setter
- **无 TypeScript** — 所有代码为 `.js`/`.jsx`；`@/*` -> `src/*`
- **Node.js**: 24.14.1 (Volta 管理)

## 关键编码规范

- **`"use client"`** 必须加在所有需要浏览器 API 的组件文件顶部
- **金额计算**必须用 `Decimal.js`。先用 `cleanAmountString(value)` 去货币符号/千分符，再 `new Decimal()` 运算。不要用 `cleanAmount()`（内部用 `parseFloat`，有精度损失）
- **金额显示**用 `formatAmountJSX(value)` 返回带语义颜色的 `<span>`；`formatAmount(value)` 返回纯文本字符串
- **商品编号**必须调 `cleanProductCode()` 处理 Excel 的 `="..."` 前缀，确保为字符串格式
- **登录**: 简单密码保护，默认密码 `qingyun2026`，可通过环境变量 `AUTH_PASSWORD` 覆盖
- **D1 迁移文件**在 `migrations/` 目录，命名格式 `{序号}_{描述}.sql`
