# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## 项目调试规则（非显而易见部分）

### 日志调试规范

- 使用 AppContext 的 addLog 函数记录关键操作，而不是直接使用 console.log
- 日志类型必须使用 LogType 枚举：INFO, SUCCESS, ERROR, WARNING
- 文件处理过程中的每个步骤都必须添加日志记录
- 数据处理的关键节点（如分组、合并）必须输出详细日志

### 错误调试规范

- 所有错误必须通过 setError 统一显示在 ErrorModal 中
- 文件处理错误必须包含文件名和具体操作步骤
- 数据验证错误必须指出缺失的字段名称和期望格式
- 异步操作错误必须保留原始错误对象用于调试

### 数据调试规范

- 处理订单数据时，console.log 必须包含 mergeGroup 和 groupedData 的中间结果
- 金额计算过程必须输出 Decimal 对象的中间值
- 多文件合并时必须记录每个文件的处理状态和结果统计
- CSV 编码检测过程必须输出编码判断依据

### 组件调试规范

- Modal 组件调试时注意检查 body 样式是否正确恢复
- 文件上传组件调试时验证拖拽和点击两种上传方式
- 状态管理调试时检查 useReducer 的 action 和 state 变化
- 表格组件调试时验证数据格式化和金额显示

### 性能调试规范

- 大文件处理时监控内存使用情况
- 检查 useCallback 依赖数组是否正确配置
- 验证 React.memo 是否有效减少不必要的重渲染
- 监控文件读取和数据处理的时间消耗
