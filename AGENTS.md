# JD-Bill-Filter

京东对账单处理系统 — Next.js 15 App Router, Cloudflare Pages + D1, JavaScript (无 TypeScript).

## 开发命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 构建 + 启动本地 wrangler Pages 开发服务器 (端口 8788) |
| `npm run build` | Next.js build (非 Pages 输出) |
| `npm run lint` | ESLint 9 flat config |
| `npm run pages:build` | `npx @cloudflare/next-on-pages` |
| `npm run pages:deploy` | 构建 + 部署到 Cloudflare Pages |
| `npx wrangler d1 migrations apply jd --local` | 本地 D1 迁移 |
| `npx wrangler d1 migrations apply jd --remote` | 远程 D1 迁移 |

无测试框架 — 项目没有测试套件。

## 架构要点

- **单包项目**，无 monorepo。入口 `src/app/page.js`（业务选择页），子路由：`/jd-business`（京东结算）、`/canteen-purchase`（食堂采购）、`/suppliers`、`/products`、`/brands`、`/invoice`、`/invoice-history`、`/purchase`
- **API Routes** 部署于 Cloudflare Edge Runtime — 每个 API 路由文件**第一行必须加** `export const runtime = "edge"`，然后通过 `import { getRequestContext } from "@cloudflare/next-on-pages"` 获取 `env.DB` (D1)
- **UI 组件库**: shadcn/ui New York 风格 + Tailwind CSS + Lucide 图标。使用语义化 CSS 变量 (`bg-card`, `text-foreground`)，不要硬编码颜色
- **无 TypeScript** — 所有代码为 `.js`/`.jsx`；`jsconfig.json` 设 `@/*` -> `src/*`

## 关键编码规范

- **`"use client"`** 必须加在所有需要浏览器 API 的组件文件顶部
- **金额计算**必须用 `Decimal.js`。先用 `cleanAmountString(value)` 去货币符号/千分符，再 `new Decimal()` 运算。不要用 `cleanAmount()`（内部用 `parseFloat`，有精度损失）
- **商品编号**必须调 `cleanProductCode()` 处理 Excel 的 `="..."` 前缀，确保为字符串格式
- **Context state** 禁止直接修改 — 始终用 Context 提供的 action/setter（如 `setProcessedData(newData)`）
- **登录**: 简单密码保护，默认密码 `qingyun2026`，可通过环境变量 `AUTH_PASSWORD` 覆盖
- **D1 迁移文件**在 `migrations/` 目录，命名格式 `{序号}_{描述}.sql`
