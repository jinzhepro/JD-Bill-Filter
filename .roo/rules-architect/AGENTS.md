# AGENTS.md - Architect Mode

This file provides guidance to agents when working with code in this repository.

## 项目架构规则（非显而易见部分）

### 核心架构模式

- 使用 Next.js App Router + React Context + useReducer 状态管理模式
- 单向数据流：用户操作 → Action → State 更新 → UI 重新渲染
- 组件间通信通过 Context 进行，避免 prop drilling

### 数据处理架构

- 数据处理管道：文件读取 → 结构验证 → 分组 → 业务规则 → 单价应用 → SKU 合并 → 统计生成
- 每个处理步骤都是纯函数，便于测试和维护
- 业务规则与数据处理逻辑分离，便于扩展新规则

### 状态管理架构

- 全局状态集中在 AppContext.js，使用 useReducer 管理复杂状态
- 状态更新通过封装的 actions 进行，确保状态变更的可预测性
- 使用 useCallback 优化性能，避免不必要的重渲染

### 文件处理架构

- 支持多种文件格式（Excel/CSV）和编码（UTF-8/GBK）
- 文件验证与数据处理分离，职责清晰
- 导出时特殊处理商品编码格式，确保 Excel 兼容性

### 组件架构

- 按功能模块组织组件，每个组件职责单一
- 使用受控组件模式，状态由 Context 统一管理
- UI 组件与业务逻辑组件分离，提高复用性

### 扩展性设计

- 业务规则可配置化，便于添加新的过滤规则
- 默认单价配置外部化，支持动态更新
- 处理步骤模块化，便于插入新的处理环节

### 性能考虑

- 大文件处理使用流式读取，避免内存溢出
- 数据处理使用 Web Workers 考虑（当前版本未实现）
- 组件渲染优化，使用 useCallback 和 useMemo

### 安全考虑

- 文件类型和大小验证，防止恶意文件上传
- 数据验证严格，确保处理数据格式正确
- 错误处理完善，避免敏感信息泄露
