# JD-Bill-Filter 项目文档

## 项目概述

京东单据处理系统是一个基于 Next.js 16 的企业级对帐单处理系统，用于处理京东平台的订单、结算单和供应商信息管理。系统支持 Excel/CSV 文件导入、智能订单合并、供应商转换等功能。

### 核心功能

1. **对帐单处理** - 导入 Excel/CSV 对帐单，自动合并相同商品编号和单价的记录
2. **结算单处理** - 合并相同 SKU 的应结金额，支持批量文件处理
3. **供应商转换** - 根据匹配字符串自动识别并转换供应商信息

### 技术栈

- **框架**: Next.js 16 (App Router)
- **前端**: React 19
- **样式**: Tailwind CSS 3.4 + shadcn/ui
- **UI 组件**: Radix UI
- **数据处理**: exceljs (Excel), Decimal.js (高精度计算)
- **状态管理**: React Context + useReducer
- **图标**: Lucide React

## 快速开始

### 环境要求

- Node.js 18+

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 构建生产版本

```bash
npm run build
npm start
```

### 代码检查

```bash
npm run lint
```

## 项目结构

```
JD-Bill-Filter/
├── src/
│   ├── app/                    # Next.js App Router 页面
│   │   ├── page.js            # 首页（对帐单处理）
│   │   ├── settlement/        # 结算单处理页面
│   │   ├── suppliers/         # 供应商转换页面
│   │   ├── layout.js          # 根布局
│   │   └── globals.css        # 全局样式（shadcn/ui）
│   ├── components/            # React 组件
│   │   ├── ui/               # shadcn/ui 基础组件
│   │   ├── AppContent.js     # 对帐单处理主内容
│   │   ├── Sidebar.js        # 侧边栏导航
│   │   ├── SupplierManager.js # 供应商管理
│   │   ├── FolderUpload.js   # 文件夹上传
│   │   ├── FileUploader.js   # 文件上传
│   │   ├── ResultDisplay.js  # 结果展示
│   │   ├── DataDisplay.js    # 数据展示
│   │   ├── ErrorBoundary.js  # 错误边界
│   │   ├── SettlementContent.js # 结算单内容
│   │   ├── SettlementFolderUpload.js # 结算单文件夹上传
│   │   ├── SettlementResultDisplay.js # 结算单结果展示
│   │   └── MainLayout.js     # 主布局
│   ├── context/              # React Context 状态管理
│   │   ├── AppContext.js     # 全局应用状态
│   │   └── SupplierContext.js # 供应商状态
│   ├── lib/                  # 核心业务逻辑
│   │   ├── dataProcessor.js  # 对帐单数据处理（订单合并、SKU 匹配）
│   │   ├── settlementProcessor.js # 结算单数据处理
│   │   ├── excelHandler.js   # Excel 文件处理
│   │   ├── fileValidation.js # 文件验证
│   │   ├── orderProcessor.js # 订单处理逻辑
│   │   └── utils.js          # 工具函数
│   ├── data/                 # 静态数据
│   │   └── suppliers.js      # 供应商数据
│   ├── hooks/                # 自定义 Hooks
│   │   └── use-toast.js      # Toast 提示
│   └── types/                # 类型定义
│       └── index.js
├── public/                   # 静态资源
├── package.json
├── tailwind.config.js        # Tailwind 配置
├── next.config.mjs           # Next.js 配置
├── components.json           # shadcn/ui 配置
└── eslint.config.mjs         # ESLint 配置
```

## 核心数据处理流程

### 对帐单处理流程 (`src/lib/dataProcessor.js`)

```
文件夹上传 → 数据解析 → 订单合并 → SKU合并 → 结果导出
```

#### 详细流程

1. **数据验证** - 检查必需列（订单编号、单据类型、费用项、商品编号、商品名称、商品数量、金额）
2. **售后服务单处理** - 合并相同商品编号的售后金额，从对应订单中扣除
3. **非销售单处理** - 特殊处理非销售单金额
4. **订单合并** - 按订单编号分组，合并货款和直营服务费
5. **SKU 合并** - 相同商品编号和单价的记录合并金额和数量

#### 订单处理模块 (`src/lib/orderProcessor.js`)

- `processAfterSalesData()` - 处理售后服务单数据，合并相同商品编号的售后金额
- `processNonSalesOrders()` - 处理非销售单金额逻辑
- `processOrderWithAfterSales()` - 处理订单数据并扣除售后服务单金额
- `mergeOrders()` - 合并订单数据，按订单编号分组
- `mergeSameSKU()` - 合并相同商品编号的记录
- `processOrderData()` - 主订单处理函数，执行完整的订单处理流程

### 结算单处理流程 (`src/lib/settlementProcessor.js`)

1. 验证结算单数据结构
2. 按商品编号合并应结金额
3. 支持批量文件处理和自动合并

### 文件验证模块 (`src/lib/fileValidation.js`)

- `isValidFileExtension()` - 验证文件扩展名是否有效
- `isValidFileSize()` - 验证文件大小是否在限制范围内（默认 50MB）
- `getFileType()` - 从文件名中提取文件类型
- `filterValidFiles()` - 过滤有效文件
- `getFileKey()` - 生成文件唯一标识
- `validateFile()` - 综合验证文件

### Excel 处理模块 (`src/lib/excelHandler.js`)

使用 exceljs 库处理 Excel 文件的读取和写入：
- 支持读取 .xlsx、.xls、.csv 格式
- 自动识别表头和数据行
- 支持批量文件处理
- 支持导出处理结果为 Excel 文件

## 开发规范

### 代码风格

- 使用 ESLint 进行代码检查
- 遵循 React 19 最佳实践
- 所有客户端组件必须以 `"use client"` 开头
- 使用 shadcn/ui 组件库，遵循其设计规范

### 导入顺序

```javascript
// 1. React
import React, { useState, useEffect } from "react";

// 2. 第三方库
import Decimal from "decimal.js";
import ExcelJS from "exceljs";

// 3. 项目内部（使用 @/ 别名）
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";

// 4. 相对路径
import { MyComponent } from "./MyComponent";
```

### 金额计算规范

```javascript
// 始终使用 Decimal.js 避免浮点数精度问题
import Decimal from "decimal.js";

const amount1 = new Decimal("100.50");
const amount2 = new Decimal("50.25");
const total = amount1.plus(amount2); // 150.75
```

### 错误处理规范

```javascript
// 所有异步操作使用 try-catch
try {
  const result = await someAsyncOperation();
  // 处理结果
} catch (error) {
  console.error("操作失败:", error);
  // 显示用户友好的错误信息
}
```

### Context 使用规范

```javascript
// 使用自定义 Hook 访问 Context
import { useApp } from "@/context/AppContext";

function MyComponent() {
  const { processedData, setProcessedData, addLog } = useApp();
  // ...
}
```

### 样式规范

- 使用 shadcn/ui 的语义化 CSS 变量
- 避免使用自定义颜色类名
- 使用 Tailwind 的工具类和 shadcn/ui 的组件变体

```javascript
// ✅ 推荐 - 使用 shadcn/ui 语义化类名
<div className="bg-card text-foreground border-border" />

// ❌ 避免 - 使用自定义颜色
<div className="bg-white text-gray-800 border-gray-200" />
```

### 文件验证规范

```javascript
// 使用 fileValidation 模块进行文件验证
import { validateFile } from "@/lib/fileValidation";

try {
  validateFile(file, 50 * 1024 * 1024); // 50MB 限制
  // 处理文件
} catch (error) {
  console.error("文件验证失败:", error.message);
}
```

## 供应商数据管理

供应商数据存储在 `src/data/suppliers.js` 文件中，包含：

- `name` - 供应商名称
- `supplierId` - 供应商 ID
- `matchString` - 匹配字符串（用于自动识别）

供应商转换功能会根据匹配字符串自动识别文本中的供应商信息。

## 安全注意事项

- 文件大小限制（50MB）
- 支持的文件类型验证（.xlsx, .xls, .csv）
- 使用 ErrorBoundary 组件捕获运行时错误

## 常见问题

### 如何添加新的供应商？

编辑 `src/data/suppliers.js` 文件，添加新的供应商对象：

```javascript
{
  id: "supplier-xxx",
  name: "供应商名称",
  supplierId: "supplier_id",
  matchString: "匹配字符串"
}
```

### 如何修改数据处理逻辑？

核心数据处理逻辑在以下文件中：
- `src/lib/dataProcessor.js` - 对帐单数据处理
- `src/lib/settlementProcessor.js` - 结算单数据处理
- `src/lib/orderProcessor.js` - 订单处理逻辑
- `src/lib/fileValidation.js` - 文件验证逻辑

### 如何添加新的 UI 组件？

使用 shadcn/ui CLI 添加新组件：

```bash
npx shadcn@latest add [component-name]
```

或在 `src/components/ui/` 目录下手动创建新组件，基于 Radix UI 进行封装。

### 如何修改文件大小限制？

在 `src/lib/fileValidation.js` 中修改默认的文件大小限制：

```javascript
// 默认 50MB，可以根据需要调整
const maxSize = 50 * 1024 * 1024;
```

## 依赖管理

### 主要依赖

- `next` - Next.js 框架 (16.0.10)
- `react` / `react-dom` - React 库 (19.2.0)
- `tailwindcss` - CSS 框架 (3.4.18)
- `exceljs` - Excel 文件处理 (4.4.0)
- `decimal.js` - 高精度数学计算 (10.6.0)
- `@radix-ui/*` - UI 组件库
  - `@radix-ui/react-checkbox` - 复选框组件
  - `@radix-ui/react-dialog` - 对话框组件
  - `@radix-ui/react-select` - 选择器组件
  - `@radix-ui/react-toast` - Toast 提示组件
  - `@radix-ui/react-slot` - 插槽组件
- `lucide-react` - 图标库 (0.562.0)

### 开发依赖

- `class-variance-authority` - 组件变体管理
- `clsx` - 类名合并工具
- `tailwind-merge` - Tailwind 类名合并
- `tailwindcss-animate` - Tailwind 动画
- `eslint` - 代码检查
- `eslint-config-next` - Next.js ESLint 配置

## 架构说明

### 模块化设计

项目采用模块化设计，将核心功能拆分为独立的模块：

- **dataProcessor.js** - 数据处理入口，协调整个处理流程
- **orderProcessor.js** - 订单处理逻辑，包括售后单、非销售单处理
- **settlementProcessor.js** - 结算单处理逻辑
- **excelHandler.js** - Excel 文件的读写操作
- **fileValidation.js** - 文件验证逻辑
- **utils.js** - 通用工具函数

### 状态管理

使用 React Context API 进行状态管理：

- **AppContext** - 全局应用状态（处理数据、日志等）
- **SupplierContext** - 供应商数据状态

### 错误处理

- 使用 ErrorBoundary 组件捕获 React 组件树中的错误
- 在异步操作中使用 try-catch 进行错误处理
- 提供用户友好的错误提示

## 版本信息

- 当前版本: 0.1.0
- Next.js: 16.0.10
- React: 19.2.0
- Node.js: 18+

## 更新日志

### 最近更新

- ✅ 从 xlsx 迁移到 exceljs 库
- ✅ 移除未使用的依赖（bcrypt、mysql2、pdfjs-dist、uuid）
- ✅ 新增文件验证模块（fileValidation.js）
- ✅ 新增订单处理模块（orderProcessor.js）
- ✅ 新增通用文件上传组件（FileUploader.js）
- ✅ 新增数据展示组件（DataDisplay.js）
- ✅ 新增错误边界组件（ErrorBoundary.js）
- ✅ 移除京东 SKU 映射功能
- ✅ 更新项目名称为"京东单据处理系统"
- ✅ 优化代码结构和模块划分