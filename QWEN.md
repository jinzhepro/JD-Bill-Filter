# JD-Bill-Filter 项目说明

## 项目概述

JD-Bill-Filter 是一个基于 Next.js 的京东对帐单处理系统，支持 Excel/CSV 文件导入、订单合并、库存管理和出库记录等功能。该项目旨在自动化处理京东的对账单数据，实现订单数据的合并、SKU 合并、库存管理以及出库记录等功能。

## 技术栈

- **框架**: Next.js 16 (App Router)
- **前端**: React 19
- **样式**: Tailwind CSS 3.4
- **UI 组件**: Radix UI
- **数据库**: MySQL + mysql2
- **Excel 处理**: xlsx
- **PDF 处理**: pdfjs-dist
- **数学计算**: Decimal.js
- **状态管理**: React Context + useReducer
- **认证**: bcrypt

## 项目结构

```
JD-Bill-Filter/
├── src/
│   ├── app/                    # Next.js 页面路由
│   │   ├── api/               # API 路由
│   │   │   ├── auth/         # 认证相关
│   │   │   ├── mysql/        # MySQL 数据库操作
│   │   │   └── pdf/          # PDF 处理
│   │   ├── inventory/        # 库存管理页面
│   │   ├── login/            # 登录页面
│   │   ├── outbound-records/ # 出库记录页面
│   │   ├── products/         # 商品管理页面
│   │   ├── suppliers/        # 供应商管理页面
│   │   └── users/            # 用户管理页面
│   ├── components/            # React 组件
│   │   ├── ui/              # 基础 UI 组件
│   │   ├── FileUpload.js    # 文件上传
│   │   ├── InventoryManager.js # 库存管理
│   │   ├── ProductManager.js   # 商品管理
│   │   ├── ResultDisplay.js    # 结果展示
│   │   └── Sidebar.js          # 侧边栏导航
│   ├── context/              # React Context 状态管理
│   │   ├── AppContext.js    # 全局应用状态
│   │   ├── ProductContext.js # 商品状态
│   │   └── SupplierContext.js # 供应商状态
│   ├── lib/                  # 工具库
│   │   ├── dataProcessor.js # 核心数据处理逻辑
│   │   ├── excelHandler.js  # Excel 文件处理
│   │   ├── inventoryStorage.js # 库存存储
│   │   └── mysqlConnection.js # MySQL 连接池
│   ├── hooks/                # 自定义 Hooks
│   │   └── use-toast.js     # Toast 提示
│   └── types/                # TypeScript 类型定义
│       └── index.js
├── public/                   # 静态资源
├── package.json
├── tailwind.config.js
└── next.config.mjs
```

## 核心功能

### 数据处理流程

```
文件上传 → 数据解析 → 订单合并 → SKU合并 → 结果导出
```

### 订单合并规则

1. **按订单编号分组**：相同订单编号的记录合并
2. **售后服务单处理**：从对应订单中扣除售后金额
3. **合流共配回收运费**：特殊处理，替换对应货款金额

### SKU 合并规则

- 条件：商品编号相同 **且** 单价相同
- 合并字段：金额、商品数量、总价
- 使用 `Decimal.js` 确保金额精度

### 库存出库规则

1. **按批次顺序出库**：最早入库的批次优先出库（FIFO）
2. **单批次出库**：如果一个批次足够，直接出库
3. **多批次出库**：如果需要多个批次，创建多条出库记录

## API 接口

### MySQL 数据库操作

| 方法 | 路径                            | 说明                       |
| ---- | ------------------------------- | -------------------------- |
| POST | /api/mysql                      | 通用数据库操作（增删改查） |
| GET  | /api/mysql?action=getInventory  | 获取库存数据               |
| POST | /api/mysql?action=pushInventory | 推送库存数据               |
| GET  | /api/mysql?action=getProducts   | 获取商品数据               |
| POST | /api/mysql?action=pushProducts  | 推送商品数据               |

### 请求格式

```javascript
POST /api/mysql
{
  "action": "actionName",
  "data": { /* 数据 */ }
}
```

### 认证接口

| 方法 | 路径             | 说明       |
| ---- | ---------------- | ---------- |
| POST | /api/auth/login  | 用户登录   |
| POST | /api/auth/verify | 验证 Token |

## 数据库配置

### 自动创建表

系统会在首次使用时自动创建以下表：

- `users` - 用户表
- `products` - 商品表
- `inventory` - 库存表
- `deduction_records` - 扣减记录表
- `suppliers` - 供应商表

### 表结构示例

```sql
CREATE TABLE products (
  id VARCHAR(255) PRIMARY KEY,
  sku VARCHAR(255) NOT NULL UNIQUE COMMENT '京东SKU',
  product_name VARCHAR(500) NOT NULL COMMENT '商品名称',
  warehouse VARCHAR(255) DEFAULT '' COMMENT '仓库',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_sku (sku),
  INDEX idx_warehouse (warehouse)
);
```

## 开发规范

### 代码风格

- 使用 ESLint 进行代码检查
- 使用 Prettier 格式化（可选）
- 遵循 React 最佳实践

### 组件开发

```javascript
// 所有客户端组件必须以 "use client" 开头
"use client";

import React from "react";

export function MyComponent() {
  return <div>Content</div>;
}
```

### 导入路径

```javascript
// 使用 @/ 别名指向 src/ 目录
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";

// 导入顺序：React → 第三方库 → 项目内部 → 相对路径
import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { downloadExcel } from "@/lib/excelHandler";
import { Button } from "./ui/button";
```

### 金额计算

```javascript
// 始终使用 Decimal.js 避免浮点数精度问题
import { Decimal } from "decimal.js";

const amount1 = new Decimal("100.50");
const amount2 = new Decimal("50.25");
const total = amount1.plus(amount2); // 150.75
```

### 错误处理

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

## 安全注意事项

- ✅ 密码使用 bcrypt 加密存储
- ✅ 敏感操作需要用户认证
- ✅ API 请求超时保护（30 秒）
- ✅ 文件大小限制（50MB）
- ✅ 支持的文件类型验证（.xlsx, .xls, .csv）

## 构建和运行

### 环境要求

- Node.js 18+
- MySQL 5.7+ 或 8.0+
- npm 或 yarn

### 安装依赖

```bash
npm install
```

### 配置环境变量

创建 `.env.local` 文件：

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=jd_bill_filter

# JWT Secret
JWT_SECRET=your_jwt_secret_key

# 应用配置
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
npm run start
```