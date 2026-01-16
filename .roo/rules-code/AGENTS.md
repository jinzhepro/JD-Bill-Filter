# AGENTS.md - Code Mode

This file provides guidance to agents when working with code in this repository.

## 项目特定编码规则

### 数值处理

- 必须使用 `decimal.js` 库进行所有数值计算，避免浮点数精度问题
- 金额计算必须使用 Decimal 类型，最后转换为数字显示
- 商品编号必须强制转换为字符串，防止 Excel 自动转换为数字
- 创建 Decimal 实例前必须清理字符串格式的数字：移除货币符号和逗号，使用 parseFloat 转换
- 处理来自 Excel/CSV 的金额值时，先检查类型，字符串需先清理再转换为数字

### 文件处理

- CSV 文件必须先尝试 UTF-8 编码，失败后尝试 GBK 编码
- Excel 文件中的商品编号列必须设置为文本格式 (`numFmt: '@'`)
- 处理 Excel 中以 `="..."` 格式的商品编号，需要清理等号和引号

### 状态管理

- 所有状态更新必须通过 Context 的 actions，不能直接修改 state
- 文件上传错误必须触发 `resetOrder` action 清理相关状态
- 日志添加必须使用 `addLog` action，包含消息和类型

### 组件规范

- 所有组件必须使用 "use client" 指令
- 错误处理必须使用 ErrorBoundary 组件包裹
- UI 组件必须从 @/components/ui 导入，使用 shadcn/ui 库

### 数据处理流程

- 订单处理：processAfterSalesData → processNonSalesOrders → processOrderWithAfterSales → mergeOrders → mergeSameSKU
- 结算单处理：验证数据结构 → 找到金额列 → 合并相同 SKU → 返回结果
- 商品合并：验证数据结构 → 按商品编号分组合并 → 计算单价 → 排序返回

### 导入路径

- 使用路径别名 @/_ 映射到 ./src/_
- 组件导入：@/components、@/components/ui
- 工具函数导入：@/lib、@/lib/utils
- 类型导入：@/types
