# AGENTS.md - AI Agent 开发指南

## 1. 项目概述

**项目名称**: 京东单据处理系统 (JD Bill Filter)

**技术栈**:
- **框架**: Next.js 16.0.10 (App Router)
- **语言**: JavaScript (无 TypeScript)
- **样式**: Tailwind CSS 3.4.18 + shadcn/ui (New York style)
- **UI 组件**: shadcn/ui + Radix UI
- **工具库**: Decimal.js (高精度计算), ExcelJS (Excel处理), Lucide React (图标), Tesseract.js (OCR)

**项目用途**: 基于 Next.js 的京东对帐单处理系统，支持 Excel/CSV 文件导入、智能订单合并、结算单处理和供应商转换等功能。

---

## 2. 构建与运行命令

### 核心命令
```bash
# 开发服务器
npm run dev

# 生产构建
npm run build

# 启动生产服务器
npm start

# 代码检查
npm run lint
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
│   ├── SettlementContext.js
│   └── SupplierContext.js
├── lib/                  # 核心业务逻辑
│   ├── utils.js          # 工具函数
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
- **服务端组件**: 默认是服务端组件，不需要标记
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
项目使用 JavaScript，通过 JSDoc 进行类型注释：
```javascript
/**
 * 处理结算单数据
 * @param {Array} data - 原始数据
 * @param {Object} options - 处理选项
 * @returns {Array} 处理后的数据
 */
function processSettlementData(data, options) {
  // ...
}
```

### 4.5 样式规范
- 使用 shadcn/ui 的语义化 CSS 变量
- 避免使用自定义颜色类名
- 使用 Tailwind 的工具类和 shadcn/ui 的组件变体

```javascript
// ✅ 推荐 - 使用 shadcn/ui 语义化类名
<div className="bg-card text-foreground border-border" />

// ❌ 避免 - 使用自定义颜色
<div className="bg-white text-gray-800 border-gray-200" />
```

### 4.6 错误处理
```javascript
// 所有异步操作使用 try-catch
try {
  const result = await someAsyncOperation();
  // 处理结果
} catch (error) {
  console.error("操作失败:", error);
  setError(error.message);
}
```

---

## 5. 常用代码片段

### 5.1 Context 使用
```javascript
"use client";

import { useSettlement } from "@/context/SettlementContext";

function MyComponent() {
  const { processedData, setProcessedData, addLog } = useSettlement();
  // ...
}
```

### 5.2 金额计算（使用 Decimal.js）
```javascript
import Decimal from "decimal.js";

// 始终使用 Decimal.js 避免浮点数精度问题
const amount = new Decimal(cleanNumber(value));
const total = amount.plus(new Decimal(10));
const displayValue = total.toNumber();
```

### 5.3 商品编号处理
```javascript
// 商品编号必须强制转换为字符串，防止 Excel 自动转换为数字
const productCode = String(row["商品编号"] || "");
```

### 5.4 Toast 提示
```javascript
import { useToast } from "@/hooks/use-toast";

function MyComponent() {
  const { toast } = useToast();

  const handleAction = () => {
    toast({
      title: "成功",
      description: "操作已完成",
      variant: "default", // 或 "destructive"
    });
  };
}
```

### 5.5 文件处理
```javascript
// CSV 编码处理：先尝试 UTF-8，失败后尝试 GBK
// Excel 数字列：商品编号设置为文本格式 (numFmt: '@')
// Excel 公式：处理 { formula: '...', result: ... } 对象
```

---

## 6. 重要配置

### 6.1 jsconfig.json
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

## 7. 注意事项

### 7.1 性能
- 使用 `useMemo` 缓存计算结果
- 使用 `useCallback` 缓存回调函数
- Context 中使用 `useMemo` 优化 value 对象

### 7.2 安全
- 文件大小限制：50MB
- 支持的文件类型：.xlsx, .xls, .csv
- 文件扩展名验证
- 无数据库依赖，数据仅在内存中处理

### 7.3 兼容性
- Node.js 18+
- React 19.2.0
- 使用 `"use client"` 标记客户端组件

### 7.4 重要规则
- **永远不要直接修改 state**，始终使用 Context actions
- **SettlementContext 是主要的状态管理 Context**
- 所有客户端组件必须以 `"use client"` 开头
- 商品编号必须强制转换为字符串

---

## 8. 项目依赖

### 核心依赖
- next: 16.0.10
- react: 19.2.0
- react-dom: 19.2.0
- tailwindcss: 3.4.18

### 业务依赖
- decimal.js: 高精度数学计算
- exceljs: Excel 文件处理
- tesseract.js: OCR 文字识别
- @radix-ui/*: UI 组件底层

### 开发依赖
- eslint: 代码检查
- lucide-react: 图标库
- tailwind-merge: Tailwind 类名合并
- clsx: 条件类名处理