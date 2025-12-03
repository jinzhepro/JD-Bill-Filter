# AGENTS.md - Debug Mode

This file provides guidance to agents when working with code in this repository.

## 项目调试规则（非显而易见部分）

### 日志系统

- 应用使用自定义日志系统，通过 `addLog(message, type)` 记录操作日志
- 日志类型：info, success, error, warning（定义在 src/types/index.js）
- 日志显示在 DataProcessor 组件的日志区域，可通过清空日志按钮重置
- 所有用户操作失败必须记录错误日志

### 数据处理调试

- 数据处理步骤有明确的进度反馈（15% → 35% → 55% → 70% → 85% → 100%）
- 每个处理步骤都会生成详细的日志信息
- 业务规则处理会记录每个订单组的过滤详情
- SKU 合并会记录合并前后的行数对比

### 文件处理调试

- CSV 文件读取会尝试 UTF-8 和 GBK 两种编码，控制台会显示编码检测过程
- Excel 文件解析会在控制台输出工作表信息和数据行数
- 文件验证失败会抛出具体的错误信息，包含缺失的列名

### 状态管理调试

- AppContext 中的状态变化通过 useReducer 模式管理
- 每个状态更新都有对应的 action 类型（ActionTypes 对象）
- 可以通过浏览器开发者工具查看 React 组件状态

### 常见问题排查

- 文件上传失败：检查文件格式（.xlsx, .xls, .csv）和大小（50MB 限制）
- 数据结构验证失败：确保包含必需列名（订单编号、单据类型、费用项、商品编号、商品数量）
- 单价设置失败：检查单价格式（0-999999.99 的数字）
- 数据处理失败：确保所有商品都已设置有效单价

### 测试数据

- 使用 `public/test-data.csv` 进行功能测试
- 测试数据包含各种业务场景的订单数据
