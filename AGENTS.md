# AGENTS.md - AI Agent 开发指南

本文档为 AI Agent 提供开发规范和代码风格指南。

## 1. 项目概述

- **项目名称**: JD Bill Filter (京东单据处理系统)
- **技术栈**: Next.js 16.0.10 + React 19 + JavaScript (无 TypeScript) + shadcn/ui + Tailwind CSS
- **状态管理**: React Context + useReducer
- **数值计算**: Decimal.js
- **文件处理**: ExcelJS

## 2. 构建与运行命令

### 核心命令

```bash
# 开发环境
npm run dev

# 生产构建
npm run build
npm start

# 代码检查
npm run lint
```

### 注意事项

- 本项目当前无测试框架 (README 建议使用 Vitest + Testing Library)
- 运行单文件 lint: `npx eslint src/path/to/file.js`
- ESLint 配置：使用 ESLint 9 扁平配置，基于 `eslint-config-next`

## 3. 代码风格规范

### 3.1 文件组织

```
src/
├── app/           # Next.js App Router 页面
├── components/   # React 组件
│   └── ui/       # shadcn/ui 基础组件
├── context/      # React Context 状态管理
├── lib/          # 核心业务逻辑
├── data/         # 静态数据
└── hooks/        # 自定义 Hooks
```

### 3.2 组件规范

- 客户端组件必须以 `"use client"` 开头
- 使用函数式组件 + hooks
- 使用 React.memo 优化重渲染
- 组件文件使用 PascalCase 命名 (如 `SettlementContent.js`)

### 3.3 导入顺序

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

### 3.4 命名规范

- **组件**: PascalCase (如 `SettlementContent`)
- **函数/变量**: camelCase (如 `cleanAmount`)
- **常量**: UPPER_SNAKE_CASE (如 `ActionTypes`)
- **Context Hook**: useXxx 格式 (如 `useSettlement`)

### 3.5 类型处理

- **商品编号**: 必须强制转换为字符串，防止 Excel 自动转换
  ```javascript
  const productCode = String(row["商品编号"] || "");
  ```
- **金额计算**: 必须使用 Decimal.js 避免浮点数精度问题
  ```javascript
  import Decimal from "decimal.js";
  const amount = new Decimal(cleanAmount(value));
  const total = amount.plus(new Decimal(10));
  ```

### 3.6 样式规范

- 使用 shadcn/ui 的语义化 CSS 变量
- 避免使用自定义颜色类名
- 使用 Tailwind 工具类

```javascript
// ✅ 推荐
<div className="bg-card text-foreground border-border" />

// ❌ 避免
<div className="bg-white text-gray-800 border-gray-200" />
```

### 3.7 错误处理

- 所有异步操作使用 try-catch
- 使用 logger.js 进行日志记录
- 组件使用 ErrorBoundary 包裹

```javascript
try {
  const result = await someAsyncOperation();
} catch (error) {
  logger.error("操作失败:", error);
  setError(error.message);
}
```

### 3.8 Context 使用规范

- 使用自定义 Hook 访问 Context
- 永远不要直接修改 state，始终使用 Context actions

```javascript
import { useSettlement } from "@/context/SettlementContext";

function MyComponent() {
  const { processedData, setProcessedData, addLog } = useSettlement();
}
```

### 3.9 文件处理规范

- **CSV 编码**: 先尝试 UTF-8，失败后尝试 GBK
- **Excel 数字列**: 商品编号设置为文本格式 (`numFmt: '@'`)
- **Excel 公式**: 处理 `{ formula: '...', result: ... }` 对象

## 4. 常用代码片段

### 创建新组件

```javascript
"use client";

import React from "react";

export function MyComponent() {
  return <div>组件内容</div>;
}
```

### 创建 Context

```javascript
"use client";

import { createContext, useContext, useReducer } from "react";

const MyContext = createContext();

export function MyProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  
  const value = React.useMemo(() => ({
    ...state,
  }), [state]);

  return <MyContext.Provider value={value}>{children}</MyContext.Provider>;
}

export function useMyContext() {
  const context = useContext(MyContext);
  if (!context) {
    throw new Error("useMyContext must be used within a MyProvider");
  }
  return context;
}
```

### 添加 utils 函数

```javascript
/**
 * 函数功能描述
 * @param {type} paramName - 参数说明
 * @returns {type} 返回值说明
 */
export function myUtil(paramName) {
  // 实现
}
```

## 5. 注意事项

- 所有组件和函数必须有中文注释说明功能
- 遵循 React 19 最佳实践
- 本项目暂无测试，修改前请仔细测试功能
- 使用 `npm run lint` 确保代码质量
