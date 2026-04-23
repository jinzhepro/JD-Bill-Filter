# 电商业务结算助手

基于 Next.js 的京东对帐单处理系统，支持 Excel/CSV 文件导入、智能订单合并、结算单处理和供应商转换等功能。

## 📋 目录

- [功能特性](#-功能特性)
- [技术栈](#-技术栈)
- [快速开始](#-快速开始)
- [项目结构](#-项目结构)
- [核心功能](#-核心功能)
- [开发规范](#-开发规范)
- [安全注意事项](#-安全注意事项)
- [许可证](#-许可证)
- [贡献](#-贡献)
- [联系方式](#-联系方式)
- [版本信息](#-版本信息)

## ✨ 功能特性

### 结算单处理

- 📤 批量导入结算单文件（Excel/CSV）
- 🔄 自动合并相同 SKU 的货款和数量
- 🧮 智能处理售后卖家赔付费（按货款比例分摊）
- 📊 支持多文件批量处理
- 📥 导出合并后的结算单
- ✏️ 手动调整结算单数据（支持相同 SKU 合并计算）

### 供应商转换

- 🏢 供应商信息管理
- 🔍 根据匹配字符串自动识别供应商
- 📝 自定义供应商匹配规则
- 🔄 批量供应商信息转换

### 数据展示

- 📊 表格化展示处理结果
- 🎨 支持排序和复制列数据
- 📈 实时统计货款、直营服务费、收入等指标
- 🔍 数据变化详情查看

## 🚀 技术栈

- **框架**: Next.js 16.0.10 (App Router)
- **语言**: JavaScript (无 TypeScript)
- **UI 库**: shadcn/ui + Tailwind CSS
- **状态管理**: React Context + useReducer
- **数值计算**: Decimal.js (高精度数学)
- **文件处理**: ExcelJS (Excel), 原生 API (CSV)
- **图标**: Lucide React
- **测试**: 无 (推荐安装 Vitest + Testing Library)

## 🚀 快速开始

### 环境要求

- Node.js 18+
- npm 或 yarn

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

### 代码质量检查

```bash
npm run lint
```

## 📁 项目结构

```
JD-Bill-Filter/
├── src/
│   ├── app/                    # Next.js App Router 页面
│   │   ├── page.js            # 首页（结算单处理）
│   │   ├── suppliers/         # 供应商转换页面
│   │   │   └── page.js        # 供应商管理页面
│   │   ├── layout.js          # 根布局
│   │   └── globals.css        # 全局样式（shadcn/ui）
│   ├── components/            # React 组件
│   │   ├── ui/               # shadcn/ui 基础组件
│   │   │   ├── button.js     # 按钮组件
│   │   │   ├── input.js      # 输入框组件
│   │   │   ├── table.js      # 表格组件
│   │   │   ├── toast.js      # Toast 提示
│   │   │   └── modal.js      # 模态框组件（含 ErrorModal）
│   │   ├── SettlementContent.js        # 结算单内容
│   │   ├── SettlementFolderUpload.js   # 结算单文件夹上传
│   │   ├── SettlementResultDisplay.js  # 结算单结果展示
│   │   ├── SettlementProcessModal.js   # 结算单处理模态框
│   │   ├── Sidebar.js        # 侧边栏导航
│   │   ├── SupplierManager.js # 供应商管理
│   │   ├── FileUploader.js   # 文件上传
│   │   ├── DataDisplay.js    # 数据展示
│   │   ├── SimpleLayout.js   # 简单布局
│   │   ├── ErrorBoundary.js  # 错误边界
│   │   ├── LoadingOverlay.js # 加载遮罩
│   │   ├── LoadingStates.js  # 加载状态
│   │   └── ThemeToggle.js    # 主题切换
│   ├── context/              # React Context 状态管理
│   │   ├── SettlementContext.js # 结算单状态（核心）
│   │   ├── SupplierContext.js # 供应商状态
│   │   ├── ThemeContext.js   # 主题状态
│   │   └── LoadingContext.js # 全局加载状态
│   ├── lib/                  # 核心业务逻辑
│   │   ├── settlementProcessor.js # 结算单数据处理
│   │   ├── settlementHelpers.js   # 结算辅助函数
│   │   ├── excelHandler.js   # Excel 文件处理
│   │   ├── fileValidation.js # 文件验证（仅保留必要函数）
│   │   ├── logger.js         # 日志工具
│   │   ├── utils.js          # 工具函数（cn, cleanAmount, cleanProductCode, formatAmount）
│   │   └── constants.js      # 常量定义
│   ├── data/                 # 静态数据
│   │   └── suppliers.js      # 供应商数据
│   └── hooks/                # 自定义 Hooks
│       └── use-toast.js      # Toast 提示
├── public/                   # 静态资源
├── package.json
├── tailwind.config.js        # Tailwind 配置
├── next.config.mjs           # Next.js 配置
├── components.json           # shadcn/ui 配置
├── eslint.config.mjs         # ESLint 配置
├── jsconfig.json             # JavaScript 配置
├── AGENTS.md                 # Agent 指南
├── IFLOW.md                  # 详细文档
└── README.md                 # 本文档
```

## 🔧 核心功能

### 结算单处理流程

1. **文件上传**: 支持 .xlsx, .xls, .csv 格式，50MB 限制
2. **数据验证**: 检查必需列（商品编号、金额列）
3. **数据处理**:
   - 按费用名称过滤（只处理"货款"记录）
   - 合并相同 SKU 的货款和数量
   - 处理直营服务费（按商品编号分组）
   - 处理售后卖家赔付费（累加总额，按货款比例分摊）
4. **结果计算**:
   - 货款 = 应结金额 - 分摊的赔付费
   - 收入 = 货款 + 直营服务费
5. **导出结果**: 生成 Excel 文件，商品编号设置为文本格式

### 手动调整功能

- 支持多行输入，批量处理
- 相同 SKU 自动合并计算
- SKU 未找到或数量不足时显示错误提示
- 只有所有验证通过才提交数据

### 供应商转换

- 根据匹配字符串自动识别文本中的供应商信息
- 支持自定义供应商匹配规则
- 批量转换供应商信息

## 📝 开发规范

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
import { useSettlement } from "@/context/SettlementContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// 4. 相对路径
import { MyComponent } from "./MyComponent";
```

### 金额计算规范

```javascript
// 始终使用 Decimal.js 避免浮点数精度问题
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

**重要**: 商品编号必须强制转换为字符串，防止 Excel 自动转换为数字：
```javascript
const productCode = String(row["商品编号"] || "");
```

### 错误处理规范

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

### Context 使用规范

```javascript
// 使用自定义 Hook 访问 Context
import { useSettlement } from "@/context/SettlementContext";

function MyComponent() {
  const { processedData, setProcessedData, addLog } = useSettlement();
  // ...
}

// CRITICAL: 永远不要直接修改 state，始终使用 Context actions
```

**注意**: `SettlementContext` 是主要的状态管理 Context，包含了结算单处理所需的所有状态和方法。

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

### 文件处理规范

- **CSV 编码**: 先尝试 UTF-8，失败后尝试 GBK
- **Excel 数字列**: 商品编号设置为文本格式 (`numFmt: '@'`)
- **Excel 公式**: 处理 `{ formula: '...', result: ... }` 对象
- **文件验证**: 使用 `isValidFileExtension` 和 `isValidFileSize` 进行验证

## 🔒 安全注意事项

- ✅ 文件大小限制（50MB）
- ✅ 支持的文件类型验证（.xlsx, .xls, .csv）
- ✅ 文件扩展名验证
- ✅ 无数据库依赖，数据仅在内存中处理
- ✅ 生产环境建议添加身份验证和授权

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 贡献步骤

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📞 联系方式

如有问题，请通过 GitHub Issues 反馈。

## 📦 版本信息

- **当前版本**: 0.1.0
- **Next.js**: 16.0.10
- **React**: 19.2.0
- **Node.js**: 18+
- **Tailwind CSS**: 3.4.18
- **shadcn/ui**: New York style

## 📚 相关文档

- **AGENTS.md**: AI Agent 开发指南
- **IFLOW.md**: 详细技术文档
- **package.json**: 依赖和脚本配置

## 🎯 下一步

1. **开发**: 运行 `npm run dev` 开始开发
2. **测试**: 安装 Vitest + Testing Library 添加测试
3. **部署**: 运行 `npm run build` 构建生产版本
4. **自定义**: 修改 `src/data/suppliers.js` 添加供应商
