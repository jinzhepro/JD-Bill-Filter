"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { useInventory } from "@/context/InventoryContext";
import { Button } from "./ui/button.js";
import { BatchInventoryAdd } from "./BatchInventoryAdd";
import { TableImport } from "./TableImport";
import { DeductionRecords } from "./DeductionRecords";
import {
  createInventoryItem,
  updateInventoryItem,
  validateInventoryForm,
  searchInventoryItems,
  getInventoryStats,
  groupInventoryByBatch,
  validateMultipleInventoryForms,
  createMultipleInventoryItems,
} from "@/lib/inventoryStorage";
import {
  testConnection,
  createInventoryTable,
  pushInventoryToMySQL,
  getInventoryFromMySQL,
  clearInventoryInMySQL,
  getInventoryBatches,
  deleteBatch,
  healthCheck,
} from "@/lib/mysqlConnection";

export function InventoryManager() {
  const {
    inventoryItems,
    inventoryForm,
    editingInventoryId,
    isDbLoading,
    setInventoryItems,
    setInventoryForm,
    resetInventoryForm,
    setEditingInventoryId,
    addInventoryItem,
    addMultipleInventoryItems,
    updateInventoryItem: updateItem,
    deleteInventoryItem,
    addLog,
    setError,
    loadInventoryFromDB,
  } = useInventory();

  const [searchTerm, setSearchTerm] = useState("");
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isBatchFormVisible, setIsBatchFormVisible] = useState(false);
  const [isTableImportVisible, setIsTableImportVisible] = useState(false);
  const [isDeductionRecordsVisible, setIsDeductionRecordsVisible] =
    useState(false);
  const [formErrors, setFormErrors] = useState([]);
  const [isMySqlProcessing, setIsMySqlProcessing] = useState(false);
  const [mySqlStatus, setMySqlStatus] = useState("");

  // 在组件挂载时从数据库加载库存数据
  useEffect(() => {
    // 数据已经在AppContext中加载，这里不需要重复加载
  }, []);

  // 处理表单输入变化
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setInventoryForm({ [name]: value });
  };

  // 处理表单提交
  const handleSubmit = (e) => {
    e.preventDefault();

    // 验证表单
    const validation = validateInventoryForm(inventoryForm);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }

    setFormErrors([]);

    try {
      if (editingInventoryId) {
        // 更新现有项
        const existingItem = inventoryItems.find(
          (item) => item.id === editingInventoryId
        );
        const updatedItem = updateInventoryItem(existingItem, inventoryForm);
        updateItem(updatedItem);
        addLog(`库存项 "${inventoryForm.materialName}" 已更新`, "success");
      } else {
        // 添加新项
        const newItem = createInventoryItem(inventoryForm);
        addInventoryItem(newItem);
        addLog(`库存项 "${inventoryForm.materialName}" 已添加`, "success");
      }

      // 重置表单
      resetInventoryForm();
      setEditingInventoryId(null);
      setIsFormVisible(false);
    } catch (error) {
      setError(`保存库存项失败: ${error.message}`);
    }
  };

  // 批量添加库存项处理
  const handleBatchAdd = (items) => {
    try {
      addMultipleInventoryItems(items);
      addLog(`成功批量添加 ${items.length} 个库存项`, "success");
      setIsBatchFormVisible(false);
    } catch (error) {
      setError(`批量添加库存项失败: ${error.message}`);
    }
  };

  // 批量添加取消处理
  const handleBatchCancel = () => {
    setIsBatchFormVisible(false);
  };

  // 表格导入处理
  const handleTableImport = (items) => {
    try {
      addMultipleInventoryItems(items);
      addLog(`成功通过表格导入 ${items.length} 个库存项`, "success");
      setIsTableImportVisible(false);
    } catch (error) {
      setError(`表格导入库存项失败: ${error.message}`);
    }
  };

  // 表格导入取消处理
  const handleTableImportCancel = () => {
    setIsTableImportVisible(false);
  };

  // 清空数据库处理
  const handleClearDatabase = async () => {
    if (
      inventoryItems.length === 0 ||
      window.confirm(
        `确定要清空所有库存数据吗？此操作将删除 ${inventoryItems.length} 条库存记录，且无法恢复！`
      )
    ) {
      try {
        // 清空数据库中的数据
        const { clearInventoryInMySQL } = await import("@/lib/mysqlConnection");
        const result = await clearInventoryInMySQL();

        if (result.success) {
          // 清空成功后，重新从数据库加载数据
          await actions.loadInventoryFromDB();
          actions.addLog("库存数据已清空", LogType.SUCCESS);
        } else {
          actions.addLog(`清空库存数据失败: ${result.message}`, LogType.ERROR);
        }
        // 清空状态中的数据
        setInventoryItems([]);
        addLog("所有库存数据已清空", "warning");
      } catch (error) {
        setError(`清空数据库失败: ${error.message}`);
      }
    }
  };

  // 处理编辑
  const handleEdit = (item) => {
    setInventoryForm({
      materialName: item.materialName,
      quantity: item.quantity.toString(),
      purchaseBatch: item.purchaseBatch,
      sku: item.sku || "",
      unitPrice: item.unitPrice ? item.unitPrice.toString() : "",
      totalPrice: item.totalPrice ? item.totalPrice.toString() : "",
      taxRate: item.taxRate ? item.taxRate.toString() : "13",
      taxAmount: item.taxAmount ? item.taxAmount.toString() : "",
      warehouse: item.warehouse || "",
    });
    setEditingInventoryId(item.id);
    setIsFormVisible(true);
    setFormErrors([]);
  };

  // 处理删除
  const handleDelete = async (id, event) => {
    // 阻止事件冒泡
    if (event) {
      event.stopPropagation();
    }

    console.log("handleDelete被调用，ID:", id);

    const item = inventoryItems.find((item) => item.id === id);
    if (
      item &&
      window.confirm(`确定要删除库存项 "${item.materialName}" 吗？`)
    ) {
      try {
        console.log("开始调用deleteInventoryItem，ID:", id);
        await deleteInventoryItem(id);
        console.log("deleteInventoryItem调用完成");
        addLog(`库存项 "${item.materialName}" 已删除`, "warning");
      } catch (error) {
        console.error("删除库存项失败:", error);
        setError(`删除库存项失败: ${error.message}`);
      }
    }
  };

  // 立即更新商品名称处理
  const handleUpdateProductNames = async () => {
    if (inventoryItems.length === 0) {
      setError("没有库存数据可以更新");
      return;
    }

    if (
      window.confirm(
        `确定要从数据库更新所有库存项的商品名称吗？此操作将根据数据库中的商品表自动更新商品名称，无法撤销！`
      )
    ) {
      try {
        // 从数据库获取商品数据
        const { getProductsFromMySQL } = await import("@/lib/mysqlConnection");
        const productsResult = await getProductsFromMySQL();

        if (!productsResult.success) {
          throw new Error(productsResult.message || "获取商品数据失败");
        }

        const products = productsResult.data;
        if (!products || products.length === 0) {
          setError("数据库中没有商品数据，请先添加商品");
          return;
        }

        // 创建SKU到商品名称的映射
        const skuMap = {};
        products.forEach((product) => {
          if (product.sku && product.productName) {
            skuMap[product.sku.toString()] = product.productName;
          }
        });

        // 使用数据库中的商品数据更新库存项的商品名称
        const updatedItems = inventoryItems.map((item) => {
          if (item.sku && skuMap[item.sku.toString()]) {
            return {
              ...item,
              materialName: skuMap[item.sku.toString()],
            };
          }
          return item;
        });

        // 更新状态
        setInventoryItems(updatedItems);

        // 保存到MySQL数据库
        const { pushInventoryToMySQL } = await import("@/lib/mysqlConnection");
        await pushInventoryToMySQL(updatedItems);

        // 统计更新数量
        const updatedCount = updatedItems.filter(
          (item, index) =>
            item.materialName !== inventoryItems[index].materialName
        ).length;

        addLog(
          `成功从数据库更新 ${updatedCount} 个库存项的商品名称`,
          "success"
        );
      } catch (error) {
        setError(`从数据库更新商品名称失败: ${error.message}`);
      }
    }
  };

  // 处理取消
  const handleCancel = () => {
    resetInventoryForm();
    setEditingInventoryId(null);
    setIsFormVisible(false);
    setFormErrors([]);
  };

  // API健康检查
  const handleHealthCheck = async () => {
    setIsMySqlProcessing(true);
    setMySqlStatus("正在进行API健康检查...");

    try {
      const result = await healthCheck();
      if (result.success) {
        setMySqlStatus("API健康检查通过");
        addLog(`API健康检查通过: ${result.message}`, "success");
      } else {
        setMySqlStatus("API健康检查失败");
        addLog(`API健康检查失败: ${result.message}`, "error");
      }
    } catch (error) {
      setMySqlStatus("API健康检查出错");
      addLog(`API健康检查出错: ${error.message}`, "error");
    } finally {
      setIsMySqlProcessing(false);
    }
  };

  // 测试MySQL连接
  const handleTestMySqlConnection = async () => {
    setIsMySqlProcessing(true);
    setMySqlStatus("正在测试MySQL连接...");

    try {
      const result = await testConnection();
      if (result.success) {
        setMySqlStatus("MySQL连接测试成功");
        addLog(result.message, "success");
      } else {
        setMySqlStatus("MySQL连接测试失败");
        addLog(result.message, "error");
      }
    } catch (error) {
      setMySqlStatus("MySQL连接测试出错");
      addLog(`MySQL连接测试出错: ${error.message}`, "error");
    } finally {
      setIsMySqlProcessing(false);
    }
  };

  // 推送数据到MySQL
  const handlePushToMySQL = async () => {
    if (inventoryItems.length === 0) {
      setError("没有库存数据可以推送");
      return;
    }

    if (
      !window.confirm(
        `确定要将 ${inventoryItems.length} 条库存数据推送到MySQL数据库吗？此操作将会覆盖数据库中的现有数据！`
      )
    ) {
      return;
    }

    setIsMySqlProcessing(true);
    setMySqlStatus("正在推送数据到MySQL...");

    try {
      // 先创建表（如果不存在）
      const tableResult = await createInventoryTable();
      if (!tableResult.success) {
        throw new Error(tableResult.message);
      }

      // 推送数据
      const pushResult = await pushInventoryToMySQL(inventoryItems);
      if (pushResult.success) {
        setMySqlStatus("数据推送成功");
        addLog(pushResult.message, "success");
      } else {
        throw new Error(pushResult.message);
      }
    } catch (error) {
      setMySqlStatus("数据推送失败");
      addLog(`数据推送失败: ${error.message}`, "error");
    } finally {
      setIsMySqlProcessing(false);
    }
  };

  // 从MySQL拉取数据
  const handlePullFromMySQL = async () => {
    if (
      !window.confirm(
        "确定要从MySQL数据库拉取库存数据吗？此操作将会覆盖当前本地数据！"
      )
    ) {
      return;
    }

    setIsMySqlProcessing(true);
    setMySqlStatus("正在从MySQL拉取数据...");

    try {
      const items = await loadInventoryFromDB();
      setMySqlStatus("数据拉取成功");
      addLog(`成功从数据库拉取 ${items.length} 条库存数据`, "success");
    } catch (error) {
      setMySqlStatus("数据拉取失败");
      addLog(`数据拉取失败: ${error.message}`, "error");
    } finally {
      setIsMySqlProcessing(false);
    }
  };

  // 清空MySQL数据
  const handleClearMySQL = async () => {
    if (
      !window.confirm("确定要清空MySQL数据库中的库存数据吗？此操作无法撤销！")
    ) {
      return;
    }

    setIsMySqlProcessing(true);
    setMySqlStatus("正在清空MySQL数据...");

    try {
      const result = await clearInventoryInMySQL();
      if (result.success) {
        setMySqlStatus("MySQL数据清空成功");
        addLog(result.message, "warning");
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      setMySqlStatus("MySQL数据清空失败");
      addLog(`MySQL数据清空失败: ${error.message}`, "error");
    } finally {
      setIsMySqlProcessing(false);
    }
  };

  // 处理复制物料名称
  const handleCopyMaterialName = async (materialName, event) => {
    // 阻止事件冒泡
    if (event) {
      event.stopPropagation();
    }

    try {
      await navigator.clipboard.writeText(materialName);
      toast.success(`物料名称 "${materialName}" 已复制到剪贴板`);
    } catch (error) {
      console.error("复制失败:", error);
      toast.error(`复制物料名称失败: ${error.message}`);
    }
  };

  // 复制批次列数据
  const handleCopyBatchColumn = async (columnName, batchName, event) => {
    // 阻止事件冒泡
    if (event) {
      event.stopPropagation();
    }

    try {
      // 获取当前批次的数据
      const batchItems = groupedItems[batchName] || [];
      let columnData = [];

      // 根据列名提取数据
      switch (columnName) {
        case "materialName":
          columnData = batchItems.map((item) => item.materialName || "");
          break;
        case "quantity":
          columnData = batchItems.map((item) => item.quantity.toString());
          break;
        case "unitPrice":
          columnData = batchItems.map((item) =>
            item.unitPrice ? parseFloat(item.unitPrice).toFixed(2) : ""
          );
          break;
        case "totalPrice":
          columnData = batchItems.map((item) =>
            item.totalPrice ? parseFloat(item.totalPrice).toFixed(2) : ""
          );
          break;
        case "taxRate":
          columnData = batchItems.map((item) =>
            item.taxRate ? `${item.taxRate}%` : ""
          );
          break;
        case "sku":
          columnData = batchItems.map((item) => item.sku || "");
          break;
        case "warehouse":
          columnData = batchItems.map((item) => item.warehouse || "");
          break;
        case "purchaseBatch":
          columnData = batchItems.map((item) => item.purchaseBatch || "");
          break;
        default:
          columnData = batchItems.map((item) => item[columnName] || "");
      }

      // 将数据格式化为列形式（每行一个值）
      const columnText = columnData.join("\n");

      await navigator.clipboard.writeText(columnText);
      toast.success(
        `已复制批次 "${batchName}" 的 ${columnName} 列数据 (${columnData.length} 行)`
      );
    } catch (error) {
      console.error("复制批次列数据失败:", error);
      toast.error(`复制批次列数据失败: ${error.message}`);
    }
  };

  // 获取过滤后的库存项
  const filteredItems = searchInventoryItems(inventoryItems, searchTerm);

  // 按采购批号分组
  const groupedItems = groupInventoryByBatch(filteredItems);

  // 获取统计信息
  const stats = getInventoryStats(inventoryItems);

  // 计算总价
  const totalAmount = inventoryItems.reduce((sum, item) => {
    const price = parseFloat(item.totalPrice);
    return sum + (isNaN(price) ? 0 : price);
  }, 0);

  // 删除批次处理
  const handleDeleteBatch = async (batchName) => {
    if (!batchName) {
      setError("缺少批次名称");
      return;
    }

    if (
      window.confirm(
        `确定要删除批次 "${batchName}" 吗？此操作将删除该批次下的所有库存项，且无法恢复！`
      )
    ) {
      try {
        const result = await deleteBatch(batchName);
        if (result.success) {
          addLog(`批次 "${batchName}" 已删除`, "warning");
          // 重新加载数据
          await loadInventoryFromDB();
        } else {
          throw new Error(result.message);
        }
      } catch (error) {
        setError(`删除批次失败: ${error.message}`);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* 统计信息 */}
      <section className="bg-white rounded-xl shadow-lg p-6 animate-fade-in">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">库存统计</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {stats.totalItems}
            </div>
            <div className="text-sm text-gray-600">总品种</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {stats.totalQuantity}
            </div>
            <div className="text-sm text-gray-600">总数量</div>
          </div>
          <div className="text-center p-3 bg-indigo-50 rounded-lg">
            <div className="text-2xl font-bold text-indigo-600">
              {stats.totalBatches}
            </div>
            <div className="text-sm text-gray-600">采购批次数</div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mt-4">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              ¥{totalAmount.toFixed(2)}
            </div>
            <div className="text-sm text-gray-600">总金额</div>
          </div>
        </div>
      </section>

      {/* 搜索和添加按钮 */}
      <section className="bg-white rounded-xl shadow-lg p-6 animate-fade-in">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="w-full md:w-1/2">
            <input
              type="text"
              placeholder="搜索物料名称、采购批号、仓库或SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setIsFormVisible(true)}
              className="w-full md:w-auto"
            >
              添加库存项
            </Button>
            <Button
              onClick={() => setIsBatchFormVisible(true)}
              className="w-full md:w-auto bg-green-600 text-white hover:bg-green-700"
            >
              批量添加库存项
            </Button>
            <Button
              onClick={() => setIsTableImportVisible(true)}
              className="w-full md:w-auto bg-purple-600 text-white hover:bg-purple-700"
            >
              表格导入
            </Button>
            <Button
              onClick={handleUpdateProductNames}
              className="w-full md:w-auto bg-blue-600 text-white hover:bg-blue-700"
              disabled={inventoryItems.length === 0}
              title="从数据库商品表拉取最新的商品名称并更新库存项"
            >
              立即更新商品名称
            </Button>
            <Button
              onClick={() => setIsDeductionRecordsVisible(true)}
              className="w-full md:w-auto bg-orange-600 text-white hover:bg-orange-700"
            >
              查看扣减记录
            </Button>
            <Button
              onClick={handleClearDatabase}
              className="w-full md:w-auto bg-red-600 text-white hover:bg-red-700"
              disabled={inventoryItems.length === 0 || isDbLoading}
            >
              清空数据库
            </Button>
          </div>
        </div>
      </section>

      {/* MySQL数据库操作区域 */}
      <section className="bg-white rounded-xl shadow-lg p-6 animate-fade-in">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          MySQL数据库操作
        </h2>

        {/* MySQL状态显示 */}
        {mySqlStatus && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-blue-600 text-sm">{mySqlStatus}</div>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={handleHealthCheck}
            disabled={isMySqlProcessing}
            className="bg-yellow-600 text-white hover:bg-yellow-700"
          >
            {isMySqlProcessing ? "检查中..." : "API健康检查"}
          </Button>

          <Button
            onClick={handleTestMySqlConnection}
            disabled={isMySqlProcessing}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            {isMySqlProcessing ? "测试中..." : "测试MySQL连接"}
          </Button>

          <Button
            onClick={handlePushToMySQL}
            disabled={isMySqlProcessing || inventoryItems.length === 0}
            className="bg-green-600 text-white hover:bg-green-700"
          >
            {isMySqlProcessing ? "推送中..." : "推送数据到MySQL"}
          </Button>

          <Button
            onClick={handlePullFromMySQL}
            disabled={isMySqlProcessing}
            className="bg-purple-600 text-white hover:bg-purple-700"
          >
            {isMySqlProcessing ? "拉取中..." : "从MySQL拉取数据"}
          </Button>

          <Button
            onClick={handleClearMySQL}
            disabled={isMySqlProcessing}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {isMySqlProcessing ? "清空中..." : "清空MySQL数据"}
          </Button>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          <p className="font-medium mb-2">MySQL数据库连接信息：</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            <div>• 主机: localhost:3306</div>
            <div>• 数据库: testdb</div>
            <div>• 用户: root</div>
            <div>• 表名: inventory</div>
          </div>
        </div>
      </section>

      {/* 添加/编辑表单 */}
      {isFormVisible && (
        <section className="bg-white rounded-xl shadow-lg p-6 animate-fade-in">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            {editingInventoryId ? "编辑库存项" : "添加库存项"}
          </h2>

          {formErrors.length > 0 && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              {formErrors.map((error, index) => (
                <div key={index} className="text-red-600 text-sm">
                  {error}
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  物料名称 *
                </label>
                <input
                  type="text"
                  name="materialName"
                  value={inventoryForm.materialName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  数量 *
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={inventoryForm.quantity}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  采购批号 *
                </label>
                <input
                  type="text"
                  name="purchaseBatch"
                  value={inventoryForm.purchaseBatch}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  商品SKU
                </label>
                <input
                  type="text"
                  name="sku"
                  value={inventoryForm.sku}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="可选，输入商品SKU"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  单价
                </label>
                <input
                  type="number"
                  name="unitPrice"
                  value={inventoryForm.unitPrice}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="可选，输入单价"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  总价
                </label>
                <input
                  type="number"
                  name="totalPrice"
                  value={inventoryForm.totalPrice}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="可选，输入总价"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  税率 (%)
                </label>
                <input
                  type="number"
                  name="taxRate"
                  value={inventoryForm.taxRate}
                  onChange={handleInputChange}
                  min="0"
                  max="100"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="可选，输入税率"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  税额
                </label>
                <input
                  type="number"
                  name="taxAmount"
                  value={inventoryForm.taxAmount}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="可选，输入税额"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  仓库
                </label>
                <input
                  type="text"
                  name="warehouse"
                  value={inventoryForm.warehouse}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="可选，输入仓库名称"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                onClick={handleCancel}
                className="bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                取消
              </Button>
              <Button type="submit">
                {editingInventoryId ? "更新" : "添加"}
              </Button>
            </div>
          </form>
        </section>
      )}

      {/* 批量添加表单 */}
      {isBatchFormVisible && (
        <BatchInventoryAdd
          onAddItems={handleBatchAdd}
          onCancel={handleBatchCancel}
        />
      )}

      {/* 表格导入表单 */}
      {isTableImportVisible && (
        <TableImport
          onImportItems={handleTableImport}
          onCancel={handleTableImportCancel}
        />
      )}

      {/* 库存扣减记录 */}
      {isDeductionRecordsVisible && (
        <DeductionRecords onClose={() => setIsDeductionRecordsVisible(false)} />
      )}

      {/* 库存列表 - 按采购批号分组 */}
      <section className="bg-white rounded-xl shadow-lg p-6 animate-fade-in">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          库存列表 ({filteredItems.length}) - 按采购批号分组
        </h2>

        {isDbLoading ? (
          <div className="text-center py-8 text-gray-500">
            正在从数据库加载库存数据...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchTerm ? "没有找到匹配的库存项" : "暂无库存数据，请添加库存项"}
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedItems).map(([batch, items]) => (
              <div
                key={batch}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                {/* 批号标题 */}
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-800">
                        采购批号: {batch}
                      </h3>
                      <Button
                        onClick={() => handleDeleteBatch(batch)}
                        className="px-2 py-1 text-xs bg-red-500 text-white hover:bg-red-600"
                        title="删除整个批次"
                      >
                        删除批次
                      </Button>
                    </div>
                    <div className="text-right text-sm text-gray-600">
                      <div>
                        共 {items.length} 种物品，总计{" "}
                        {items.reduce((sum, item) => sum + item.quantity, 0)} 件
                      </div>
                      <div className="mt-1">
                        总价: ¥
                        {items
                          .reduce(
                            (sum, item) =>
                              sum + (parseFloat(item.totalPrice) || 0),
                            0
                          )
                          .toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 批号下的物品列表 */}
                <div>
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th
                          className="px-3 py-3 text-left font-semibold text-primary-600 cursor-pointer hover:bg-blue-50"
                          onClick={(e) =>
                            handleCopyBatchColumn("materialName", batch, e)
                          }
                          title={`点击复制批次 "${batch}" 的物料名称列数据`}
                        >
                          物料名称 📋
                        </th>
                        <th
                          className="px-3 py-3 text-left font-semibold text-primary-600 cursor-pointer hover:bg-blue-50"
                          onClick={(e) =>
                            handleCopyBatchColumn("quantity", batch, e)
                          }
                          title={`点击复制批次 "${batch}" 的数量列数据`}
                        >
                          数量 📋
                        </th>
                        <th
                          className="px-3 py-3 text-left font-semibold text-primary-600 cursor-pointer hover:bg-blue-50"
                          onClick={(e) =>
                            handleCopyBatchColumn("unitPrice", batch, e)
                          }
                          title={`点击复制批次 "${batch}" 的单价列数据`}
                        >
                          单价 📋
                        </th>
                        <th
                          className="px-3 py-3 text-left font-semibold text-primary-600 cursor-pointer hover:bg-blue-50"
                          onClick={(e) =>
                            handleCopyBatchColumn("totalPrice", batch, e)
                          }
                          title={`点击复制批次 "${batch}" 的总价列数据`}
                        >
                          总价 📋
                        </th>
                        <th
                          className="px-3 py-3 text-left font-semibold text-primary-600 cursor-pointer hover:bg-blue-50"
                          onClick={(e) =>
                            handleCopyBatchColumn("taxRate", batch, e)
                          }
                          title={`点击复制批次 "${batch}" 的税率列数据`}
                        >
                          税率 📋
                        </th>
                        <th
                          className="px-3 py-3 text-left font-semibold text-primary-600 cursor-pointer hover:bg-blue-50"
                          onClick={(e) =>
                            handleCopyBatchColumn("sku", batch, e)
                          }
                          title={`点击复制批次 "${batch}" 的SKU列数据`}
                        >
                          商品SKU 📋
                        </th>
                        <th
                          className="px-3 py-3 text-left font-semibold text-primary-600 cursor-pointer hover:bg-blue-50"
                          onClick={(e) =>
                            handleCopyBatchColumn("warehouse", batch, e)
                          }
                          title={`点击复制批次 "${batch}" 的仓库列数据`}
                        >
                          仓库 📋
                        </th>
                        <th
                          className="px-3 py-3 text-left font-semibold text-primary-600 cursor-pointer hover:bg-blue-50"
                          onClick={(e) =>
                            handleCopyBatchColumn("purchaseBatch", batch, e)
                          }
                          title={`点击复制批次 "${batch}" 的采购批号列数据`}
                        >
                          采购批号 📋
                        </th>
                        <th className="px-3 py-3 text-left font-semibold text-primary-600">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-gray-200 hover:bg-gray-50"
                        >
                          <td
                            className="px-3 py-3 truncate"
                            title={item.materialName}
                          >
                            <span className="flex-1 truncate">
                              {item.materialName}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            {item.quantity}
                          </td>
                          <td className="px-3 py-3 text-right">
                            {item.unitPrice
                              ? `¥${parseFloat(item.unitPrice).toFixed(2)}`
                              : "-"}
                          </td>
                          <td className="px-3 py-3 text-right">
                            {item.totalPrice
                              ? `¥${parseFloat(item.totalPrice).toFixed(2)}`
                              : "-"}
                          </td>
                          <td className="px-3 py-3 text-center">
                            {item.taxRate ? `${item.taxRate}%` : "-"}
                          </td>
                          <td className="px-3 py-3 truncate" title={item.sku}>
                            {item.sku || "-"}
                          </td>
                          <td
                            className="px-3 py-3 truncate"
                            title={item.warehouse}
                          >
                            {item.warehouse || "-"}
                          </td>
                          <td
                            className="px-3 py-3 truncate"
                            title={item.purchaseBatch}
                          >
                            {item.purchaseBatch || "-"}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex gap-1">
                              <Button
                                onClick={() => handleEdit(item)}
                                className="px-2 py-1 text-xs bg-blue-500 text-white hover:bg-blue-600"
                              >
                                编辑
                              </Button>
                              <Button
                                onClick={(e) => handleDelete(item.id, e)}
                                className="px-2 py-1 text-xs bg-red-500 text-white hover:bg-red-600"
                              >
                                删除
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
