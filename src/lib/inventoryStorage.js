"use client";

// localStorage 键名
const INVENTORY_STORAGE_KEY = "jd_bill_filter_inventory";

/**
 * 生成唯一ID
 * @returns {string} 唯一ID
 */
export const generateId = () => {
  return `inv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * 从localStorage获取库存数据
 * @returns {Array} 库存物品列表
 */
export const getInventoryFromStorage = () => {
  try {
    if (typeof window === "undefined") return [];

    const storedData = localStorage.getItem(INVENTORY_STORAGE_KEY);
    if (!storedData) return [];

    return JSON.parse(storedData);
  } catch (error) {
    console.error("获取库存数据失败:", error);
    return [];
  }
};

/**
 * 保存库存数据到localStorage
 * @param {Array} inventoryItems 库存物品列表
 * @returns {boolean} 是否保存成功
 */
export const saveInventoryToStorage = (inventoryItems) => {
  try {
    if (typeof window === "undefined") return false;

    localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(inventoryItems));
    return true;
  } catch (error) {
    console.error("保存库存数据失败:", error);
    return false;
  }
};

/**
 * 创建新的库存项
 * @param {Object} formData 表单数据
 * @returns {Object} 新的库存项
 */
export const createInventoryItem = (formData) => {
  const now = new Date().toISOString();

  return {
    id: generateId(),
    materialName: formData.materialName || "",
    quantity: parseInt(formData.quantity) || 0,
    purchaseBatch: formData.purchaseBatch || "",
    sku: formData.sku || "",
    unitPrice: parseFloat(formData.unitPrice) || 0, // 单价
    totalPrice: parseFloat(formData.totalPrice) || 0, // 总价
    taxRate: parseFloat(formData.taxRate) || 0, // 税率
    taxAmount: parseFloat(formData.taxAmount) || 0, // 税额
    invoiceNumber: formData.invoiceNumber || "", // 发票号码
    invoiceDate: formData.invoiceDate || "", // 开票日期
    warehouse: formData.warehouse || "", // 仓库
    createdAt: now,
    updatedAt: now,
  };
};

/**
 * 批量创建库存项
 * @param {Array} formDataArray 表单数据数组
 * @returns {Array} 新的库存项数组
 */
export const createMultipleInventoryItems = (formDataArray) => {
  return formDataArray.map((formData) => createInventoryItem(formData));
};

/**
 * 更新库存项
 * @param {Object} existingItem 现有库存项
 * @param {Object} formData 表单数据
 * @returns {Object} 更新后的库存项
 */
export const updateInventoryItem = (existingItem, formData) => {
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
    invoiceNumber:
      formData.invoiceNumber !== undefined
        ? formData.invoiceNumber || ""
        : existingItem.invoiceNumber,
    invoiceDate:
      formData.invoiceDate !== undefined
        ? formData.invoiceDate || ""
        : existingItem.invoiceDate,
    warehouse:
      formData.warehouse !== undefined
        ? formData.warehouse || ""
        : existingItem.warehouse,
    updatedAt: new Date().toISOString(),
  };
};

/**
 * 验证库存表单数据
 * @param {Object} formData 表单数据
 * @returns {Object} 验证结果 { isValid: boolean, errors: Array }
 */
export const validateInventoryForm = (formData) => {
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
};

/**
 * 批量验证库存表单数据
 * @param {Array} formDataArray 表单数据数组
 * @returns {Object} 验证结果 { isValid: boolean, errors: Array, itemErrors: Object }
 */
export const validateMultipleInventoryForms = (formDataArray) => {
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
};

/**
 * 根据ID查找库存项
 * @param {Array} inventoryItems 库存物品列表
 * @param {string} id 库存项ID
 * @returns {Object|null} 找到的库存项或null
 */
export const findInventoryItemById = (inventoryItems, id) => {
  return inventoryItems.find((item) => item.id === id) || null;
};

/**
 * 根据物料名称搜索库存项
 * @param {Array} inventoryItems 库存物品列表
 * @param {string} searchTerm 搜索词
 * @returns {Array} 匹配的库存项列表
 */
export const searchInventoryItems = (inventoryItems, searchTerm) => {
  if (!searchTerm || searchTerm.trim() === "") {
    return inventoryItems;
  }

  const term = searchTerm.toLowerCase().trim();

  return inventoryItems.filter(
    (item) =>
      item.materialName.toLowerCase().includes(term) ||
      (item.specification && item.specification.toLowerCase().includes(term)) ||
      item.purchaseBatch.toLowerCase().includes(term) ||
      (item.warehouse && item.warehouse.toLowerCase().includes(term)) ||
      (item.sku && item.sku.toLowerCase().includes(term))
  );
};

/**
 * 根据采购批号分组库存项
 * @param {Array} inventoryItems 库存物品列表
 * @returns {Object} 按采购批号分组的库存项
 */
export const groupInventoryByBatch = (inventoryItems) => {
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
};

/**
 * 实时更新库存项的SKU
 * @param {Array} inventoryItems 库存物品列表
 * @param {string} itemId 库存项ID
 * @param {string} newSku 新的SKU值
 * @returns {Array} 更新后的库存物品列表
 */
export const updateItemSku = (inventoryItems, itemId, newSku) => {
  return inventoryItems.map((item) => {
    if (item.id === itemId) {
      return {
        ...item,
        sku: newSku,
        updatedAt: new Date().toISOString(),
      };
    }
    return item;
  });
};

/**
 * 获取库存统计信息
 * @param {Array} inventoryItems 库存物品列表
 * @returns {Object} 统计信息
 */
export const getInventoryStats = (inventoryItems) => {
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
};

/**
 * 清空所有库存数据
 * @returns {boolean} 是否清空成功
 */
export const clearAllInventoryData = () => {
  try {
    if (typeof window === "undefined") return false;

    localStorage.removeItem(INVENTORY_STORAGE_KEY);
    return true;
  } catch (error) {
    console.error("清空库存数据失败:", error);
    return false;
  }
};
