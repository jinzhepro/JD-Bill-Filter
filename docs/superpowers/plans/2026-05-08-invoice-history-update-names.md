# 发票导出历史 - 批量更新发票名称功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在发票导出历史管理界面添加"更新发票名称"按钮，允许用户根据商品映射表批量更新历史记录中的商品名称。

**Architecture:** 创建新的API端点`POST /api/invoice-history/update-names`，根据商品映射表批量更新`invoice_history_items.name`字段。在`InvoiceHistoryManager`组件中添加按钮触发更新操作。

**Tech Stack:** Next.js App Router, React, Cloudflare D1, Lucide React icons

---

### Task 1: 创建API端点

**Files:**
- Create: `src/app/api/invoice-history/update-names/route.js`

- [ ] **Step 1: 创建API端点文件**

```javascript
export const runtime = 'edge';

import { getRequestContext } from '@cloudflare/next-on-pages';

export async function POST(request) {
  const { env } = getRequestContext();
  const db = env.DB;

  try {
    const result = await db.prepare(`
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
    `).run();

    return Response.json({ 
      success: true, 
      updatedCount: result.meta.changes 
    });
  } catch (error) {
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
```

- [ ] **Step 2: 验证API端点语法**

运行: `node -c src/app/api/invoice-history/update-names/route.js`
Expected: 无错误输出

- [ ] **Step 3: 提交API端点**

```bash
git add src/app/api/invoice-history/update-names/route.js
git commit -m "feat: 添加批量更新发票名称的API端点"
```

### Task 2: 修改InvoiceHistoryManager组件

**Files:**
- Modify: `src/components/InvoiceHistoryManager.js`

- [ ] **Step 1: 添加更新状态和处理函数**

在组件中添加更新状态和处理函数：

```javascript
const [updating, setUpdating] = useState(false);
```

在`handleDelete`函数后添加`handleUpdateNames`函数：

```javascript
const handleUpdateNames = async () => {
  setUpdating(true);
  try {
    const res = await fetch("/api/invoice-history/update-names", { method: "POST" });
    const data = await res.json();
    
    if (data.success) {
      toast({ title: `成功更新 ${data.updatedCount} 条记录的发票名称` });
      fetchHistory();
    } else {
      toast({ title: data.error, variant: "destructive" });
    }
  } catch (error) {
    console.error('操作失败:', error);
    toast({ title: "更新发票名称失败", variant: "destructive" });
  } finally {
    setUpdating(false);
  }
};
```

- [ ] **Step 2: 添加导入RefreshCw图标**

修改导入语句，添加`RefreshCw`图标：

```javascript
import { Eye, FileDown, Trash2, RefreshCw } from "lucide-react";
```

- [ ] **Step 3: 在组件顶部添加更新按钮**

在第一个`Card`组件前添加更新按钮：

```javascript
<div className="flex justify-end mb-4">
  <Button variant="outline" onClick={handleUpdateNames} disabled={updating}>
    <RefreshCw className={`w-4 h-4 mr-2 ${updating ? "animate-spin" : ""}`} />
    {updating ? "更新中..." : "更新发票名称"}
  </Button>
</div>
```

- [ ] **Step 4: 验证组件语法**

运行: `node -c src/components/InvoiceHistoryManager.js`
Expected: 无错误输出

- [ ] **Step 5: 提交组件修改**

```bash
git add src/components/InvoiceHistoryManager.js
git commit -m "feat: 在InvoiceHistoryManager中添加更新发票名称按钮"
```

### Task 3: 测试功能

**Files:**
- None (manual testing)

- [ ] **Step 1: 启动开发服务器**

运行: `npm run dev`
Expected: 服务器启动成功，访问 http://localhost:3000

- [ ] **Step 2: 访问发票页面**

导航到 http://localhost:3000/invoice，点击"查看历史"按钮打开历史记录弹窗

- [ ] **Step 3: 测试更新按钮**

点击"更新发票名称"按钮，验证：
1. 按钮显示加载状态（旋转图标和"更新中..."文本）
2. 成功后显示更新的记录数
3. 历史记录列表刷新

- [ ] **Step 4: 测试边界情况**

测试以下场景：
1. 无匹配记录：验证返回updatedCount为0
2. 部分匹配：验证只更新匹配的记录
3. 网络错误：验证错误提示显示

- [ ] **Step 5: 停止开发服务器**

运行: `Ctrl+C` 停止服务器

### Task 4: 代码质量检查

**Files:**
- None (lint check)

- [ ] **Step 1: 运行ESLint检查**

运行: `npm run lint`
Expected: 无错误或警告

- [ ] **Step 2: 修复ESLint问题（如果有）**

根据ESLint输出修复问题

- [ ] **Step 3: 提交最终代码**

```bash
git add .
git commit -m "feat: 完成批量更新发票名称功能"
```

## 验收标准检查

完成所有任务后，验证以下验收标准：

1. ✅ 用户可以在历史记录管理界面点击"更新发票名称"按钮
2. ✅ 点击后显示加载状态
3. ✅ 更新完成后显示更新的记录数
4. ✅ 历史记录列表自动刷新
5. ✅ 商品名称已根据商品映射表更新
6. ✅ 错误情况下显示适当的错误提示

## 注意事项

1. 确保`product_mappings.sku`和`invoice_history_items.sku`字段有索引以优化性能
2. 更新操作是批量执行的，无需用户确认
3. 只更新`product_mappings`表中存在的SKU对应的记录
4. 如果`invoice_name`为NULL，保持原名称不变