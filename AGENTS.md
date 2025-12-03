# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## 项目概述

这是一个基于 Next.js 的京东万商对帐单处理系统，用于自动处理 Excel/CSV 对帐单文件，根据特定业务规则过滤和整理数据。

## 构建和开发命令

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

## 关键架构模式

### 状态管理

- 使用 React Context + useReducer 模式管理全局状态
- 所有状态操作通过 `src/context/AppContext.js` 中的 actions 进行
- 必须使用 `useApp()` hook 访问上下文，直接使用 useContext 会被阻止

### 文件处理

- Excel/CSV 文件处理使用 SheetJS (xlsx) 库
- CSV 文件支持 UTF-8 和 GBK 编码自动检测
- 商品编码在导出时强制转换为字符串格式，避免 Excel 科学计数法

### 业务规则处理

- 数据处理流程：分组 → 应用业务规则 → 应用单价 → 合并 SKU → 生成统计
- 只有费用项为"货款"的商品需要设置单价
- 相同商品编号的商品会自动合并数量

## 代码风格约定

### 导入路径

- 使用 `@/` 前缀引用 src 目录下的文件
- 组件导入优先级：React → 第三方库 → 本地组件 → 工具函数 → 类型定义

### 组件结构

- 所有组件文件以 `"use client";` 开头（Next.js App Router 要求）
- 使用 useCallback 包装事件处理函数
- 状态更新使用函数式更新模式

### 数据处理

- 所有数据处理逻辑集中在 `src/lib/dataProcessor.js`
- 数据验证函数必须抛出错误而不是返回 false
- 日志记录使用 `addLog(message, type)` 方法

## 重要注意事项

### 默认单价配置

- 预设的商品默认单价在 `src/types/index.js` 中定义
- 新增默认单价需要同时更新此文件

### 文件上传限制

- 支持格式：.xlsx, .xls, .csv
- 最大文件大小：50MB
- 必须包含特定列名：订单编号、单据类型、费用项、商品编号、商品数量

### 错误处理

- 所有异步操作必须包含 try-catch
- 错误信息通过 `setError()` 设置到全局状态
- 用户操作失败时必须调用 `addLog()` 记录错误日志

### 测试数据

- 测试用 CSV 文件位于 `public/test-data.csv`
- 可用于开发时测试应用功能
