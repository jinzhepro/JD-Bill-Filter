# AGENTS.md - Architect Mode

This file provides guidance to agents when working with code in this repository.

## 系统架构

### 核心模块

- 订单处理 (orderProcessor.js)：处理订单、售后服务单、非销售单
- 结算单处理 (settlementProcessor.js)：合并相同 SKU 的应结金额
- 文件处理 (excelHandler.js)：Excel/CSV 文件读写和编码处理
- 状态管理 (AppContext.js)：全局状态和 actions

### 数据流

1. 文件上传 → 文件验证 → 数据解析
2. 数据处理 (订单/结算单/商品合并) → 结果展示
3. 错误处理 → 日志记录 → 用户反馈
