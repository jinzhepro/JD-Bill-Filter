# AGENTS.md - AI Agent 开发指南

本文档为 AI Agent 提供开发规范和代码风格指南。

## 1. 项目概述

- **项目名称**: JD Bill Filter (京东单据处理系统)
- **技术栈**: Next.js 16.0.10 + React 19 + JavaScript (无 TypeScript) + shadcn/ui + Tailwind CSS
- **状态管理**: React Context + useReducer
- **数值计算**: Decimal.js
- **文件处理**: ExcelJS
- **路径别名**: `@/*` → `./src/*`

## 2. 构建与运行命令

### 核心命令

```bash
# 开发环境（热重载）
npm run dev

# 生产构建
npm run build

# 生产运行
npm start

# 代码检查（全项目）
npm run lint
```

### 单文件检查

```bash
# 运行单文件 lint
npx eslint src/path/to/file.js

# 自动修复
npx eslint src/path/to/file.js --fix
```

### 测试命令

```bash
# ⚠️ 当前项目无测试框架
# 如需测试，建议安装 Vitest + Testing Library:
# npm install -D vitest @testing-library/react @testing-library/jest-dom
```

### ESLint 配置

- 使用 ESLint 9 扁平配置
- 基于 `eslint-config-next`
- 配置文件：`eslint.config.mjs`

### Cursor/Copilot 规则

当前项目无 Cursor rules (`.cursor/rules/` 或 `.cursorrules`) 或 Copilot rules (`.github/copilot-instructions.md`)

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

- **客户端组件**: 必须以 `"use client"` 开头
- **函数式组件**: 使用 hooks，不使用 class 组件
- **性能优化**: 使用 React.memo 优化重渲染
- **文件命名**: PascalCase (如 `SettlementContent.js`)
- **文件注释**: 所有文件顶部需有简短注释说明用途
- **Next.js 16**: 遵循 App Router 规范，页面位于 `src/app/` 目录

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

**注意**：
- 使用 `@/` 别名引用 `src/` 目录
- 组件导入使用具名导出
- 避免循环依赖

### 3.4 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 组件 | PascalCase | `SettlementContent` |
| 函数/变量 | camelCase | `cleanAmount` |
| 常量 | UPPER_SNAKE_CASE | `ActionTypes` |
| Context Hook | useXxx | `useSettlement` |

### 3.5 类型处理

**商品编号处理**（关键）：
```javascript
// 必须强制转换为字符串，防止 Excel 自动转换为科学计数法
const productCode = String(row["商品编号"] || "");
```

**金额计算规范**：
```javascript
import Decimal from "decimal.js";

const amount = new Decimal(cleanAmount(value));
const total = amount.plus(new Decimal(10));
const displayValue = total.toNumber();
```

### 3.6 样式规范

使用 shadcn/ui 语义化 CSS 变量：

```javascript
// ✅ 推荐
<div className="bg-card text-foreground border-border" />

// ❌ 避免
<div className="bg-white text-gray-800 border-gray-200" />
```

**工具函数**：
```javascript
import { cn } from "@/lib/utils";
<div className={cn("bg-card", className)} />
```

### 3.7 错误处理

```javascript
try {
  const result = await someAsyncOperation();
} catch (error) {
  logger.error("操作失败:", error);
  setError(error.message);
}
```

**规范**：
- 所有异步操作使用 try-catch
- 使用 `logger.js` 进行日志记录
- 组件使用 ErrorBoundary 包裹

### 3.8 Context 使用规范

**使用自定义 Hook 访问**：
```javascript
import { useSettlement } from "@/context/SettlementContext";

function MyComponent() {
  const { processedData, setProcessedData, addLog } = useSettlement();
}
```

**禁止直接修改 state**：
```javascript
// ❌ 错误
state.processedData.push(newItem);

// ✅ 正确
setProcessedData([...processedData, newItem]);
```

### 3.9 文件处理规范

| 场景 | 规范 |
|------|------|
| CSV 编码 | 先尝试 UTF-8，失败后尝试 GBK |
| Excel 数字列 | 商品编号设置为文本格式 (`numFmt: '@'`) |
| Excel 公式 | 处理 `{ formula: '...', result: ... }` 对象 |
| 文件大小 | 限制 50MB |
| 支持格式 | .xlsx, .xls, .csv |

### 3.10 数值处理工具

```javascript
// 清理金额（移除货币符号和千位分隔符）
cleanAmount("¥1,234.56") // 1234.56

// 清理商品编号（处理 Excel 自动添加的等号）
cleanProductCode('="123456"') // "123456"

// 格式化金额显示
formatAmount(1234.56) // "¥1,234.56"
formatAmount(-500, true) // "¥500.00"
```

## 4. 常用代码片段

### 创建新组件

```javascript
"use client";

import React from "react";

/**
 * 组件功能描述
 * @returns {JSX.Element} 组件元素
 */
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

## 5. 核心 Context 说明

### SettlementContext（主要）

**文件**: `src/context/SettlementContext.js`

**核心状态**：
- `uploadedFiles`: 上传的文件列表
- `originalData`: 原始结算单数据
- `processedData`: 处理后的数据
- `isProcessing`: 处理中状态
- `logs`: 处理日志
- `mergeMode`: 合并模式开关
- `mergedData`: 合并后的数据

**核心方法**：
- `setFile(file)`: 设置文件
- `setOriginalData(data)`: 设置原始数据
- `setProcessedData(data)`: 设置处理后的数据
- `addLog(message, type)`: 添加日志
- `setError(error)`: 设置错误

### SupplierContext

**文件**: `src/context/SupplierContext.js`

供应商转换相关的状态管理。

### ThemeContext

**文件**: `src/context/ThemeContext.js`

主题（深色/浅色模式）状态管理。

## 6. 注意事项

### 开发规范

- ✅ 所有组件和函数必须有中文注释
- ✅ 遵循 React 19 最佳实践
- ✅ 修改前仔细测试功能
- ✅ 使用 `npm run lint` 确保代码质量

### 业务逻辑

- ⚠️ 结算单处理只处理"货款"记录
- ⚠️ 相同 SKU 自动合并货款和数量
- ⚠️ 售后卖家赔付费按货款比例分摊
- ⚠️ 直营服务费按商品编号分组

### 安全限制

- ✅ 文件大小限制（50MB）
- ✅ 支持的文件类型验证
- ✅ 文件扩展名验证
- ⚠️ 生产环境建议添加身份验证

## 7. 调试技巧

### 日志查看

```javascript
import { logger } from "@/lib/logger";

logger.info("信息日志");
logger.error("错误日志");
```

### 状态调试

在组件中使用 `useSettlement()` 查看当前状态：

```javascript
const { processedData, logs } = useSettlement();
console.log("当前数据:", processedData);
console.log("处理日志:", logs);
```

## 8. 相关文档

- **README.md**: 用户文档
- **QWEN.md**: 英文项目上下文
- **package.json**: 依赖和脚本配置
- **eslint.config.mjs**: ESLint 配置
- **jsconfig.json**: 路径别名配置 (`@/*` → `./src/*`)
- **eslint.config.mjs**: ESLint 配置
