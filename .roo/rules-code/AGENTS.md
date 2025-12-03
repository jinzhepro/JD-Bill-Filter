# AGENTS.md - Code Mode

This file provides guidance to agents when working with code in this repository.

## 项目编码规则（非显而易见部分）

### 状态管理模式

- 必须使用 `useApp()` hook 访问上下文，直接使用 useContext 会在 AppContext.js 中被阻止
- 所有状态更新必须通过 AppContext.js 中定义的 actions 进行
- 状态更新函数使用 useCallback 包装以避免不必要的重渲染

### 文件处理特殊要求

- CSV 文件必须先尝试 UTF-8 编码，失败后自动尝试 GBK 编码（excelHandler.js）
- 商品编码在导出 Excel 时必须强制转换为字符串格式，避免 Excel 科学计数法（excelHandler.js 第 193 行）
- 文件验证必须抛出错误而不是返回 false（dataProcessor.js validateDataStructure 函数）

### 数据处理流程约束

- 只有费用项为"货款"的商品需要设置单价（dataProcessor.js extractUniqueProducts 函数）
- 相同商品编号的商品会自动合并数量，单价必须相同（dataProcessor.js mergeSameSKU 函数）
- 业务规则处理必须按特定顺序：分组 → 应用业务规则 → 应用单价 → 合并 SKU → 生成统计

### 组件开发规范

- 所有组件文件必须以 `"use client";` 开头（Next.js App Router 要求）
- 事件处理函数必须使用 useCallback 包装
- 状态更新使用函数式更新模式，避免直接修改状态

### 错误处理模式

- 所有异步操作必须包含 try-catch 块
- 错误信息通过 `setError()` 设置到全局状态
- 用户操作失败时必须调用 `addLog()` 记录错误日志
- 数据验证函数必须抛出 Error 对象，不能返回 false

### 默认配置管理

- 商品默认单价配置在 `src/types/index.js` 的 defaultPricesConfig 中定义
- 新增默认单价需要同时更新此文件，格式为 `{ sku: { sku, unitPrice, productName, enabled } }`
- 默认单价只在 enabled 为 true 时生效

### 导入路径约定

- 使用 `@/` 前缀引用 src 目录下的文件（jsconfig.json 配置）
- 组件导入优先级：React → 第三方库 → 本地组件 → 工具函数 → 类型定义
