# 从业务痛点到技术实践：Next.js 15 + Cloudflare D1 构建电商结算系统

> 在电商业务中，结算单处理是一个看似简单却充满细节的业务场景。本文将分享如何使用 Next.js 15、React 19、Cloudflare D1 等现代技术栈构建一个高效、可靠的电商结算系统，重点探讨技术选型决策、架构设计和核心挑战的解决方案。

## 一、引言：业务痛点与解决方案

在京东平台的电商业务中，每个月都会产生大量的结算单文件，这些 Excel/CSV 文件包含了订单的货款、服务费、售后赔付费等多种费用明细。传统的手工处理方式面临着几个核心痛点：

- **效率低下**：需要人工打开多个文件，逐条核对数据
- **合并计算复杂**：相同 SKU 的货款需要合并累加，容易遗漏或重复
- **分摊逻辑困难**：售后赔付费需要按货款比例分摊到每个商品，手工计算耗时且易错
- **发票开具繁琐**：需要人工匹配商品信息，填写发票明细
- **精度问题隐患**：Excel 中的浮点数运算可能导致金额误差，在财务系统中不可接受

面对这些痛点，我们决定构建一个自动化结算系统。经过技术调研，最终选择了 **Next.js 15 (App Router) + React 19 + Cloudflare Pages + D1 数据库** 的技术栈。本文将深入探讨这个技术选型的决策过程、架构设计思路，以及在实践中遇到的核心挑战和解决方案。

---

## 二、技术选型决策：为什么选择这个技术栈？

技术选型不是盲目追新，而是基于业务需求和技术权衡的结果。以下是我们在每个技术点的决策过程。

### 2.1 框架选择：Next.js 15 App Router

**为什么选择 Next.js 15？**

- **最新版本的特性优势**：React 19 的性能提升、更好的并发渲染支持
- **App Router 的优势**：相比 Pages Router，提供了更清晰的文件结构、Server Components 支持、更好的数据获取模式
- **Edge Runtime 支持**：为部署到 Cloudflare Pages 提供基础

**App Router vs Pages Router 的决策**：

我们选择 App Router 的关键原因是：

- Server Components 可以减少客户端 JS bundle 大小
- 更符合 React 的未来发展方向
- 虽然 API 稍有不同，但学习成本可控

### 2.2 部署平台：Cloudflare Pages + D1

**为什么选择 Cloudflare 而非 Vercel？**

这是最关键的决策之一。虽然 Vercel 是 Next.js 的官方推荐平台，但我们最终选择了 Cloudflare：

| 对比维度     | Cloudflare Pages         | Vercel                         |
| ------------ | ------------------------ | ------------------------------ |
| 数据库方案   | D1 (Edge SQLite，免费)   | 需要第三方数据库服务           |
| 成本         | 免费额度高，适合中小项目 | 免费额度有限，生产环境成本较高 |
| Edge Runtime | 天生支持，性能优异       | 支持，但部分功能受限           |
| 全球 CDN     | Cloudflare 的核心优势    | 同样优秀                       |

**D1 SQLite 的限制与应对策略**：

D1 是 Cloudflare 推出的 Edge SQLite 数据库，有以下限制：

- 不支持部分高级 SQL 特性（如部分 JOIN 操作）
- 数据库大小限制（目前 500MB）
- Edge Runtime 环境限制（不能使用 Node.js API）

我们的应对策略：

- 简化数据模型，避免复杂查询
- 将大部分计算逻辑放在前端（Client Side）
- 只在数据库存储必要的映射配置和历史记录

### 2.3 状态管理：React Context + useReducer

**为什么不用 Redux/Zustand？**

在这个项目中，我们选择了 React Context + useReducer，原因是：

- 业务场景相对简单，主要是文件上传、数据处理、结果展示
- Context API 已经足够应对
- 减少第三方依赖，降低 bundle 大小

**多个 Context 的职责划分**：

我们设计了 3 个独立的 Context，职责清晰：

- `SettlementContext`：结算单核心状态（文件上传、处理逻辑）
- `InvoiceContext`：发票开具状态（明细管理、导出逻辑）
- `AuthContext`：认证状态管理

每个 Context 都遵循 `useReducer` 模式，禁止直接修改 state，必须通过 actions：

```javascript
// ✅ 正确做法：通过 action 更新状态
const { setProcessedData } = useSettlement();
setProcessedData(newData);

// ❌ 错误做法：直接修改 state
processedData.push(newItem); // 禁止！
```

### 2.4 其他关键库的选择

- **Decimal.js**：财务系统必备，解决 JavaScript 浮点数精度问题
- **ExcelJS**：Excel 文件处理，支持读写和格式设置
- **shadcn/ui**：快速构建 UI，基于 Tailwind CSS，组件质量高

---

## 三、架构设计：如何设计一个可维护的业务系统

清晰的架构设计是可维护性的基础。我们将系统分为四个层次，职责明确。

### 3.1 分层架构设计

```
┌─────────────────────────────────────────┐
│   UI Layer (Components)                  │
│   - Pages (App Router: /, /invoice, etc)│
│   - UI Components (shadcn/ui)           │
│   - Business Components                 │
│     (SettlementForm, InvoiceForm...)    │
├─────────────────────────────────────────┤
│   State Management (Context)             │
│   - SettlementContext                   │
│   - InvoiceContext                      │
│   - AuthContext                         │
├─────────────────────────────────────────┤
│   Business Logic (Lib)                   │
│   - settlementProcessor.js              │
│   - invoiceExporter.js                  │
│   - excelHandler.js                     │
│   - utils.js                            │
├─────────────────────────────────────────┤
│   Data Layer (API + D1)                  │
│   - Edge API Routes                     │
│     (/api/products, /api/invoice...)   │
│   - Cloudflare D1 Database              │
│     (product_mappings, invoice_history)│
└─────────────────────────────────────────┘
```

**架构图说明**：

这个分层架构的核心思想是：

1. **UI Layer** 只负责展示和交互，不包含业务逻辑
2. **State Management** 管理应用状态，提供统一的数据流
3. **Business Logic** 处理核心业务算法，独立于 UI 和数据层
4. **Data Layer** 处理数据持久化，API Routes 都在 Edge Runtime 运行

### 3.2 核心模块职责

**结算单处理模块** (`settlementProcessor.js`)：

这是系统的核心，负责：

- 数据验证（检查必需列）
- 数据合并算法（相同 SKU 累加）
- 服务费计算（直营服务费、交易服务费）
- 赔付费分摊（按货款比例分配）

**发票管理模块** (`InvoiceContext.js` + `invoiceExporter.js`)：

负责发票开具流程：

- 发票明细数据结构设计
- 多月份分组导出（当前月单独文件，其他月合并）
- 历史记录管理（存储到 D1）

**文件处理模块** (`excelHandler.js`)：

处理文件导入导出：

- Excel/CSV 解析（编码自动检测）
- 导出格式化（商品编号设为文本格式）

### 3.3 数据流设计

整个系统的数据流遵循清晰的路径：

```
文件上传 → 数据解析 → 业务处理 → 结果展示 → 导出
    ↓           ↓           ↓           ↓        ↓
 FormData   ExcelJS    Processor   Context    ExcelJS
```

Context State 的更新遵循 `Action → Reducer → New State` 的单向数据流，避免状态混乱。

### 3.4 路由设计

页面路由与功能模块一一对应：

| 页面路由     | 功能模块     | 核心 Context       |
| ------------ | ------------ | ------------------ |
| `/`          | 结算单处理   | SettlementContext  |
| `/invoice`   | 发票开具     | InvoiceContext     |
| `/suppliers` | 供应商转换   | 无（静态数据）     |
| `/products`  | 商品映射管理 | 无（API 直接调用） |
| `/brands`    | 品牌映射管理 | 无                 |

API Routes 都遵循 RESTful 设计：

- `GET /api/products` - 获取商品列表
- `POST /api/products` - 新增商品
- `PUT /api/products/:id` - 更新商品
- `DELETE /api/products/:id` - 删除商品

所有 API Routes 必须添加 Edge Runtime 标记：

```javascript
export const runtime = "edge"; // 必须在文件第一行

export async function GET(request) {
  const { env } = getRequestContext();
  const db = env.DB;
  // 数据库操作...
}
```

---

## 四、核心技术挑战与解决方案

在开发过程中，我们遇到了四个核心技术挑战，每个挑战都涉及技术权衡和设计决策。

### 4.1 挑战一：Edge Runtime 的限制与应对

**问题分析**：

Cloudflare Edge Runtime 不支持 Node.js API，这带来了几个限制：

- 不能使用 `fs` 模块访问文件系统
- 部分 npm 包依赖 Node.js API，无法直接使用
- 执行时间有限制（不能长时间阻塞）

**解决方案**：

1. **使用浏览器原生 API 处理文件**：

传统 Next.js 项目可能使用 `fs` 读取上传文件，但在 Edge Runtime 中必须使用 FormData API：

```javascript
export const runtime = "edge";

export async function POST(request) {
  const formData = await request.formData();
  const file = formData.get("file");

  // 使用浏览器 API 而非 fs
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // 使用 ExcelJS 解析
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
}
```

2. **ExcelJS 的 Edge 兼容方案**：

ExcelJS 默认依赖部分 Node.js API，我们通过配置使其兼容 Edge Runtime。关键是不使用 `fs`，而是直接传递 ArrayBuffer。

3. **API 设计优化**：

避免单个 API 执行大量操作，改为批量接口：

- 批量添加商品：一次请求添加多条，减少数据库操作次数
- 批量更新发票明细：使用 `addLineItems(items)` 而非逐条添加

### 4.2 挑战二：高精度金额计算

**问题分析**：

JavaScript 的浮点数精度问题是经典陷阱：

```javascript
0.1 + 0.2; // 0.30000000000000004
(1.005).toFixed(2); // "1.00" 而非 "1.01"
```

在财务系统中，这种误差是不可接受的，尤其是：

- 多次累加后的误差放大
- 分摊计算涉及除法，精度问题更严重
- 用户对账时会发现金额不一致

**解决方案**：

1. **引入 Decimal.js 库**：

Decimal.js 提供任意精度的数学运算，完美解决精度问题：

```javascript
import Decimal from "decimal.js";
import { cleanAmountString } from "@/lib/utils";

// 错误做法：使用原生 JavaScript
const total = amounts.reduce((sum, val) => sum + parseFloat(val), 0);

// 正确做法：使用 Decimal.js
const total = amounts.reduce(
  (sum, val) => sum.plus(new Decimal(cleanAmountString(val))),
  new Decimal(0),
);
```

注意：我们封装了 `cleanAmountString()` 函数，避免 `parseFloat` 的精度丢失：

```javascript
export function cleanAmountString(value) {
  if (typeof value === "number") {
    return String(value);
  }
  // 直接移除货币符号，返回字符串，不经 parseFloat
  return value.replace(/[¥￥$,\s]/g, "") || "0";
}

// 使用示例
new Decimal(cleanAmountString("¥1,234.56")); // 精确保留 1234.56
```

2. **所有金额计算都使用 Decimal**：

在项目中，我们严格规定：

- 任何金额累加、相减、相乘、相除都必须使用 Decimal
- 禁止直接使用 `parseFloat` 或 `Number` 进行金额计算
- 最终展示时转换为字符串 `toString()`

这个决策虽然增加了代码复杂度，但彻底消除了精度问题。

### 4.3 挑战三：大规模文件处理

**问题分析**：

文件处理涉及三个难点：

- 大文件上传（系统限制 50MB）
- CSV 编码自动检测（可能是 UTF-8 或 GBK）
- Excel 公式前缀处理（Excel 自动添加 `="..."`）

**解决方案**：

1. **分块读取文件**：

虽然目前系统支持的最大文件是 50MB，但我们采用了流式处理思路：

- 使用 ArrayBuffer 一次性读取，但避免多次解析
- 处理逻辑尽量高效，避免内存泄漏

2. **编码检测逻辑**：

CSV 文件可能是 UTF-8 或 GBK（中文 Windows 系统常用），我们实现了自动检测：

```javascript
// 先尝试 UTF-8
let text = await file.text();
let data = parseCSV(text);

// 如果解析失败（出现乱码），尝试 GBK
if (hasInvalidChars(data)) {
  const buffer = await file.arrayBuffer();
  const decoder = new TextDecoder("gbk");
  text = decoder.decode(buffer);
  data = parseCSV(text);
}
```

3. **商品编号清理函数**：

Excel 会自动为商品编号添加公式前缀 `="123456"`，这会导致数据匹配失败。我们封装了清理函数：

```javascript
export function cleanProductCode(value) {
  if (value === null || value === undefined) {
    return "";
  }
  const strValue = String(value);

  // 处理格式：="123456" 或="数字"
  if (strValue.startsWith("=") && strValue.includes('"')) {
    const match = strValue.match(/^="([^"]+)"$/);
    if (match) {
      return match[1];
    }
  }
  return strValue;
}

// 使用示例
cleanProductCode('="123456"'); // "123456"
cleanProductCode(789012); // "789012"
```

同时，导出 Excel 时将商品编号列设置为文本格式，避免再次被 Excel 自动转换：

```javascript
worksheet.getColumn("商品编号").eachCell((cell) => {
  cell.numFmt = "@"; // 文本格式
});
```

### 4.4 挑战四：复杂业务逻辑设计

**问题分析**：

结算单处理的核心业务逻辑非常复杂：

- 相同 SKU 的货款需要合并累加（金额 + 数量）
- 售后赔付费需要按货款比例分摊到每个 SKU
- 多种服务费类型（直营服务费、交易服务费）需要单独统计

**解决方案**：

我们采用了**分步骤处理**的设计思路，将复杂逻辑拆解为清晰的步骤：

**处理流程图**：

```
原始数据
    ↓
【步骤1】数据验证
    ├─ 检查必需列（商品编号、金额列）
    └─ 过滤"货款"记录（feeCode === 30）
    ↓
【步骤2】服务费收集
    ├─ 直营服务费：按 SKU 分组累加
    └─ 交易服务费：按 SKU 分组累加
    ↓
【步骤3】货款合并
    ├─ 相同 SKU 累加金额
    └─ 相同 SKU 累加数量
    ↓
【步骤4】赔付费分摊
    ├─ 计算赔付费总额
    ├─ 计算每个 SKU 的货款占比
    └─ 按比例分摊赔付费
    ↓
【步骤5】最终计算
    ├─ 货款 = 应结金额 - 分摊赔付费
    └─ 收入 = 货款 + 直营服务费
    ↓
处理结果
```

**核心代码片段**：

```javascript
// 步骤1：过滤出货款记录
const paymentRecords = data.filter((row) => row["费用名称"] === "货款");

// 步骤2：按 SKU 分组合并
const groupedBySku = {};
paymentRecords.forEach((row) => {
  const sku = cleanProductCode(row["商品编号"]);
  if (!groupedBySku[sku]) {
    groupedBySku[sku] = { amount: new Decimal(0), quantity: 0 };
  }
  groupedBySku[sku].amount = groupedBySku[sku].amount.plus(
    new Decimal(cleanAmountString(row["应结金额"])),
  );
  groupedBySku[sku].quantity += parseInt(row["数量"] || 0);
});

// 步骤3：计算赔付费总额
const compensationRecords = data.filter((row) =>
  row["费用名称"].includes("售后卖家赔付费"),
);
const totalCompensation = compensationRecords.reduce(
  (sum, row) => sum.plus(new Decimal(cleanAmountString(row["应结金额"]))),
  new Decimal(0),
);

// 步骤4：按比例分摊
const totalPayment = Object.values(groupedBySku).reduce(
  (sum, item) => sum.plus(item.amount),
  new Decimal(0),
);

Object.keys(groupedBySku).forEach((sku) => {
  const ratio = groupedBySku[sku].amount.dividedBy(totalPayment);
  const allocatedCompensation = totalCompensation.times(ratio);
  groupedBySku[sku].finalAmount = groupedBySku[sku].amount.minus(
    allocatedCompensation,
  );
});
```

这种分步骤的设计优势：

- 每个步骤职责清晰，易于理解和维护
- 可以单独测试每个步骤
- 新增服务费类型时只需在相应步骤添加逻辑

---

## 五、部署与性能优化

### 5.1 Cloudflare Pages 部署流程

部署到 Cloudflare Pages 需要遵循特定的流程：

1. **构建 Pages 输出**：

```bash
npm run pages:build  # 使用 @cloudflare/next-on-pages
```

2. **D1 数据库迁移**：

```bash
# 本地开发
npx wrangler d1 migrations apply jd --local

# 生产环境
npx wrangler d1 migrations apply jd --remote
```

3. **环境变量配置**：

在 Cloudflare Pages 设置中配置：

- `AUTH_PASSWORD`：认证密码

4. **自动部署**：

连接 GitHub 仓库，每次 push 到 main 分支自动触发部署。

### 5.2 性能优化策略

**前端优化**：

- React 19 自动优化并发渲染
- shadcn/ui 组件体积小，性能好
- 大数据量表格考虑虚拟滚动（未来优化方向）

**后端优化**：

- Edge Runtime 的冷启动极快（几十毫秒）
- API 批量操作减少请求次数
- D1 数据库查询简单高效

**文件处理优化**：

- 流式读取避免内存占用过大
- 一次解析，避免重复处理

### 5.3 监控与错误处理

**错误边界设计**：

使用 React Error Boundary 捕获渲染错误：

```javascript
// 所有页面都包裹在 ErrorBoundary 中
<ErrorBoundary fallback={<ErrorFallback />}>
  <SettlementContent />
</ErrorBoundary>
```

**用户友好的错误提示**：

所有错误都通过 toast 提示，包含清晰的错误信息：

```javascript
toast({
  title: "处理失败",
  description: "缺少必要的列: 商品编号，请确保上传的是京东结算单原始文件",
  variant: "destructive",
});
```

---

## 六、总结与反思

### 6.1 项目成果

通过这个项目，我们实现了：

- **效率提升**：从手工处理数小时缩短到几分钟
- **准确性保障**：高精度计算彻底消除金额误差
- **可维护性**：清晰的架构设计，易于扩展和维护

### 6.2 技术收获

在技术层面，我们获得了宝贵的实践经验：

- **Next.js 15 App Router**：理解了 Server Components 和 Client Components 的边界
- **Edge Runtime 开发**：掌握了 Edge Runtime 的限制和应对策略
- **架构设计**：学会了如何设计可维护的业务系统架构
- **性能优化**：理解了 Edge 计算的性能优势

### 6.3 未来优化方向

项目仍有改进空间：

- **引入测试框架**：目前只有手动测试，需要自动化测试保障质量
- **性能监控**：添加性能指标监控，及时发现瓶颈
- **移动端适配**：目前主要面向桌面端，未来可考虑移动端
- **支持更多平台**：扩展到其他电商平台的结算单处理

### 6.4 给开发者的建议

基于这个项目的经验，我给开发者几点建议：

1. **技术选型要匹配业务需求**：不要盲目追新，要基于实际需求权衡
2. **架构设计要考虑可维护性**：清晰的分层和职责划分是长期维护的基础
3. **边缘计算是未来趋势**：Cloudflare D1 和 Edge Runtime 代表了新的技术范式
4. **精度问题在财务系统中至关重要**：Decimal.js 是必备工具，不要依赖浮点数运算

---

## 结语

这个项目从业务痛点出发，通过合理的技术选型和清晰的架构设计，构建了一个高效、可靠的电商结算系统。在实践中遇到的每个挑战，都促使我们深入思考技术权衡和设计决策。

技术的价值在于解决实际问题。希望本文的分享能给正在构建类似系统的开发者带来一些启发。如果你也在处理电商业务场景，或者对 Next.js 15 + Cloudflare 技术栈感兴趣，欢迎交流讨论。

---

**项目仓库**：[JD-Bill-Filter](https://github.com/yourusername/JD-Bill-Filter)  
**技术栈**：Next.js 15.5.2 / React 19.2.0 / Cloudflare Pages + D1 / Decimal.js / ExcelJS  
**开发时间**：2026年4月-5月
