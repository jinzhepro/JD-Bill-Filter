# JD Bill Filter - 项目上下文文档

## 项目概述

**JD Bill Filter（京东单据处理系统）** 是一个基于 Next.js 的京东对帐单处理系统，支持 Excel/CSV 文件导入、智能订单合并、结算单处理和供应商转换等功能。

### 核心技术栈

| 类别 | 技术 |
|------|------|
| **框架** | Next.js 16.0.10 (App Router) |
| **语言** | JavaScript (无 TypeScript) |
| **UI** | shadcn/ui + Tailwind CSS |
| **状态管理** | React Context + useReducer |
| **数值计算** | Decimal.js (高精度数学) |
| **文件处理** | ExcelJS (Excel), 原生 API (CSV) |
| **图标** | Lucide React |

### 主要功能

1. **结算单处理**：批量导入 Excel/CSV 文件，自动合并相同 SKU 的货款和数量，智能处理售后卖家赔付费和直营服务费
2. **供应商转换**：根据匹配字符串自动识别供应商，支持自定义匹配规则
3. **数据展示**：表格化展示处理结果，支持排序、复制和实时统计

---

## 目录结构

```
JD-Bill-Filter/
├── src/
│   ├── app/                    # Next.js App Router 页面
│   │   ├── page.js            # 首页（结算单处理）
│   │   ├── suppliers/         # 供应商转换页面
│   │   ├── layout.js          # 根布局
│   │   └── globals.css        # 全局样式
│   ├── components/            # React 组件
│   │   ├── ui/               # shadcn/ui 基础组件
│   │   ├── SettlementContent.js        # 结算单内容
│   │   ├── SettlementFolderUpload.js   # 文件夹上传
│   │   ├── SettlementResultDisplay.js  # 结果展示
│   │   ├── Sidebar.js        # 侧边栏导航
│   │   ├── SupplierManager.js # 供应商管理
│   │   └── ...
│   ├── context/              # React Context 状态管理
│   │   ├── SettlementContext.js # 结算单状态（核心）
│   │   ├── SupplierContext.js # 供应商状态
│   │   ├── ThemeContext.js   # 主题状态
│   │   └── LoadingContext.js # 加载状态
│   ├── lib/                  # 核心业务逻辑
│   │   ├── settlementProcessor.js # 结算单数据处理
│   │   ├── settlementHelpers.js   # 结算辅助函数
│   │   ├── excelHandler.js   # Excel 文件处理
│   │   ├── fileValidation.js # 文件验证
│   │   ├── logger.js         # 日志工具
│   │   ├── utils.js          # 工具函数
│   │   └── constants.js      # 常量定义
│   ├── data/                 # 静态数据
│   │   └── suppliers.js      # 供应商数据
│   └── hooks/                # 自定义 Hooks
│       └── use-toast.js      # Toast 提示
├── public/                   # 静态资源
├── package.json
├── tailwind.config.js
├── next.config.mjs
├── components.json
├── eslint.config.mjs
├── jsconfig.json
├── AGENTS.md                 # AI Agent 开发指南
├── README.md                 # 用户文档
└── QWEN.md                   # 本文件
```

---

## 构建与运行

### 环境要求

- Node.js 18+
- npm 或 yarn

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

访问 http://localhost:3000

### 生产构建

```bash
npm run build
npm start
```

### 代码检查

```bash
npm run lint
```

---

## 核心业务逻辑

### 结算单处理流程

1. **文件上传**：支持 .xlsx, .xls, .csv 格式，50MB 限制
2. **数据验证**：检查必需列（商品编号、金额列）
3. **数据处理**：
   - 按费用名称过滤（只处理"货款"记录）
   - 合并相同 SKU 的货款和数量
   - 处理直营服务费（按商品编号分组）
   - 处理售后卖家赔付费（累加总额，按货款比例分摊）
4. **结果计算**：
   - 货款 = 应结金额 - 分摊的赔付费
   - 收入 = 货款 + 直营服务费
5. **导出结果**：生成 Excel 文件，商品编号设置为文本格式

### 关键常量 (constants.js)

```javascript
// 文件上传限制
FILE_SIZE_LIMIT = 50MB

// 结算单金额列名称
SETTLEMENT_AMOUNT_COLUMNS = ["应结金额", "金额", "合计金额", "总金额"]

// 费用名称过滤（只处理货款）
SETTLEMENT_FEE_NAME_FILTER = "货款"

// 直营服务费名称
SETTLEMENT_SELF_OPERATION_FEE = "直营服务费"

// 商品编号格式（文本格式，防止 Excel 自动转换）
PRODUCT_CODE_FORMAT = "@"
```

---

## 开发规范

### 代码风格

- **文件命名**：PascalCase（组件）、camelCase（函数/变量）、UPPER_SNAKE_CASE（常量）
- **客户端组件**：必须以 `"use client"` 开头
- **导入顺序**：
  ```javascript
  // 1. React
  import React, { useState } from "react";
  
  // 2. 第三方库
  import Decimal from "decimal.js";
  
  // 3. 项目内部（使用 @/ 别名）
  import { useSettlement } from "@/context/SettlementContext";
  
  // 4. 相对路径
  import { MyComponent } from "./MyComponent";
  ```

### 金额计算规范

**始终使用 Decimal.js 避免浮点数精度问题**：

```javascript
import Decimal from "decimal.js";
import { cleanAmount } from "@/lib/utils";

const amount = new Decimal(cleanAmount(value));
const total = amount.plus(new Decimal(10));
const displayValue = total.toNumber();
```

### 商品编号处理

**关键**：必须强制转换为字符串，防止 Excel 自动转换为科学计数法：

```javascript
const productCode = String(row["商品编号"] || "");
```

### 错误处理

```javascript
try {
  const result = await someAsyncOperation();
} catch (error) {
  logger.error("操作失败:", error);
  setError(error.message);
}
```

### Context 使用规范

```javascript
import { useSettlement } from "@/context/SettlementContext";

function MyComponent() {
  const { processedData, setProcessedData, addLog } = useSettlement();
  // ...
}

// 禁止直接修改 state
// ❌ state.processedData.push(newItem);
// ✅ setProcessedData([...processedData, newItem]);
```

### 样式规范

使用 shadcn/ui 语义化 CSS 变量：

```javascript
// ✅ 推荐
<div className="bg-card text-foreground border-border" />

// ❌ 避免
<div className="bg-white text-gray-800 border-gray-200" />
```

---

## 核心 Context

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
- `pasteHistory`: 粘贴历史（localStorage 持久化，保留最近 3 条）

**核心方法**：
- `setFile(file)`, `addFile(file)`, `removeFile(index)`
- `setOriginalData(data)`, `setProcessedData(data)`
- `addLog(message, type)`, `setError(error)`
- `setMergeMode(mode)`, `setMergedData(data)`

### 其他 Context

| Context | 文件 | 用途 |
|---------|------|------|
| SupplierContext | `src/context/SupplierContext.js` | 供应商转换状态 |
| ThemeContext | `src/context/ThemeContext.js` | 深色/浅色模式 |
| LoadingContext | `src/context/LoadingContext.js` | 全局加载状态 |

---

## 工具函数 (utils.js)

| 函数 | 用途 |
|------|------|
| `cn(...classes)` | 合并 Tailwind 类名 |
| `cleanAmount(value)` | 清理金额字符串（移除货币符号和千位分隔符） |
| `cleanProductCode(value)` | 清理商品编号（处理 Excel 自动添加的等号） |
| `formatAmount(amount, isNegative)` | 格式化金额显示 |

---

## 安全与限制

| 项目 | 限制 |
|------|------|
| 文件大小 | 50MB |
| 支持格式 | .xlsx, .xls, .csv |
| CSV 编码 | 先尝试 UTF-8，失败后尝试 GBK |
| 数据存储 | 内存处理，无数据库依赖 |

---

## 测试

**当前状态**：项目无测试框架

**建议**：安装 Vitest + Testing Library 添加测试

---

## 相关文档

| 文档 | 用途 |
|------|------|
| `README.md` | 用户文档，包含功能介绍和使用指南 |
| `AGENTS.md` | AI Agent 开发指南，包含代码规范和常用代码片段 |
| `package.json` | 依赖和脚本配置 |
| `eslint.config.mjs` | ESLint 配置（基于 eslint-config-next） |
| `jsconfig.json` | JavaScript 配置（配置 @/ 路径别名） |

---

## 注意事项

### 业务逻辑

- ⚠️ 结算单处理只处理"货款"记录
- ⚠️ 相同 SKU 自动合并货款和数量
- ⚠️ 售后卖家赔付费按货款比例分摊
- ⚠️ 直营服务费按商品编号分组

### 开发规范

- ✅ 所有组件和函数必须有中文注释
- ✅ 遵循 React 19 最佳实践
- ✅ 使用 `npm run lint` 确保代码质量
- ✅ 修改前仔细测试功能

### 生产环境

- ⚠️ 建议添加身份验证和授权
- ⚠️ 数据仅在内存中处理，刷新后丢失

---

**回答完毕！**
