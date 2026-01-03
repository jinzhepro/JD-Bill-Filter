"use client";

// 通过API调用MySQL操作

// 从MySQL数据库获取库存数据
export async function getInventoryFromDatabase() {
  try {
    const { getInventoryFromMySQL } = await import("@/lib/mysqlConnection");
    const result = await getInventoryFromMySQL();
    if (result.success) {
      return result.data;
    }
    console.error("从MySQL获取库存数据失败:", result.message);
    return [];
  } catch (error) {
    console.error("从MySQL获取库存数据失败:", error);
    return [];
  }
}

// 创建库存项
export function createInventoryItem(formData) {
  const now = new Date().toISOString();
  return {
    id: `inv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    materialName: formData.materialName || "",
    quantity: parseInt(formData.quantity) || 0,
    purchaseBatch: formData.purchaseBatch || "",
    sku: formData.sku || "",
    unitPrice: parseFloat(formData.unitPrice) || 0,
    totalPrice: parseFloat(formData.totalPrice) || 0,
    taxRate: parseFloat(formData.taxRate) || 0,
    taxAmount: parseFloat(formData.taxAmount) || 0,
    warehouse: formData.warehouse || "",
    createdAt: now,
    updatedAt: now,
  };
}

// 更新库存项
export function updateInventoryItem(existingItem, formData) {
  return {
    ...existingItem,
    materialName: formData.materialName || existingItem.materialName,
    quantity:
      formData.quantity !== undefined
        ? parseInt(formData.quantity) || 0
        : existingItem.quantity,
    purchaseBatch:
      formData.purchaseBatch !== undefined
        ? formData.purchaseBatch || ""
        : existingItem.purchaseBatch,
    sku: formData.sku !== undefined ? formData.sku || "" : existingItem.sku,
    unitPrice:
      formData.unitPrice !== undefined
        ? parseFloat(formData.unitPrice) || 0
        : existingItem.unitPrice,
    totalPrice:
      formData.totalPrice !== undefined
        ? parseFloat(formData.totalPrice) || 0
        : existingItem.totalPrice,
    taxRate:
      formData.taxRate !== undefined
        ? parseFloat(formData.taxRate) || 0
        : existingItem.taxRate,
    taxAmount:
      formData.taxAmount !== undefined
        ? parseFloat(formData.taxAmount) || 0
        : existingItem.taxAmount,
    warehouse:
      formData.warehouse !== undefined
        ? formData.warehouse || ""
        : existingItem.warehouse,
    updatedAt: new Date().toISOString(),
  };
}

// 验证单个库存表单
export function validateInventoryForm(formData) {
  const errors = [];

  if (!formData.materialName || formData.materialName.trim() === "") {
    errors.push("物料名称不能为空");
  }

  if (!formData.quantity || parseInt(formData.quantity) < 0) {
    errors.push("数量必须是非负整数");
  }

  if (!formData.purchaseBatch || formData.purchaseBatch.trim() === "") {
    errors.push("采购批号不能为空");
  }

  // 验证单价
  if (
    formData.unitPrice &&
    (isNaN(parseFloat(formData.unitPrice)) ||
      parseFloat(formData.unitPrice) < 0)
  ) {
    errors.push("单价必须是非负数");
  }

  // 验证总价
  if (
    formData.totalPrice &&
    (isNaN(parseFloat(formData.totalPrice)) ||
      parseFloat(formData.totalPrice) < 0)
  ) {
    errors.push("总价必须是非负数");
  }

  // 验证税率
  if (
    formData.taxRate &&
    (isNaN(parseFloat(formData.taxRate)) ||
      parseFloat(formData.taxRate) < 0 ||
      parseFloat(formData.taxRate) > 100)
  ) {
    errors.push("税率必须是0-100之间的数字");
  }

  // 验证税额
  if (
    formData.taxAmount &&
    (isNaN(parseFloat(formData.taxAmount)) ||
      parseFloat(formData.taxAmount) < 0)
  ) {
    errors.push("税额必须是非负数");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// 验证多个库存表单
export function validateMultipleInventoryForms(formDataArray) {
  const allErrors = [];
  const itemErrors = {};
  let isValid = true;

  formDataArray.forEach((formData, index) => {
    const validation = validateInventoryForm(formData);
    if (!validation.isValid) {
      isValid = false;
      itemErrors[index] = validation.errors;
      allErrors.push(`第 ${index + 1} 行: ${validation.errors.join(", ")}`);
    }
  });

  return {
    isValid,
    errors: allErrors,
    itemErrors,
  };
}

// 创建多个库存项
export function createMultipleInventoryItems(formDataArray) {
  return formDataArray.map((formData) => createInventoryItem(formData));
}

// 搜索库存项
export function searchInventoryItems(inventoryItems, searchTerm) {
  if (!searchTerm || searchTerm.trim() === "") {
    return inventoryItems;
  }

  const term = searchTerm.toLowerCase().trim();

  return inventoryItems.filter(
    (item) =>
      item.materialName.toLowerCase().includes(term) ||
      item.purchaseBatch.toLowerCase().includes(term) ||
      (item.warehouse && item.warehouse.toLowerCase().includes(term)) ||
      (item.sku && item.sku.toLowerCase().includes(term))
  );
}

// 按采购批号分组
export function groupInventoryByBatch(inventoryItems) {
  const grouped = {};

  inventoryItems.forEach((item) => {
    const batch = item.purchaseBatch || "未分组";
    if (!grouped[batch]) {
      grouped[batch] = [];
    }
    grouped[batch].push(item);
  });

  // 对每个批号内的物品按物料名称排序
  Object.keys(grouped).forEach((batch) => {
    grouped[batch].sort((a, b) => a.materialName.localeCompare(b.materialName));
  });

  return grouped;
}

// 获取库存统计信息
export function getInventoryStats(inventoryItems) {
  const stats = {
    totalItems: inventoryItems.length,
    totalQuantity: 0,
    totalBatches: new Set(inventoryItems.map((item) => item.purchaseBatch))
      .size,
  };

  inventoryItems.forEach((item) => {
    stats.totalQuantity += item.quantity;
  });

  return stats;
}
