```
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
```

## 常用命令

### 开发命令
```bash
npm run dev          # 启动开发服务器 (http://localhost:3000)
npm run build        # 构建生产版本
npm start            # 启动生产服务器
npm run lint         # 运行 ESLint 检查
```

### 测试设置
**状态**: 项目当前未配置测试框架
**建议**: 安装 Vitest + Testing Library 来添加测试
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

### 组件添加
```bash
npx shadcn@latest add [component-name]  # 添加 shadcn/ui 组件
```

## 项目架构概述

### 技术栈
- **框架**: Next.js 16.0.10 (App Router)
- **语言**: JavaScript (无 TypeScript)
- **UI 库**: shadcn/ui + Tailwind CSS
- **状态管理**: React Context + useReducer
- **数值计算**: Decimal.js (高精度数学)
- **文件处理**: ExcelJS (Excel), 原生 API (CSV)
- **图标**: Lucide React
- **路径别名**: `@/` → `./src/`

### 项目结构
```
src/
├── app/              # Next.js App Router 页面
│   ├── page.js       # 首页（结算单处理）
│   ├── suppliers/    # 供应商转换页面
│   └── layout.js     # 根布局
├── components/       # React 组件
│   ├── ui/          # shadcn/ui 基础组件
│   ├── SettlementContent.js        # 结算单内容
│   ├── SettlementFolderUpload.js   # 结算单文件夹上传
│   ├── SettlementResultDisplay.js  # 结算单结果展示
│   ├── SettlementProcessForm.js    # 结算单手动处理表单
│   ├── SupplierManager.js          # 供应商管理
│   └── FileUploader.js             # 文件上传
├── context/         # React Context 状态管理
│   ├── AppContext.js             # 全局应用状态
│   ├── SettlementContext.js      # 结算单状态
│   └── SupplierContext.js        # 供应商状态
├── lib/             # 核心业务逻辑
│   ├── settlementProcessor.js    # 结算单数据处理
│   ├── excelHandler.js           # Excel 文件处理
│   ├── fileValidation.js         # 文件验证
│   ├── logger.js                 # 日志工具
│   └── utils.js                  # 工具函数
├── data/            # 静态数据
│   └── suppliers.js              # 供应商数据
├── hooks/           # 自定义 Hooks
└── types/           # 类型定义
```

## 核心功能流程

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

### 供应商转换流程
1. 根据匹配字符串自动识别文本中的供应商信息
2. 支持自定义供应商匹配规则
3. 批量转换供应商信息

## 关键代码约定

### 组件规范
- 所有客户端组件必须以 `"use client"` 开头
- 使用 shadcn/ui 组件库，遵循其设计规范
- 命名: PascalCase (文件名), camelCase (Hook), `use` 前缀 (自定义 Hook)

### 数值计算规范
**强制要求**: 所有财务计算必须使用 Decimal.js 避免浮点数精度问题
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

**重要**: 商品编号必须强制转换为字符串，防止 Excel 自动转换为数字：
```javascript
const productCode = String(row["商品编号"] || "");
```

### 状态管理规范
- 使用 useReducer + Context 的模式
- 所有状态更新必须通过 Context 的 actions，不能直接修改 state
- 错误处理必须使用 try-catch 包装异步操作

### 文件处理规范
- **CSV 编码**: 先尝试 UTF-8，失败后尝试 GBK
- **Excel 数字列**: 商品编号设置为文本格式 (`numFmt: '@'`)
- **Excel 公式**: 处理 `{ formula: '...', result: ... }` 对象

## 开发工作流程

1. **安装依赖**: `npm install`
2. **启动开发**: `npm run dev` (访问 http://localhost:3000)
3. **代码检查**: `npm run lint`
4. **生产构建**: `npm run build && npm start`
5. **添加供应商**: 编辑 `src/data/suppliers.js`

## 重要注意事项

- 项目目前没有配置测试框架，建议添加 Vitest + Testing Library
- 所有数据仅在内存中处理，无数据库依赖
- 生产环境建议添加身份验证和授权
- 文件上传有 50MB 大小限制和类型验证
