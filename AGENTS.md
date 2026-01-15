# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## 项目概述

这是一个基于 Next.js 的京东单据处理系统，用于处理订单、结算单和商品合并等业务数据。

## 构建和开发命令

- `npm run dev` - 启动开发服务器
- `npm run build` - 构建生产版本
- `npm run start` - 启动生产服务器
- `npm run lint` - 运行 ESLint 检查

## 项目特定约定

### 文件处理

- 使用 `exceljs` 库处理 Excel 和 CSV 文件
- CSV 文件需要特殊处理中文编码问题，先尝试 UTF-8，失败后尝试 GBK
- 商品编号列必须强制设置为文本格式，防止 Excel 自动转换为数字
- 处理 Excel 中以 `="..."` 格式的商品编号，需要清理等号和引号

### 数据处理

- 使用 `decimal.js` 库进行精确的数值计算，避免浮点数精度问题
- 订单处理流程：处理售后服务单 → 处理非销售单 → 合并订单数据 → 合并相同 SKU
- 结算单处理：合并相同 SKU 的应结金额，支持多种金额列名（应结金额、金额、合计金额、总金额）

### 状态管理

- 使用 React Context 和 useReducer 管理全局状态
- 主要状态包括：上传文件、原始数据、处理后数据、处理状态、日志、错误信息
- 支持多文件上传和合并处理模式

### UI 组件

- 使用 shadcn/ui 组件库，配置为 "new-york" 风格
- 使用 Tailwind CSS 进行样式设计，支持暗色模式
- 所有组件使用 "use client" 指令，因为需要客户端交互

### 路径别名

- `@/*` 映射到 `./src/*`
- 组件路径：`@/components`、`@/components/ui`
- 工具函数路径：`@/lib`、`@/lib/utils`
- 钩子路径：`@/hooks`

### 错误处理

- 使用 ErrorBoundary 组件捕获 React 组件错误
- 错误信息通过 Context 全局管理
- 文件相关错误会触发订单状态重置

### 日志系统

- 支持多种日志类型：INFO、SUCCESS、ERROR、WARNING
- 日志包含时间戳、消息和类型
- 通过 Context 管理日志状态

### 文件结构

- `src/app/` - Next.js App Router 页面
- `src/components/` - React 组件
- `src/components/ui/` - UI 组件库
- `src/context/` - React Context 状态管理
- `src/lib/` - 工具函数和业务逻辑
- `src/types/` - TypeScript 类型定义（项目使用 JavaScript 但有类型定义）
