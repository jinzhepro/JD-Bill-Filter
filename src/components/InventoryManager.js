"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import Button from "./ui/Button";
import { PDFUpload } from "./PDFUpload";
import { BatchInventoryAdd } from "./BatchInventoryAdd";
import {
  getInventoryFromStorage,
  saveInventoryToStorage,
  createInventoryItem,
  updateInventoryItem,
  validateInventoryForm,
  searchInventoryItems,
  getInventoryStats,
  groupInventoryByBatch,
  updateItemSku,
  validateMultipleInventoryForms,
  createMultipleInventoryItems,
} from "@/lib/inventoryStorage";

export function InventoryManager() {
  const {
    inventoryItems,
    inventoryForm,
    editingInventoryId,
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
    setInventoryMode,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState("");
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isBatchFormVisible, setIsBatchFormVisible] = useState(false);
  const [formErrors, setFormErrors] = useState([]);
  const [showPDFUpload, setShowPDFUpload] = useState(false);

  // 初始化时从localStorage加载数据
  useEffect(() => {
    const storedItems = getInventoryFromStorage();
    setInventoryItems(storedItems);
  }, [setInventoryItems]);

  // 保存数据到localStorage
  useEffect(() => {
    if (inventoryItems.length > 0) {
      saveInventoryToStorage(inventoryItems);
    }
  }, [inventoryItems]);

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

  // 处理编辑
  const handleEdit = (item) => {
    setInventoryForm({
      materialName: item.materialName,
      specification: item.specification,
      quantity: item.quantity.toString(),
      purchaseBatch: item.purchaseBatch,
      sku: item.sku || "",
    });
    setEditingInventoryId(item.id);
    setIsFormVisible(true);
    setFormErrors([]);
  };

  // 处理SKU实时更新
  const handleSkuChange = (itemId, newSku) => {
    const updatedItems = updateItemSku(inventoryItems, itemId, newSku);
    setInventoryItems(updatedItems);
    addLog(`已更新商品SKU`, "success");
  };

  // 处理删除
  const handleDelete = (id) => {
    const item = inventoryItems.find((item) => item.id === id);
    if (window.confirm(`确定要删除库存项 "${item.materialName}" 吗？`)) {
      deleteInventoryItem(id);
      addLog(`库存项 "${item.materialName}" 已删除`, "warning");
    }
  };

  // 处理取消
  const handleCancel = () => {
    resetInventoryForm();
    setEditingInventoryId(null);
    setIsFormVisible(false);
    setFormErrors([]);
  };

  // 获取过滤后的库存项
  const filteredItems = searchInventoryItems(inventoryItems, searchTerm);

  // 按采购批号分组
  const groupedItems = groupInventoryByBatch(filteredItems);

  // 获取统计信息
  const stats = getInventoryStats(inventoryItems);

  return (
    <div className="space-y-6">
      {/* 返回按钮和标题 */}
      <div className="flex justify-between items-center">
        <Button
          onClick={() => setInventoryMode(false)}
          className="bg-gray-200 text-gray-700 hover:bg-gray-300"
        >
          ← 返回主界面
        </Button>
        <h1 className="text-2xl font-bold text-white">库存管理系统</h1>
        <div></div>
      </div>

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
      </section>

      {/* 搜索和添加按钮 */}
      <section className="bg-white rounded-xl shadow-lg p-6 animate-fade-in">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="w-full md:w-1/2">
            <input
              type="text"
              placeholder="搜索物料名称、规格或采购批号..."
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
              onClick={() => setShowPDFUpload(!showPDFUpload)}
              className="w-full md:w-auto bg-purple-600 text-white hover:bg-purple-700"
            >
              {showPDFUpload ? "隐藏PDF上传" : "上传PDF发票"}
            </Button>
          </div>
        </div>
      </section>

      {/* PDF上传组件 */}
      {showPDFUpload && <PDFUpload />}

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
                  规格
                </label>
                <input
                  type="text"
                  name="specification"
                  value={inventoryForm.specification}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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

      {/* 库存列表 - 按采购批号分组 */}
      <section className="bg-white rounded-xl shadow-lg p-6 animate-fade-in">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          库存列表 ({filteredItems.length}) - 按采购批号分组
        </h2>

        {filteredItems.length === 0 ? (
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
                    <h3 className="font-semibold text-gray-800">
                      采购批号: {batch}
                    </h3>
                    <span className="text-sm text-gray-600">
                      共 {items.length} 种物品，总计{" "}
                      {items.reduce((sum, item) => sum + item.quantity, 0)} 件
                    </span>
                  </div>
                </div>

                {/* 批号下的物品列表 */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-3 text-left font-semibold text-primary-600">
                          物料名称
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-primary-600">
                          规格
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-primary-600">
                          数量
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-primary-600">
                          商品SKU
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-primary-600">
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
                          <td className="px-4 py-3">{item.materialName}</td>
                          <td className="px-4 py-3">
                            {item.specification || "-"}
                          </td>
                          <td className="px-4 py-3">{item.quantity}</td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={item.sku || ""}
                              onChange={(e) =>
                                handleSkuChange(item.id, e.target.value)
                              }
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 text-sm"
                              placeholder="输入SKU"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleEdit(item)}
                                className="px-3 py-1 text-xs bg-blue-500 text-white hover:bg-blue-600"
                              >
                                编辑
                              </Button>
                              <Button
                                onClick={() => handleDelete(item.id)}
                                className="px-3 py-1 text-xs bg-red-500 text-white hover:bg-red-600"
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
