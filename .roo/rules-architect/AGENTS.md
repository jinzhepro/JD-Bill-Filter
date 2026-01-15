# AGENTS.md - Architect Mode

This file provides guidance to agents when working with code in this repository.

## 系统架构

### 技术栈

- 前端框架：Next.js 16.0.10 (App Router)
- UI 库：shadcn/ui (new-york 风格)
- 样式：Tailwind CSS (支持暗色模式)
- 状态管理：React Context + useReducer
- 文件处理：exceljs (Excel/CSV)
- 数值计算：decimal.js (精确计算)

### 目录结构

```
src/
├── app/              # Next.js App Router 页面
├── components/       # React 组件
│   └── ui/          # shadcn/ui 组件库
├── context/         # React Context 状态管理
├── lib/             # 工具函数和业务逻辑
├── hooks/           # 自定义 React Hooks
└── types/           # TypeScript 类型定义
```

### 核心模块

- 订单处理 (orderProcessor.js)：处理订单、售后服务单、非销售单
- 结算单处理 (settlementProcessor.js)：合并相同 SKU 的应结金额
- 文件处理 (excelHandler.js)：Excel/CSV 文件读写和编码处理
- 状态管理 (AppContext.js)：全局状态和 actions

### 数据流

1. 文件上传 → 文件验证 → 数据解析
2. 数据处理 (订单/结算单/商品合并) → 结果展示
3. 错误处理 → 日志记录 → 用户反馈

### 扩展点

- 新增数据处理类型：在 lib/ 目录添加新的处理器
- 新增页面：在 app/ 目录添加新路由
- 新增 UI 组件：在 components/ui/ 目录添加 shadcn/ui 组件
