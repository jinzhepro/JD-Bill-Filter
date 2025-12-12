# JD-Bill-Filter 项目上下文文件

## 项目概览

**项目名称**: JD-Bill-Filter (京东万商对账单处理系统)  
**项目类型**: Next.js Web 应用  
**版本**: 0.1.0  
**状态**: 私有项目  

### 项目目的

这是一个基于 Next.js + React + Tailwind CSS 的现代化 Web 应用，专门用于自动处理京东万商对账单 Excel/CSV 文件。系统能够根据业务规则自动过滤、统计和整理数据，实现财务对账的自动化处理。

### 核心功能

- 📁 **文件上传**: 支持拖拽和点击上传 Excel/CSV 文件
- 🔍 **智能数据解析**: 自动解析和验证数据结构
- 🔄 **订单数据处理**: 处理订单和取消退款单数据
- 🧮 **智能合并**: 相同商品编码和单价的记录自动合并
- 💰 **单价自动计算**: 根据货款和运费计算商品单价
- 🚫 **无效数据过滤**: 过滤总价为 0 的无效记录
- 📊 **处理统计**: 提供订单数量、商品总数和总金额统计
- 👀 **结果预览**: 支持处理结果预览
- 💾 **简化导出**: 生成包含 5 个字段的 Excel 结果文件

## 技术栈

### 核心技术
- **框架**: Next.js 16.0.6
- **前端**: React 19.2.0
- **样式**: Tailwind CSS 3.4.18
- **语言**: JavaScript
- **状态管理**: React Hooks + Context API

### 关键依赖
- **xlsx**: 0.18.5 - Excel 文件处理
- **decimal.js**: 10.6.0 - 精确数值计算
- **postcss**: 8.5.6 - CSS 处理
- **autoprefixer**: 10.4.22 - CSS 前缀处理

### 开发工具
- **ESLint**: 代码质量检查
- **eslint-config-next**: Next.js ESLint 配置

## 项目结构

```
src/
├── app/                    # Next.js App Router
│   ├── layout.js          # 根布局
│   ├── page.js            # 主页面
│   └── globals.css        # 全局样式
├── components/            # React 组件
│   ├── ui/               # 基础UI组件
│   │   ├── Button.js
│   │   └── Modal.js
│   ├── FileUpload.js     # 文件上传组件
│   ├── ResultDisplay.js  # 结果展示组件
│   └── AppContent.js     # 应用内容组件
├── context/              # React Context
│   └── AppContext.js
├── lib/                  # 工具库
│   ├── dataProcessor.js  # 数据处理逻辑
│   └── excelHandler.js   # Excel文件处理
└── types/                # 类型定义
    └── index.js
```

## 构建和运行

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
npm run dev
```
在浏览器中打开 [http://localhost:3000](http://localhost:3000) 查看应用

### 生产构建
```bash
npm run build
npm start
```

### 代码检查
```bash
npm run lint
```

## 开发规范

### 代码风格
- **语言**: JavaScript (ES6+)
- **组件**: 函数式组件 + Hooks
- **样式**: Tailwind CSS
- **导入**: 使用 `@/` 别名进行模块导入

### 组件架构
- **UI 组件**: 位于 `src/components/ui/` 目录
- **功能组件**: 位于 `src/components/` 目录
- **状态管理**: React Context API
- **工具函数**: 位于 `src/lib/` 目录

### 数据处理流程
1. **数据验证**: 检查必要列和数据格式
2. **数据筛选**: 筛选订单和取消退款单数据
3. **订单分组**: 按订单编号分组处理
4. **费用合并**: 合并货款和运费信息
5. **智能合并**: 合并相同商品编码和单价的记录
6. **数据过滤**: 过滤无效数据
7. **结果生成**: 生成最终输出



## 配置文件

### package.json
- **脚本**: dev, build, start, lint
- **依赖**: React, Next.js, xlsx, decimal.js
- **开发依赖**: ESLint 相关包

### next.config.mjs
- Next.js 配置文件（当前为默认配置）

### tailwind.config.js
- **内容路径**: src/pages, src/components, src/app
- **主题扩展**: 自定义颜色、字体、动画
- **字体**: 支持中文字体（PingFang SC, Hiragino Sans GB, Microsoft YaHei）

### postcss.config.js
- Tailwind CSS 和 autoprefixer 配置

## 业务规则

### 数据结构要求
Excel/CSV 文件必须包含以下列：
- **订单编号**: 唯一标识符
- **单据类型**: "订单"、"取消退款单"
- **费用项**: "直营服务费"、"货款"、"合流共配回收运费" 等
- **商品编号**: 商品标识
- **商品名称**: 商品名称
- **商品数量**: 商品数量
- **金额**: 费用金额

### 计算规则
- **商品单价** = 总价 ÷ 商品数量
- **合并逻辑**: 相同商品编号和单价的记录自动合并
- **数据过滤**: 总价为 0 或 null 的记录被过滤
- **输出字段**: 商品名称、商品编号、单价、数量、总价

## 部署和运行

### 环境要求
- Node.js (版本要求见 package.json)
- 现代浏览器 (Chrome 60+, Firefox 55+, Safari 12+, Edge 79+)

### 文件大小限制
- 最大文件大小: 50MB
- 支持格式: .xlsx, .xls, .csv

## 重要说明

### 注意事项
- 项目为私有项目，需要根据实际需求调整配置
- 财务数据处理涉及敏感信息，注意数据安全
- 生产环境部署前需要进行充分测试