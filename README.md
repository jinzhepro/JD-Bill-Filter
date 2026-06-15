# 京东对账单处理系统

基于 Next.js 15 的京东对账单处理系统，支持京东万商和食堂商城两大业务线，提供 Excel/CSV 文件导入、智能订单合并、结算单处理、发票管理、采购单管理等功能。部署于 Cloudflare Pages + D1 数据库。

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

### 业务选择

- 🏠 首页提供京东万商 / 食堂商城两大业务入口

### 京东万商

#### 结算单处理

- 📤 批量导入结算单文件（Excel/CSV）
- 🔄 自动合并相同 SKU 的货款和数量
- 🧮 智能处理售后卖家赔付费（按货款比例分摊）
- 📊 支持多文件批量处理
- 📥 导出合并后的结算单
- ✏️ 手动调整结算单数据（支持相同 SKU 合并计算）

#### 供应商转换

- 🏢 供应商信息管理
- 🔍 根据匹配字符串自动识别供应商
- 📝 自定义供应商匹配规则
- 🔄 批量供应商信息转换

#### 商品与品牌管理

- 📦 商品 SKU 映射管理（支持批量导入）
- 🏷️ 品牌发票名称映射
- 🔍 商品搜索与分页

#### 发票管理

- 📄 发票开具（客户信息导入、明细行管理）
- 📋 发票历史记录与导出
- 📊 采购单批次管理

### 食堂商城

- 🍽️ 食堂采购单管理（订单导入、金额计算、含税处理）
- 📄 食堂发票开具与历史管理
- 🏪 食堂供应商管理
- 🧾 合同编号管理

### 数据展示

- 📊 表格化展示处理结果
- 🎨 支持排序和复制列数据
- 📈 实时统计货款、直营服务费、收入等指标
- 🔍 数据变化详情查看

### 认证与安全

- 🔐 基于密码的登录认证
- 🍪 Session Token 验证（30天有效期）
- 🛡️ AuthGuard 路由保护

## 🚀 技术栈

- **框架**: Next.js 15.5.2 (App Router)
- **语言**: JavaScript（无 TypeScript）
- **UI 库**: shadcn/ui (New York 风格) + Tailwind CSS 3.4.18
- **状态管理**: React Context + useReducer
- **数值计算**: Decimal.js（高精度数学）
- **文件处理**: ExcelJS (Excel), 原生 API (CSV)
- **Word 解析**: Mammoth.js
- **图标**: Lucide React
- **部署**: Cloudflare Pages + D1 数据库
- **Node.js**: 24.14.1（Volta 管理）

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
npm run dev          # 等同于 npm run pages:dev
```

### Cloudflare Pages 本地开发

```bash
npm run pages:dev    # 端口 8788，自动先 build
```

### 构建生产版本

```bash
npm run build
```

### 代码质量检查

```bash
npm run lint
```

## 📁 项目结构

```
JD-Bill-Filter/
├── src/
│   ├── app/                            # Next.js App Router 页面
│   │   ├── page.js                    # 首页（业务选择：京东万商 / 食堂商城）
│   │   ├── jd-business/              # 京东万商（结算单处理、供应商等）
│   │   ├── canteen-purchase/         # 食堂采购单管理
│   │   ├── canteen-invoice/          # 食堂发票管理
│   │   ├── suppliers/                # 供应商管理
│   │   ├── products/                 # 商品管理
│   │   ├── brands/                   # 品牌管理
│   │   ├── invoice/                  # 发票开具
│   │   ├── invoice-history/          # 发票历史
│   │   ├── purchase/                 # 采购单管理
│   │   ├── login/                    # 登录页
│   │   ├── api/                      # API Routes（D1 数据库操作）
│   │   │   ├── brand-mappings/       # 品牌映射 API
│   │   │   ├── canteen-invoice-history/  # 食堂发票历史 API
│   │   │   ├── canteen-purchase-orders/  # 食堂采购单 API
│   │   │   ├── check-auth/          # 认证检查 API
│   │   │   ├── invoice-history/     # 发票历史 API
│   │   │   ├── login/               # 登录 API
│   │   │   ├── products/            # 商品 API
│   │   │   └── purchase-orders/     # 采购单 API
│   │   ├── layout.js                 # 根布局
│   │   └── globals.css               # 全局样式
│   ├── components/                     # React 组件
│   │   ├── ui/                        # shadcn/ui 基础组件
│   │   ├── MainLayout.js              # 主布局
│   │   ├── Sidebar.js                 # 京东万商侧边栏
│   │   ├── CanteenLayout.js           # 食堂商城布局
│   │   ├── CanteenSidebar.js          # 食堂商城侧边栏
│   │   ├── SimpleLayout.js            # 简单布局
│   │   ├── AuthGuard.js               # 路由认证保护
│   │   ├── ErrorBoundary.js           # 错误边界
│   │   ├── SettlementContent.js       # 结算单内容展示
│   │   ├── SettlementFolderUpload.js  # 结算单文件上传
│   │   ├── SettlementProcessModal.js  # 结算单处理弹窗
│   │   ├── SettlementResultDisplay.js # 结算单结果展示
│   │   ├── SupplierManager.js         # 供应商管理
│   │   ├── ProductManager.js          # 商品管理
│   │   ├── BrandManager.js            # 品牌管理
│   │   ├── InvoiceForm.js             # 发票表单
│   │   ├── InvoiceHistoryManager.js   # 发票历史管理
│   │   ├── InvoiceImportModal.js      # 发票导入弹窗
│   │   ├── InvoiceLineItems.js        # 发票明细行
│   │   ├── HuanyuInvoiceModal.js      # 环宇发票弹窗
│   │   ├── CustomerImportModal.js     # 客户导入弹窗
│   │   ├── PurchaseOrderManager.js    # 采购单管理
│   │   ├── CanteenPurchaseOrderManager.js # 食堂采购单管理
│   │   ├── CanteenInvoiceModal.js     # 食堂发票弹窗
│   │   ├── DataDisplay.js             # 数据展示
│   │   ├── FileUploader.js            # 文件上传
│   │   ├── VirtualAssetUpload.js      # 虚拟资产上传
│   │   └── VirtualAssetResultDisplay.js # 虚拟资产结果展示
│   ├── context/                        # React Context 状态管理
│   │   ├── SettlementContext.js        # 结算单状态 (useReducer)
│   │   ├── InvoiceContext.js           # 发票状态
│   │   └── AuthContext.js              # 认证状态
│   ├── lib/                            # 核心业务逻辑
│   │   ├── auth.js                     # 认证逻辑（密码哈希、Session 管理）
│   │   ├── utils.js                    # 工具函数
│   │   ├── constants.js                # 常量定义
│   │   ├── settlementProcessor.js      # 结算单处理
│   │   ├── settlementHelpers.js        # 结算单辅助函数
│   │   ├── invoiceExporter.js          # 发票导出
│   │   ├── excelHandler.js             # Excel 处理
│   │   ├── fileValidation.js           # 文件验证
│   │   ├── reconciliation.js           # 对账逻辑
│   │   ├── virtualAssetProcessor.js    # 虚拟资产处理
│   │   └── logger.js                   # 日志工具
│   ├── data/                           # 静态数据
│   │   └── suppliers.js                # 供应商数据
│   └── hooks/
│       └── use-toast.js                # Toast Hook
├── migrations/                          # D1 数据库迁移文件
├── scripts/
│   └── init-password.mjs               # 密码初始化脚本
├── wrangler.toml                        # Cloudflare 配置
├── package.json
├── tailwind.config.js
├── next.config.mjs
├── components.json
├── eslint.config.mjs
├── jsconfig.json
└── AGENTS.md
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
npm run pages:deploy  # 构建 + 部署到 Cloudflare Pages
```

### D1 数据库迁移

```bash
npx wrangler d1 migrations apply jd --local   # 本地
npx wrangler d1 migrations apply jd --remote  # 远程
```

### D1 直接 SQL 查询

```bash
npx wrangler d1 execute jd --local --command="SQL"
```

### 认证初始化

密码存储在 D1 数据库 `auth_settings` 表中。首次部署需运行初始化脚本设置密码：

```bash
node scripts/init-password.mjs <你的密码>
```

## 📝 开发规范

### 代码风格

- 使用 ESLint 9 (flat config) 进行代码检查
- 所有客户端组件必须以 `"use client"` 开头
- 使用 shadcn/ui 组件库，遵循其设计规范
- 无 TypeScript — 所有代码为 `.js`/`.jsx`

### 金额计算

必须使用 `Decimal.js`，先用 `cleanAmountString()` 去货币符号/千分符再运算：

```javascript
import Decimal from "decimal.js";
import { cleanAmountString, formatAmountJSX, formatAmount } from "@/lib/utils";

const amount = new Decimal(cleanAmountString(value));
// 显示金额：formatAmountJSX(value) 返回带语义颜色的 <span>
// 纯文本：formatAmount(value) 返回字符串
```

> ⚠️ 不要使用 `cleanAmount()`（内部用 `parseFloat`，有精度损失）

### 商品编号处理

商品编号必须是字符串，使用 `cleanProductCode()` 处理 Excel 公式前缀：

```javascript
import { cleanProductCode } from "@/lib/utils";

const productCode = cleanProductCode(row["商品编号"]);
```

### API Routes

每个 API Route 文件**第一行**必须声明 edge runtime：

```javascript
export const runtime = "edge";

import { getRequestContext } from "@cloudflare/next-on-pages";

export async function GET(request) {
  const { env } = getRequestContext();
  const db = env.DB;
  // ...
}
```

### 状态管理

禁止直接修改 Context state，始终使用提供的 action/setter：

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
