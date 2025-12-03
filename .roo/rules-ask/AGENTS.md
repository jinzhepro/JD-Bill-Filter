# AGENTS.md - Ask Mode

This file provides guidance to agents when working with code in this repository.

## 项目文档规则（非显而易见部分）

### 业务逻辑说明

- 应用处理京东万商对帐单，根据三种业务规则过滤数据
- 规则 1：全订单过滤服务费（当订单全是"订单"类型时，过滤"直营服务费"和"代收配送费"）
- 规则 2：取消退款单全过滤（包含"取消退款单"的订单组全部过滤）
- 规则 3：混合类型保留（其他情况保留所有行）

### 数据流程说明

- 处理流程：文件上传 → 单价设置 → 数据处理 → 结果查看
- 只有费用项为"货款"的商品需要设置单价，其他费用项自动过滤
- 相同商品编号的商品会自动合并数量，使用相同单价
- 最终输出只包含：商品名、商品编码、单价、数量、总价

### 文件结构说明

- `src/lib/dataProcessor.js`：核心数据处理逻辑
- `src/lib/excelHandler.js`：文件读写处理
- `src/context/AppContext.js`：全局状态管理
- `src/types/index.js`：类型定义和默认单价配置
- `src/components/`：UI 组件，按功能模块组织

### 用户界面说明

- 四步骤流程：上传文件 → 设置单价 → 处理数据 → 查看结果
- 支持拖拽上传和点击选择文件
- 单价设置支持批量操作和默认单价
- 处理过程有实时进度和日志显示
- 结果可预览和下载 Excel 文件

### 配置说明

- 默认单价在 `src/types/index.js` 的 defaultPricesConfig 中配置
- 文件大小限制 50MB，支持 .xlsx, .xls, .csv 格式
- 必须包含特定列名：订单编号、单据类型、费用项、商品编号、商品数量
- 商品编码导出时强制为字符串格式，避免 Excel 科学计数法

### 测试说明

- 使用 `public/test-data.csv` 进行功能测试
- 测试数据包含各种业务场景
