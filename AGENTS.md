# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## 项目概述

这是一个基于 Next.js 的京东万商对帐单处理系统，用于处理 Excel/CSV 格式的对帐单数据，支持单文件处理和多文件合并功能。

## 构建和开发命令

- `npm run dev` - 启动开发服务器
- `npm run build` - 构建生产版本
- `npm run start` - 启动生产服务器
- `npm run lint` - 运行 ESLint 检查

## 核心架构

### 数据处理流程

1. 文件上传 → 2. 数据验证 → 3. 订单处理 → 4. 结果展示/下载

### 关键组件

- `src/lib/excelHandler.js` - Excel/CSV 文件读写处理
- `src/lib/dataProcessor.js` - 核心数据处理逻辑
- `src/context/AppContext.js` - 全局状态管理
- `src/components/` - UI 组件目录

## 代码风格指南

### 文件命名

- 组件文件使用 PascalCase: `FileUpload.js`, `ResultDisplay.js`
- 工具函数文件使用 camelCase: `excelHandler.js`, `dataProcessor.js`

### 导入顺序

1. React 相关导入
2. 第三方库导入
3. 项目内部导入（使用 @/ 别名）
4. 相对路径导入

### 组件结构

- 所有客户端组件必须以 `"use client";` 开头
- 使用 React.memo 优化性能（如 Button 组件）
- 使用 useCallback 和 useMemo 优化渲染性能

### 状态管理

- 全局状态通过 AppContext 管理
- 使用 useReducer 处理复杂状态逻辑
- 本地状态使用 useState

### 样式规范

- 使用 Tailwind CSS 类名
- 自定义样式定义在 `src/app/globals.css`
- 响应式设计使用 Tailwind 断点

## 关键业务逻辑

### 数据处理

- 使用 Decimal.js 处理金额计算，避免浮点数精度问题
- 订单数据按"订单编号"分组处理
- 合并相同商品编号和单价的记录

### 文件处理

- 支持 .xlsx, .xls, .csv 格式
- CSV 文件自动检测编码（UTF-8/GBK）
- 文件大小限制 50MB

### 错误处理

- 使用 try-catch 包装异步操作
- 错误信息通过 AppContext 统一管理
- 用户友好的错误提示

## 注意事项

- 所有文件路径使用 @/ 别名指向 src/ 目录
- 处理金额时必须使用 Decimal.js 避免精度问题
- 组件卸载时注意清理副作用（如 Modal 组件的 body 样式）
- 使用 ESLint 配置确保代码质量
