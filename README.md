# 电商业务结算助手

基于 Next.js 的京东对账单处理系统，支持 Excel/CSV 文件导入、智能订单合并、结算单处理和供应商转换等功能。部署于 Cloudflare Pages + D1 数据库。

## 📋 目录

- [功能特性](#-功能特性)
- [技术栈](#-技术栈)
- [快速开始](#-快速开始)
- [项目结构](#-项目结构)
- [核心功能](#-核心功能)
- [部署](#-部署)
- [开发规范](#-开发规范)
- [许可证](#-许可证)

## ✨ 功能特性

### 结算单处理

- 📤 批量导入结算单文件（Excel/CSV）
- 🔄 自动合并相同 SKU 的货款和数量
- 🧮 智能处理售后卖家赔付费（按货款比例分摊）
- 📊 支持多文件批量处理
- 📥 导出合并后的结算单
- ✏️ 手动调整结算单数据（支持相同 SKU 合并计算）

### 供应商转换

- 🏢 供应商信息管理
- 🔍 根据匹配字符串自动识别供应商
- 📝 自定义供应商匹配规则
- 🔄 批量供应商信息转换

### 商品与品牌管理

- 📦 商品 SKU 映射管理（支持批量导入）
- 🏷️ 品牌发票名称映射
- 🔍 商品搜索与分页

### 发票管理

- 📄 发票开具（客户信息导入、明细行管理）
- 📋 发票历史记录与导出
- 📊 采购单批次管理

### 数据展示

- 📊 表格化展示处理结果
- 🎨 支持排序和复制列数据
- 📈 实时统计货款、直营服务费、收入等指标
- 🔍 数据变化详情查看

## 🚀 技术栈

- **框架**: Next.js 15.5.2 (App Router)
- **语言**: JavaScript (无 TypeScript)
- **UI 库**: shadcn/ui (New York 风格) + Tailwind CSS 3.4.18
- **状态管理**: React Context + useReducer
- **数值计算**: Decimal.js (高精度数学)
- **文件处理**: ExcelJS (Excel), 原生 API (CSV)
- **图标**: Lucide React
- **部署**: Cloudflare Pages + D1 数据库

## 🚀 快速开始

### 环境要求

- Node.js 24.14.1（由 Volta 管理）
- npm

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### Cloudflare Pages 本地开发

```bash
npm run pages:dev    # 端口 8788，自动先 build
```

### 构建生产版本

```bash
npm run build
npm start
```

### 代码质量检查

```bash
npm run lint
```

## 📁 项目结构

```
JD-Bill-Filter/
├── src/
│   ├── app/                    # Next.js App Router 页面
│   │   ├── page.js            # 首页（结算单处理）
│   │   ├── suppliers/         # 供应商转换
│   │   ├── products/          # 商品管理
│   │   ├── brands/            # 品牌管理
│   │   ├── invoice/           # 发票开具
│   │   ├── invoice-history/   # 发票历史
│   │   ├── purchase/          # 采购单管理
│   │   ├── login/             # 登录页
│   │   ├── api/               # API Routes（D1 数据库操作）
│   │   ├── layout.js          # 根布局
│   │   └── globals.css        # 全局样式
│   ├── components/            # React 组件
│   │   ├── ui/               # shadcn/ui 基础组件
│   │   ├── SettlementContent.js
│   │   ├── SettlementFolderUpload.js
│   │   ├── SettlementResultDisplay.js
│   │   ├── SettlementProcessModal.js
│   │   ├── SupplierManager.js
│   │   ├── ProductManager.js
│   │   ├── BrandManager.js
│   │   ├── InvoiceForm.js
│   │   ├── InvoiceHistoryManager.js
│   │   ├── PurchaseOrderManager.js
│   │   ├── AuthGuard.js
│   │   ├── Sidebar.js
│   │   └── ...
│   ├── context/              # React Context 状态管理
│   │   ├── SettlementContext.js
│   │   ├── InvoiceContext.js
│   │   ├── SupplierContext.js
│   │   ├── AuthContext.js
│   │   ├── ThemeContext.js
│   │   └── LoadingContext.js
│   ├── lib/                  # 核心业务逻辑
│   │   ├── settlementProcessor.js
│   │   ├── settlementHelpers.js
│   │   ├── invoiceExporter.js
│   │   ├── excelHandler.js
│   │   ├── fileValidation.js
│   │   ├── utils.js
│   │   └── constants.js
│   ├── data/                 # 静态数据
│   │   └── suppliers.js
│   └── hooks/
│       └── use-toast.js
├── migrations/               # D1 数据库迁移文件
├── wrangler.toml             # Cloudflare 配置
├── package.json
├── tailwind.config.js
├── next.config.mjs
├── components.json
├── eslint.config.mjs
├── jsconfig.json
└── README.md
```

## 🔧 核心功能

### 结算单处理流程

1. **文件上传**: 支持 .xlsx, .xls, .csv 格式，50MB 限制
2. **数据验证**: 检查必需列（商品编号、金额列）
3. **数据处理**:
   - 按费用名称过滤（只处理"货款"记录）
   - 合并相同 SKU 的货款和数量
   - 处理直营服务费（按商品编号分组）
   - 处理售后卖家赔付费（累加总额，按货款比例分摊）
4. **结果计算**:
   - 货款 = 应结金额 - 分摊的赔付费
   - 收入 = 货款 + 直营服务费
5. **导出结果**: 生成 Excel 文件，商品编号设置为文本格式

### 供应商转换

- 根据匹配字符串自动识别文本中的供应商信息
- 支持自定义供应商匹配规则
- 批量转换供应商信息

## ☁️ 部署

### Cloudflare Pages

```bash
npm run pages:build   # 构建 Pages 输出
npm run pages:deploy  # 部署到 Cloudflare Pages
```

### D1 数据库迁移

```bash
npx wrangler d1 migrations apply jd --local   # 本地
npx wrangler d1 migrations apply jd --remote  # 远程
```

### 认证

系统使用简单密码保护，默认密码 `qingyun2026`。可通过环境变量 `AUTH_PASSWORD` 或修改 `src/context/AuthContext.js` 和 `src/app/api/login/route.js` 更改。

## 📝 开发规范

### 代码风格

- 使用 ESLint 9 (flat config) 进行代码检查
- 所有客户端组件必须以 `"use client"` 开头
- 使用 shadcn/ui 组件库，遵循其设计规范

### 金额计算

```javascript
// 始终使用 Decimal.js 避免浮点数精度问题
import Decimal from "decimal.js";
import { cleanAmount } from "@/lib/utils";

const amount = new Decimal(cleanAmount(value));
```

### 商品编号处理

商品编号必须是字符串，使用 `cleanProductCode()` 处理 Excel 公式前缀：

```javascript
import { cleanProductCode } from "@/lib/utils";

const productCode = cleanProductCode(row["商品编号"]);
```

### API Routes

```javascript
export const runtime = 'edge';  // 必须在文件第一行

import { getRequestContext } from '@cloudflare/next-on-pages';

export async function GET(request) {
  const { env } = getRequestContext();
  const db = env.DB;
  // ...
}
```

### 状态管理

禁止直接修改 Context state，始终使用 actions：

```javascript
import { useSettlement } from "@/context/SettlementContext";

const { processedData, setProcessedData } = useSettlement();
// ✅ setProcessedData(newData)
// ❌ processedData.push(newItem)
```

### 样式规范

使用 shadcn/ui 语义化 CSS 变量：

```javascript
// ✅ bg-card text-foreground border-border
// ❌ bg-white text-gray-800 border-gray-200
```

### 文件处理

- **CSV 编码**: 先尝试 UTF-8，失败后尝试 GBK
- **Excel 导出**: 商品编号列设置为文本格式 (`numFmt: '@'`)

## 📄 许可证

MIT License
