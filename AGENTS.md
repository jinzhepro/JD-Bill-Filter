# AGENTS.md - AI Agent 开发指南

## 项目概述

**JD Bill Filter** - 京东结算单处理系统（中文界面）

**技术栈**: Next.js 16.0.10 (App Router), React 19.2.0, JavaScript (无 TypeScript), Tailwind CSS 3.4.18, shadcn/ui (New York 风格), Decimal.js, ExcelJS

**Node 版本**: Volta 管理 (24.14.1)。最低要求：Node.js 18+

## 命令

```bash
npm run dev      # 开发服务器 (http://localhost:3000)
npm run build    # 生产构建
npm start        # 生产服务器
npm run lint     # ESLint 9 flat config
```

**无测试框架** - 仅手动测试。

## 关键规则（必须遵守）

### 1. 状态管理
- **SettlementContext** (`src/context/SettlementContext.js`) 是主要状态管理器
- **禁止直接修改 state** - 始终使用 Context actions (`setProcessedData()`, `setError()` 等)
- 所有 Context 值必须用 `useMemo` 包装

```javascript
import { useSettlement } from "@/context/SettlementContext";

function MyComponent() {
  const { processedData, setProcessedData } = useSettlement();
  // ✅ 正确
  setProcessedData(newData);
  // ❌ 错误 - 直接修改 state
  processedData.push(newItem);
}
```

### 2. 金额计算
- **必须使用 Decimal.js** 进行金额计算（禁止使用浮点数）

```javascript
import Decimal from "decimal.js";
import { cleanAmount } from "@/lib/utils";

const amount = new Decimal(cleanAmount(value));
const total = amount.plus(new Decimal(10));
```

### 3. 商品编号处理
- **必须是字符串** - Excel 会自动转换为数字
- 使用 `cleanProductCode()` 处理 Excel 公式前缀：`="123456"` → `"123456"`
- Excel 公式单元格返回 `{ formula: '...', result: ... }` 对象

```javascript
import { cleanProductCode } from "@/lib/utils";

const productCode = cleanProductCode(row["商品编号"]);
```

### 4. 组件要求
- 所有客户端组件必须以 `"use client"` 开头
- 所有异步操作必须使用 try-catch 错误处理

## 文件处理

- 类型：`.xlsx`, `.xls`, `.csv` (最大 50MB)
- CSV 编码：先尝试 UTF-8，失败后尝试 GBK
- Excel 导出：商品编号列设置为文本格式 (`numFmt: '@'`)
- 无数据库 - 所有数据在内存中处理

## 样式规范

仅使用 shadcn/ui 语义化 CSS 变量：

```javascript
// ✅ 推荐 - 使用语义化类名
<div className="bg-card text-foreground border-border" />

// ❌ 避免 - 使用自定义颜色
<div className="bg-white text-gray-800 border-gray-200" />
```

## 核心工具函数 (`src/lib/utils.js`)

| 函数 | 用途 |
|------|------|
| `cn(...inputs)` | 合并 Tailwind 类名 |
| `cleanAmount(value)` | 清理货币字符串 (¥, $, 逗号) |
| `cleanProductCode(value)` | 处理 Excel 公式前缀 |
| `formatAmount(value, forcePositive)` | 格式化金额显示 |

## 核心业务逻辑

### 结算单处理流程 (`src/lib/settlementProcessor.js`)

1. **数据验证**: 检查必需列（商品编号、金额列）
2. **过滤**: 只处理"货款"记录
3. **合并**: 按 SKU 合并应结金额和数量
4. **直营服务费**: 按商品编号分组累加
5. **售后赔付费**: 计算总额，按货款比例分摊
6. **最终计算**:
   - 货款 = 应结金额 - 分摊的赔付费
   - 收入 = 货款 + 直营服务费

### Excel 处理 (`src/lib/excelHandler.js`)

```javascript
import { readFile, downloadExcel } from "@/lib/excelHandler";

// 读取文件
const data = await readFile(file, fileType);

// 导出 Excel
await downloadExcel(data, fileName, totals, dataChanges);
```

### 供应商转换 (`src/data/suppliers.js`)

```javascript
import { findSupplierByMatchString, convertTextToSuppliers } from "@/data/suppliers";

// 根据匹配字符串查找供应商
const supplier = findSupplierByMatchString(text);

// 批量转换
const results = convertTextToSuppliers(text);
```

## 项目结构

```
src/
├── app/                    # Next.js 页面
│   ├── page.js            # 首页（结算单处理）
│   ├── suppliers/         # 供应商转换页面
│   ├── layout.js          # 根布局
│   └── globals.css        # 全局样式
├── components/            # React 组件
│   ├── ui/               # shadcn/ui 基础组件
│   ├── SettlementContent.js        # 结算单内容
│   ├── SettlementResultDisplay.js  # 结果展示
│   ├── SupplierManager.js # 供应商管理
│   ├── FileUploader.js    # 文件上传
│   └── ...
├── context/              # React Context 状态管理
│   ├── SettlementContext.js # 结算单状态（核心）
│   ├── SupplierContext.js # 供应商状态
│   ├── ThemeContext.js   # 主题状态
│   └── LoadingContext.js # 全局加载状态
├── lib/                  # 核心业务逻辑
│   ├── settlementProcessor.js # 结算单处理
│   ├── excelHandler.js   # Excel 处理
│   ├── utils.js          # 工具函数
│   └── constants.js      # 常量定义
├── data/                 # 静态数据
│   └── suppliers.js      # 供应商配置
└── hooks/                # 自定义 Hooks
    └── use-toast.js      # Toast 提示
```

## 导入顺序

```javascript
// 1. React
import React, { useState } from "react";

// 2. 第三方库
import Decimal from "decimal.js";
import ExcelJS from "exceljs";

// 3. 项目内部（使用 @/ 别名）
import { useSettlement } from "@/context/SettlementContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// 4. 相对路径
import { MyComponent } from "./MyComponent";
```

## 常量定义 (`src/lib/constants.js`)

```javascript
// 金额列（按优先级排序）
SETTLEMENT_AMOUNT_COLUMNS = ["实际金额", "结算金额", "金额"];

// 数量列
SETTLEMENT_QUANTITY_COLUMN = "数量";

// 费用名称过滤（只处理"货款"）
SETTLEMENT_FEE_NAME_FILTER = "货款";

// 直营服务费
SETTLEMENT_SELF_OPERATION_FEE = "直营服务费";

// 导出格式
NUMERIC_COLUMNS = ["应结金额", "直营服务费", "数量"];
PRODUCT_CODE_COLUMNS = ["商品编号", "SKU"];
```

## 开发注意事项

### 1. Context 使用陷阱

```javascript
// ❌ 错误 - 直接修改 state
state.processedData.push(newItem);

// ✅ 正确 - 使用 Context action
setProcessedData([...processedData, newItem]);

// ✅ 正确 - 使用 useMemo 派生计算
const totalCount = useMemo(() => {
  return processedData.reduce((sum, item) => sum + item.count, 0);
}, [processedData]);
```

### 2. 金额计算陷阱

```javascript
// ❌ 错误 - 浮点数精度问题
const total = 0.1 + 0.2; // 0.30000000000000004

// ✅ 正确 - 使用 Decimal.js
const total = new Decimal(0.1).plus(new Decimal(0.2)); // "0.3"
```

### 3. Excel 公式处理

```javascript
// Excel 公式单元格返回对象
const cellValue = row["商品编号"];
// 可能是：{ formula: '="123456"', result: '123456' }

// ✅ 正确 - 使用 cleanProductCode 处理
const productCode = cleanProductCode(cellValue);
```

### 4. 错误处理模式

```javascript
try {
  const result = await someAsyncOperation();
  // 处理结果
} catch (error) {
  console.error("操作失败:", error);
  setError(error.message);
  addLog(`操作失败：${error.message}`, LogType.ERROR);
}
```

## 调试技巧

### 1. 查看 Context 状态

```javascript
import { useSettlement } from "@/context/SettlementContext";

function DebugComponent() {
  const settlement = useSettlement();
  console.log("Settlement Context:", settlement);
  return null;
}
```

### 2. 验证数据处理

```javascript
// 在关键处理步骤添加日志
console.log("原始数据:", data);
console.log("合并后:", mergedData);
console.log("最终结果:", result);
```

## 常见问题

### Q: 商品编号显示为科学计数法？
A: 导出时使用 `numFmt: '@'` 强制设置为文本格式

### Q: 金额计算精度丢失？
A: 确保所有金额计算都使用 Decimal.js，不要使用原生 JavaScript 数字

### Q: CSV 文件中文乱码？
A: 系统会自动尝试 UTF-8 和 GBK 编码，无需手动处理

### Q: 如何添加新的供应商？
A: 在 `src/data/suppliers.js` 的 `SUPPLIERS` 数组中添加配置

## 性能优化

- 使用 `useMemo` 缓存派生状态
- 避免在渲染函数中创建新对象
- 大数据量时使用虚拟滚动（如需要）
- 文件处理使用 Web Worker（未来优化方向）

## 安全注意事项

- ✅ 文件大小限制（50MB）
- ✅ 文件类型验证
- ✅ 无数据库依赖
- ⚠️ 生产环境建议添加身份验证

## 扩展开发

### 添加新的费用类型

1. 在 `constants.js` 中添加常量
2. 在 `settlementProcessor.js` 中添加处理逻辑
3. 在 UI 组件中添加显示逻辑

### 添加新的导出格式

1. 在 `excelHandler.js` 中添加导出函数
2. 处理列映射和格式化
3. 在 UI 中添加导出按钮

## 测试建议

虽然项目没有测试框架，但建议：
- 手动测试所有核心功能
- 使用真实数据验证计算准确性
- 测试边界情况（空数据、大数据量等）
