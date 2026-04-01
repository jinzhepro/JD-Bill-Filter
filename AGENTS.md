# AGENTS.md - AI Agent 开发指南

## 1. 项目概述

**项目名称**: 京东单据处理系统 (JD Bill Filter)

**技术栈**:
- **框架**: Next.js 16.0.10 (App Router)
- **语言**: JavaScript (无 TypeScript)
- **样式**: Tailwind CSS 3.4.18 + shadcn/ui (New York style)
- **UI 组件**: shadcn/ui + Radix UI
- **工具库**: Decimal.js, ExcelJS, Lucide React, Tesseract.js

**项目用途**: 京东对帐单处理系统，支持 Excel/CSV 导入、智能订单合并、结算单处理和供应商转换。

---

## 2. 构建与运行命令

### 核心命令
```bash
npm run dev      # 开发服务器
npm run build    # 生产构建
npm start        # 启动生产服务器
npm run lint     # 代码检查
```

### 测试命令
**注意**: 项目当前未配置测试框架。推荐安装 Vitest + Testing Library：
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @vitejs/plugin-react jsdom
npm run test                    # 运行所有测试
npm run test -- path/to/test.js # 运行单个测试
```

---

## 3. 项目结构

```
src/
├── app/                    # Next.js App Router 页面
│   ├── page.js            # 首页（结算单处理）
│   ├── suppliers/         # 供应商转换页面
│   ├── layout.js          # 根布局
│   └── globals.css        # 全局样式
├── components/            # React 组件
│   ├── ui/               # shadcn/ui 基础组件
│   └── [业务组件].js      # 业务组件
├── context/              # React Context 状态管理
│   ├── SettlementContext.js  # 核心状态管理
│   └── SupplierContext.js    # 供应商状态
├── lib/                  # 核心业务逻辑
│   ├── utils.js          # 工具函数（cn, cleanAmount, cleanProductCode）
│   ├── settlementProcessor.js
│   ├── excelHandler.js
│   └── constants.js
├── data/                 # 静态数据
└── hooks/                # 自定义 Hooks
```

---

## 4. 代码风格规范

### 4.1 组件规范
- **客户端组件**: 所有使用 React hooks 的组件必须以 `"use client"` 开头
- **服务端组件**: 默认是服务端组件
- **组件导出**: 使用默认导出 `export default function ComponentName()`

### 4.2 导入顺序
```javascript
// 1. React
import React, { useState, useEffect } from "react";

// 2. 第三方库
import Decimal from "decimal.js";
import ExcelJS from "exceljs";

// 3. 项目内部（使用 @/ 别名）
import { useSettlement } from "@/context/SettlementContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// 4. 相对路径
import { MyComponent } from "./MyComponent";
```

### 4.3 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 组件 | PascalCase | `SettlementContent.js` |
| 函数/变量 | camelCase | `processSettlementData` |
| 常量 | UPPER_SNAKE_CASE | `MAX_FILE_SIZE` |
| Context | PascalCase + Context | `SettlementContext.js` |
| Hook | use + PascalCase | `useSettlement` |

### 4.4 类型处理
项目使用 JavaScript，通过 JSDoc 进行类型注释。

### 4.5 样式规范
- 使用 shadcn/ui 的语义化 CSS 变量（如 `bg-card`, `text-foreground`）
- 避免使用自定义颜色类名（如 `bg-white`, `text-gray-800`）

### 4.6 错误处理
所有异步操作使用 try-catch，通过 Context 的 `setError` 和 `addLog` 记录错误。

### 4.7 State 管理规范
**CRITICAL**: 永远不要直接修改 state，始终使用 Context actions（如 `setData()`）。

---

## 5. 重要配置

**jsconfig.json**: `@/*` 映射到 `./src/*`

**eslint.config.mjs**: 使用 `eslint-config-next`，忽略 `.next/`, `out/`, `build/`

---

## 6. 核心规则

### 6.1 性能优化
- 使用 `useMemo` 缓存计算结果，`useCallback` 缓存回调函数
- Context value 使用 `useMemo` 包装

### 6.2 安全限制
- 文件大小限制：50MB
- 支持文件类型：.xlsx, .xls, .csv
- 无数据库依赖，数据仅在内存中处理

### 6.3 核心规则（必须遵守）
- **永远不要直接修改 state**，始终使用 Context actions
- **SettlementContext 是主要的状态管理 Context**
- 所有客户端组件必须以 `"use client"` 开头
- **商品编号必须强制转换为字符串**，防止 Excel 自动转换为数字

### 6.4 兼容性
- Node.js 18+, React 19.2.0

---

## 7. 项目依赖

**核心**: next: 16.0.10, react: 19.2.0, tailwindcss: 3.4.18

**业务**: decimal.js, exceljs, tesseract.js, @radix-ui/*, lucide-react

**开发**: eslint, eslint-config-next, tailwind-merge, clsx

---

## 8. 测试指南

**当前状态**: 项目未配置测试框架，所有功能通过手动测试验证。

**推荐配置**:
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @vitejs/plugin-react jsdom
```

**运行单测**: `npm run test -- path/to/test.js`
