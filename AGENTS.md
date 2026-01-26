# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Build/Lint/Test Commands

```bash
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint with core-web-vitals preset
```

## Project Overview

- **Framework**: Next.js 16.0.10 (App Router)
- **Language**: JavaScript (no TypeScript)
- **UI Library**: shadcn/ui with Tailwind CSS
- **Key Libraries**: Decimal.js (math), ExcelJS (file I/O)
- **Path Alias**: `@/` → `./src/`

## Code Style Guidelines

### File Structure
```
src/
├── app/              # Next.js App Router pages
├── components/       # React components (ui/ base, feature components)
├── context/         # React Context state management
├── lib/             # Business logic, utilities, processors
├── hooks/           # Custom React hooks
├── types/           # Type constants/enums
└── data/            # Static data
```

### Import Order
```javascript
// 1. React
import React, { useState, useEffect } from "react";

// 2. Third-party libraries
import Decimal from "decimal.js";
import ExcelJS from "exceljs";

// 3. Project internal (use @/ alias)
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// 4. Relative paths
import { MyComponent } from "./MyComponent";
```

### Component Conventions
**Client Components** must start with `"use client"`:
```javascript
"use client";
import React from "react";
import { Button } from "@/components/ui/button";

export function MyComponent({ prop }) {
  return <Button>{prop}</Button>;
}
```

**Naming**:
- Files/Components: PascalCase (`MyComponent.js`)
- Hooks: camelCase with `use` prefix (`useApp`)
- Utils: camelCase (`cn`)

### State Management (React Context)
**Pattern**: useReducer with ActionTypes constants
```javascript
const ActionTypes = {
  SET_DATA: "SET_DATA",
  ADD_LOG: "ADD_LOG",
  RESET: "RESET",
};

function reducer(state, action) {
  switch (action.type) {
    case ActionTypes.SET_DATA:
      return { ...state, data: action.payload };
    default:
      return state;
  }
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
```

**CRITICAL**: Never directly mutate state. Always use Context actions.

### Numeric Calculations (Decimal.js)
**Mandatory**: All financial calculations use Decimal.js
```javascript
import Decimal from "decimal.js";

function cleanNumber(value) {
  if (typeof value === "string") {
    return parseFloat(value.replace(/[^0-9.-]/g, "")) || 0;
  }
  return value;
}

const amount = new Decimal(cleanNumber(value));
const total = amount.plus(new Decimal(10));
const displayValue = total.toNumber();
```

**Product codes must be strings** to prevent Excel auto-conversion:
```javascript
const productCode = String(row["商品编号"] || "");
```

### Error Handling
**Async operations**: Always use try-catch
```javascript
try {
  const result = await someAsyncOperation();
  // Process result
} catch (error) {
  console.error("操作失败:", error);
  setError(error.message);
}
```

**Console usage**:
- `console.error(...)` - For debugging errors
- `console.warn(...)` - Non-critical warnings
- `console.log(...)` - Minimal, only for debugging
- Always include context: `console.error("CSV文件读取失败:", error);`

### UI/Style Conventions
**Use shadcn/ui components**:
- Import from `@/components/ui/[component]`
- Use semantic CSS variables: `bg-card`, `text-foreground`, `border-border`
- Use `cn()` utility for class merging: `className={cn("base-class", className)}`

```javascript
// ✅ Correct - use semantic variables
<div className="bg-card text-foreground border-border" />

// ❌ Avoid - hardcode colors
<div className="bg-white text-gray-800 border-gray-200" />
```

**Components follow shadcn/ui patterns**:
- Use `class-variance-authority` (cva) for variants
- Forward refs with `React.memo(React.forwardRef(...))`
- Set `displayName` on components

### File Handling (Excel/CSV)
**CSV encoding**: Try UTF-8 first, fallback to GBK if no Chinese characters found.

**Excel numeric columns**:
- Set format to text: `numFmt: '@'` for product codes
- Set numeric format: `numFmt: '0.00'` for amounts

**Handle Excel formulas**: Check for `{ formula: '...', result: ... }` objects
```javascript
if (typeof value === 'object' && 'result' in value) {
  return value.result;
}
```

### Type Constants
Define in `src/types/index.js`:
```javascript
export const LogType = {
  INFO: "info",
  SUCCESS: "success",
  ERROR: "error",
  WARNING: "warning",
};
```

## Domain-Specific Rules

### 数值处理
- 必须使用 `decimal.js` 库进行所有数值计算，避免浮点数精度问题
- 金额计算必须使用 Decimal 类型，最后转换为数字显示
- 商品编号必须强制转换为字符串，防止 Excel 自动转换为数字
- 创建 Decimal 实例前必须清理字符串格式的数字：移除货币符号和逗号

### 文件处理
- CSV 文件必须先尝试 UTF-8 编码，失败后尝试 GBK 编码
- Excel 文件中的商品编号列必须设置为文本格式 (`numFmt: '@'`)
- 处理 Excel 中以 `="..."` 格式的商品编号，需要清理等号和引号

### 状态管理
- 所有状态更新必须通过 Context 的 actions，不能直接修改 state
- 文件上传错误必须触发 `resetOrder` action 清理相关状态
- 日志添加必须使用 `addLog` action，包含消息和类型

### 数据处理流程
- 订单处理：processAfterSalesData → processNonSalesOrders → processOrderWithAfterSales → mergeOrders → mergeSameSKU
- 结算单处理：验证数据结构 → 找到金额列 → 合并相同 SKU → 返回结果

## Configuration

**ESLint**: `eslint-config-next/core-web-vitals` with no custom overrides  
**Environment**: Node.js 18+, npm, React 19.2.0, Tailwind CSS v3.4.18  
**shadcn/ui**: New York style, JavaScript, semantic colors, Lucide icons  
**Next.js**: App Router enabled, strict mode, path alias `@/` → `./src/`  
**Tests**: No framework configured. Install Vitest + Testing Library to add tests.