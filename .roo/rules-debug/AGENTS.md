# AGENTS.md - Debug Mode

This file provides guidance to agents when working with code in this repository.

## 调试特定规则

### 日志系统

- 使用 Context 中的 `addLog` action 添加调试日志
- 日志类型包括：INFO、SUCCESS、ERROR、WARNING
- 日志会显示在 UI 的日志面板中，包含时间戳

### 错误处理

- 所有错误通过 Context 的 `setError` action 设置
- 文件相关错误会自动触发 `resetOrder` action
- 使用 ErrorBoundary 捕获 React 组件错误

### 常见问题排查

- CSV 编码问题：检查是否正确处理了 GBK 编码
- 商品编号格式：检查是否清理了 Excel 的 `="..."` 格式
- 数值计算：确保使用 Decimal 类型避免精度问题
- DecimalError 错误：检查是否正确清理了字符串格式的金额值（移除货币符号和逗号）
- 文件上传：检查文件类型和大小验证

### 调试工具

- 浏览器开发者工具查看网络请求和控制台错误
- React DevTools 查看组件状态和 Context 状态
- 检查日志面板中的详细处理信息
