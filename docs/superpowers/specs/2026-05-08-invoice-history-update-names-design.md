# 发票导出历史 - 批量更新发票名称功能设计

## 概述

在发票导出历史管理界面添加"更新发票名称"按钮，允许用户根据商品映射表批量更新历史记录中的商品名称。

## 需求背景

- 当前发票历史记录保存后，无法更新商品名称
- 商品映射表(`product_mappings`)中维护了SKU与发票名称(`invoice_name`)的映射关系
- 需要提供批量更新功能，保持历史记录名称与商品映射表同步

## 设计方案

### 1. API端点设计

**端点**: `POST /api/invoice-history/update-names`

**功能**: 根据商品映射表批量更新历史记录的商品名称

**逻辑**:
1. 从`product_mappings`表获取所有SKU和`invoice_name`映射
2. 更新`invoice_history_items`表中匹配的`name`字段
3. 返回更新的记录数

**请求体**: 无（自动更新所有匹配的记录）

**响应**: `{ updatedCount: number }`

**SQL更新逻辑**:
```sql
UPDATE invoice_history_items 
SET name = (
  SELECT pm.invoice_name 
  FROM product_mappings pm 
  WHERE pm.sku = invoice_history_items.sku
)
WHERE EXISTS (
  SELECT 1 
  FROM product_mappings pm 
  WHERE pm.sku = invoice_history_items.sku 
  AND pm.invoice_name IS NOT NULL
)
```

### 2. 前端组件设计

**组件**: `InvoiceHistoryManager`

**位置**: 在历史记录列表顶部，与"查看历史"标题同行

**交互流程**:
1. 点击按钮 → 显示加载状态
2. 调用`POST /api/invoice-history/update-names`
3. 成功后显示更新的记录数
4. 刷新历史记录列表

**UI设计**:
- 按钮样式：次要按钮（outline）
- 图标：刷新/更新图标（Lucide的`RefreshCw`或`Update`）
- 文本："更新发票名称"
- 加载状态：显示旋转图标和"更新中..."

### 3. 数据库设计

**无需修改数据库结构**

- 复用现有的`invoice_history_items.name`字段
- 复用现有的`product_mappings.invoice_name`字段
- 通过SQL JOIN操作匹配SKU并更新名称

## 实现细节

### 文件修改清单

1. **新建API端点**: `src/app/api/invoice-history/update-names/route.js`
   - 实现POST方法
   - 执行SQL批量更新
   - 返回更新的记录数

2. **修改组件**: `src/components/InvoiceHistoryManager.js`
   - 添加"更新发票名称"按钮
   - 实现点击处理函数
   - 添加加载状态管理
   - 调用API并刷新列表

### 错误处理

- API端点：捕获数据库错误，返回适当的错误响应
- 前端：显示错误提示，支持重试
- 网络错误：显示网络错误提示

### 测试场景

1. 正常更新：点击按钮，验证名称已更新
2. 无匹配记录：验证返回updatedCount为0
3. 部分匹配：验证只更新匹配的记录
4. 网络错误：验证错误提示显示
5. 加载状态：验证按钮显示加载状态

## 边界情况

1. 商品映射表中无对应SKU：保持原名称不变
2. 历史记录中无SKU字段：跳过该记录
3. 商品映射表中invoice_name为NULL：保持原名称不变
4. 多个历史记录有相同SKU：全部更新为相同的invoice_name

## 性能考虑

- 使用单条SQL语句批量更新，避免逐条更新
- 索引：确保`invoice_history_items.sku`和`product_mappings.sku`有索引
- 大量数据：考虑分批更新（但当前数据量较小，无需优化）

## 安全性

- 需要认证：复用现有的认证机制
- 输入验证：无需用户输入，自动匹配
- SQL注入：使用参数化查询（Cloudflare D1原生支持）

## 兼容性

- 向后兼容：不影响现有功能
- 数据迁移：无需迁移
- API版本：新端点，不影响现有API

## 验收标准

1. 用户可以在历史记录管理界面点击"更新发票名称"按钮
2. 点击后显示加载状态
3. 更新完成后显示更新的记录数
4. 历史记录列表自动刷新
5. 商品名称已根据商品映射表更新
6. 错误情况下显示适当的错误提示