# AGENTS.md

本文件为 AI Agent 提供代码库规范指南。

## 项目概览

京东单据处理系统 (JD Bill Filter) - 基于 Next.js 16 + React 19 的结算单处理应用。使用 Tailwind CSS + shadcn/ui 构建界面，Decimal.js 处理高精度金额计算，Web Workers 处理 Excel 文件解析。

## 构建、Lint 和测试命令

```bash
npm run dev              # 启动开发服务器 http://localhost:3000
npm run build            # 构建生产版本（自动运行 ESLint）
npm run start            # 启动生产服务器
npm run lint             # 运行 ESLint 检查整个项目
npx eslint src/file.js   # 检查单个文件
```

**注意**: 本项目目前未配置测试框架。如需测试，推荐安装 Vitest + Testing Library。

## 代码风格指南

### 通用原则

- **语言**: 所有代码使用 JavaScript（非 TypeScript）
- **国际化**: 用户界面文本和注释使用中文
- **文档**: 函数必须添加 JSDoc 注释说明用途、参数和返回值
- **函数长度**: 保持函数精简，尽量不超过 50 行
- **嵌套**: 使用提前返回减少嵌套层级
- **组件优化**: 使用 `React.memo` 和 `React.forwardRef` 优化性能

### 导入顺序

1. React/Next.js → 2. 第三方库 → 3. Context → 4. UI 组件 → 5. Hooks → 6. 工具函数/常量 → 7. 类型定义

```javascript
import React, { useState, useReducer } from "react";
import Decimal from "decimal.js";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { cn, cleanAmount } from "@/lib/utils";
import { LogType } from "@/types";
```

### 格式化规范

- **缩进**: 2 个空格 | **引号**: 双引号 | **分号**: 必须使用 | **尾随逗号**: 多行对象/数组使用 | **最大行长度**: 100 字符

### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 组件 | PascalCase | `SettlementProcessor`, `DataTable` |
| Hooks | camelCase，use 前缀 | `useSettlement`, `useLocalStorage` |
| 变量/函数 | camelCase | `processedData`, `cleanAmount` |
| 常量 | UPPER_SNAKE_CASE | `MAX_FILE_SIZE`, `SETTLEMENT_COLUMNS` |
| 文件 | 组件用 PascalCase，其他用 camelCase | `Button.js`, `settlementProcessor.js` |

### JavaScript 规范

- 使用 JSDoc 添加类型注释
- 避免使用 `any`，需要时用 `unknown`
- 可选属性使用 `?` 标记
- 所有客户端组件必须以 `"use client"` 开头
- 使用 `useReducer` 管理复杂状态，避免多个 `useState`

### Tailwind CSS 规范

- 使用 `cn()` 工具合并类名（基于 clsx + tailwind-merge）
- **必须使用语义化颜色变量**，禁止硬编码颜色

```jsx
import { cn } from "@/lib/utils";
<div className={cn("bg-card text-foreground border-border rounded-lg p-4", className)} />
```

### 组件模式

```javascript
"use client";
import React, { forwardRef, memo } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

const Button = memo(forwardRef(({ className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp ref={ref} className={cn("btn-base", className)} {...props} />;
}));
Button.displayName = "Button";
export { Button };
```

### Context + useReducer 模式

```javascript
"use client";
import { createContext, useContext, useReducer, useCallback } from "react";

const initialState = { data: [], isLoading: false, error: null };
const ActionTypes = { SET_DATA: "SET_DATA", SET_LOADING: "SET_LOADING", RESET: "RESET" };

function reducer(state, action) {
  switch (action.type) {
    case ActionTypes.SET_DATA: return { ...state, data: action.payload };
    case ActionTypes.SET_LOADING: return { ...state, isLoading: action.payload };
    case ActionTypes.RESET: return initialState;
    default: return state;
  }
}

const AppContext = createContext();

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const actions = {
    setData: useCallback((data) => dispatch({ type: ActionTypes.SET_DATA, payload: data }), []),
    setLoading: useCallback((loading) => dispatch({ type: ActionTypes.SET_LOADING, payload: loading }), []),
    reset: useCallback(() => dispatch({ type: ActionTypes.RESET }), []),
  };
  return <AppContext.Provider value={{ ...state, ...actions }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within an AppProvider");
  return context;
}
```

### 金额计算规范

**必须使用 Decimal.js 避免浮点数精度问题**

```javascript
import Decimal from "decimal.js";
import { cleanAmount } from "@/lib/utils";

const cleanValue = cleanAmount("¥1,234.56");
const amount = new Decimal(cleanValue);
const total = amount.plus(new Decimal(100));
const result = total.toNumber();
```

### 商品编号处理规范

**商品编号必须强制转为字符串，防止 Excel 自动转数字**

```javascript
const productCode = String(row["商品编号"] || "");
const cleanCode = cleanProductCode('="123456"'); // "123456"
```

### 错误处理规范

```javascript
try {
  const result = await processExcelFile(file);
  addLog("处理完成", LogType.SUCCESS);
} catch (error) {
  console.error("Excel 处理失败:", error);
  addLog(`文件处理失败：${error.message}`, LogType.ERROR);
  setError(error.message);
}
```

## 文件处理规范

- **文件大小限制**: 50MB
- **支持格式**: .xlsx, .xls, .csv
- **CSV 编码**: 先尝试 UTF-8，失败后尝试 GBK
- **商品编号**: 必须强制转为字符串，防止 Excel 自动转数字
- **Excel 导出**: 商品编号列设置文本格式 `numFmt: '@'`

## 项目结构

```
src/
├── app/          # Next.js App Router
├── components/   # React 组件 (ui/, feature components)
├── context/      # React Context
├── hooks/        # 自定义 Hooks
├── lib/          # 工具函数和业务逻辑
├── data/         # 静态数据
├── types/        # 类型定义（JSDoc）
└── workers/      # Web Workers
```

## 关键技术栈

- **框架**: Next.js 16.0.10 (App Router)
- **UI**: React 19.2.0 + Tailwind CSS 3.4.18 + shadcn/ui
- **组件库**: Radix UI (Dialog, Select, Checkbox, Toast, Slot)
- **计算**: Decimal.js (高精度数学)
- **Excel**: ExcelJS
- **图标**: Lucide React
- **Lint**: ESLint 9 (Flat Config)
- **状态管理**: React Context + useReducer
