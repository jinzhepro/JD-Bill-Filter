# JD-Bill-Filter 项目文档

## 项目概述

京东万商系统是一个基于 Next.js 16 的企业级对帐单处理系统，用于处理京东平台的订单、结算单和供应商信息管理。系统支持 Excel/CSV 文件导入、智能订单合并、供应商转换等功能。

### 核心功能

1. **对帐单处理** - 导入 Excel/CSV 对帐单，自动合并相同商品编号和单价的记录
2. **结算单处理** - 合并相同 SKU 的应结金额，支持批量文件处理
3. **供应商转换** - 根据匹配字符串自动识别并转换供应商信息

### 技术栈

- **框架**: Next.js 16 (App Router)
- **前端**: React 19
- **样式**: Tailwind CSS 3.4 + shadcn/ui
- **UI 组件**: Radix UI
- **数据处理**: xlsx (Excel), Decimal.js (高精度计算)
- **状态管理**: React Context + useReducer
- **认证**: bcrypt

## 快速开始

### 环境要求

- Node.js 18+

### 安装依赖

```bash
npm install
```

### 配置环境变量

创建 `.env.local` 文件：

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=jd_bill_filter
JWT_SECRET=your_jwt_secret_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
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
│   │   ├── ResultDisplay.js  # 结果展示
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
│   │   └── utils.js          # 工具函数
│   ├── data/                 # 静态数据
│   │   ├── suppliers.js      # 供应商数据
│   │   └── jdSkuMapping.js   # 京东 SKU 映射
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

1. **数据验证** - 检查必需列（订单编号、单据类型、费用项、商品编号、商品名称、商品数量、金额）
2. **售后服务单处理** - 合并相同商品编号的售后金额，从对应订单中扣除
3. **非销售单处理** - 特殊处理非销售单金额
4. **订单合并** - 按订单编号分组，合并货款和直营服务费
5. **SKU 合并** - 相同商品编号和单价的记录合并金额和数量

### 结算单处理流程 (`src/lib/settlementProcessor.js`)

1. 验证结算单数据结构
2. 按商品编号合并应结金额
3. 支持批量文件处理和自动合并

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

## 供应商数据管理

供应商数据存储在 `src/data/suppliers.js` 文件中，包含：

- `name` - 供应商名称
- `supplierId` - 供应商 ID
- `matchString` - 匹配字符串（用于自动识别）

供应商转换功能会根据匹配字符串自动识别文本中的供应商信息。

## 安全注意事项

- 密码使用 bcrypt 加密存储
- 敏感操作需要用户认证
- 文件大小限制（50MB）
- 支持的文件类型验证（.xlsx, .xls, .csv）

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

核心数据处理逻辑在 `src/lib/dataProcessor.js` 和 `src/lib/settlementProcessor.js` 中。

### 如何添加新的 UI 组件？

使用 shadcn/ui CLI 添加新组件：

```bash
npx shadcn@latest add [component-name]
```

或在 `src/components/ui/` 目录下手动创建新组件，基于 Radix UI 进行封装。

## 依赖管理

主要依赖：

- `next` - Next.js 框架
- `react` / `react-dom` - React 库
- `tailwindcss` - CSS 框架
- `xlsx` - Excel 文件处理
- `decimal.js` - 高精度数学计算
- `@radix-ui/*` - UI 组件库
- `bcrypt` - 密码加密
- `uuid` - 唯一 ID 生成
- `class-variance-authority` - 组件变体管理
- `clsx` / `tailwind-merge` - 类名合并工具

## 版本信息

- 当前版本: 0.1.0
- Next.js: 16.0.10
- React: 19.2.0
- Node.js: 18+