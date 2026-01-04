"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSupplier } from "@/context/SupplierContext";
import Button from "./ui/Button";
import Modal from "./ui/Modal";

export default function SupplierManager() {
  const {
    suppliers,
    isLoading,
    error,
    loadSuppliers,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    clearError,
    getSupplierById,
  } = useSupplier();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    supplierId: "",
    matchString: "",
  });

  // 组件挂载时加载数据
  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  // 重置表单
  const resetForm = useCallback(() => {
    setFormData({
      name: "",
      supplierId: "",
      matchString: "",
    });
    setEditingSupplier(null);
    clearError();
  }, [clearError]);

  // 打开添加模态框
  const handleAddClick = useCallback(() => {
    resetForm();
    setIsAddModalOpen(true);
  }, [resetForm]);

  // 打开编辑模态框
  const handleEditClick = useCallback(
    (supplier) => {
      const supplierData = getSupplierById(supplier.id);
      if (supplierData) {
        setEditingSupplier(supplierData);
        setFormData({
          name: supplierData.name,
          supplierId: supplierData.supplierId,
          matchString: supplierData.matchString || "",
        });
        setIsEditModalOpen(true);
      }
    },
    [getSupplierById]
  );

  // 关闭模态框
  const handleCloseModal = useCallback(() => {
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    resetForm();
  }, [resetForm]);

  // 处理表单输入变化
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  // 处理添加供应商
  const handleAddSupplier = useCallback(() => {
    const success = addSupplier(formData);
    if (success) {
      handleCloseModal();
    }
  }, [addSupplier, formData, handleCloseModal]);

  // 处理更新供应商
  const handleUpdateSupplier = useCallback(() => {
    if (!editingSupplier) return;

    const success = updateSupplier(editingSupplier.id, formData);
    if (success) {
      handleCloseModal();
    }
  }, [editingSupplier, updateSupplier, formData, handleCloseModal]);

  // 处理删除供应商
  const handleDeleteSupplier = useCallback(
    (supplier) => {
      if (window.confirm(`确定要删除供应商 "${supplier.name}" 吗？`)) {
        deleteSupplier(supplier.id);
      }
    },
    [deleteSupplier]
  );

  // 处理回车键提交
  const handleKeyPress = useCallback(
    (e) => {
      if (e.key === "Enter") {
        if (isAddModalOpen) {
          handleAddSupplier();
        } else if (isEditModalOpen) {
          handleUpdateSupplier();
        }
      }
    },
    [isAddModalOpen, isEditModalOpen, handleAddSupplier, handleUpdateSupplier]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg text-gray-600">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-red-600 mr-2">⚠️</span>
            <span className="text-red-700">{error}</span>
            <button
              onClick={clearError}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 操作栏 */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">供应商管理</h2>
        <Button variant="primary" onClick={handleAddClick}>
          添加供应商
        </Button>
      </div>

      {/* 供应商列表 */}
      {suppliers.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-gray-500 text-lg mb-4">暂无供应商数据</div>
          <Button variant="primary" onClick={handleAddClick}>
            添加第一个供应商
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  供应商名称
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  供应商ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  匹配字符串
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  创建时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  更新时间
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {suppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {supplier.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {supplier.supplierId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {supplier.matchString || (
                      <span className="text-gray-400 italic">未设置</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(supplier.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(supplier.updatedAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEditClick(supplier)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDeleteSupplier(supplier)}
                      className="text-red-600 hover:text-red-900"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 添加供应商模态框 */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={handleCloseModal}
        title="添加供应商"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              供应商名称
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="请输入供应商名称"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              供应商ID
            </label>
            <input
              type="text"
              name="supplierId"
              value={formData.supplierId}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="请输入供应商ID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              匹配字符串
            </label>
            <input
              type="text"
              name="matchString"
              value={formData.matchString}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="请输入用于匹配的字符串（可选）"
            />
            <p className="mt-1 text-xs text-gray-500">
              用于在订单数据中自动匹配供应商信息
            </p>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="secondary" onClick={handleCloseModal}>
              取消
            </Button>
            <Button
              variant="primary"
              onClick={handleAddSupplier}
              disabled={!formData.name.trim() || !formData.supplierId.trim()}
            >
              添加
            </Button>
          </div>
        </div>
      </Modal>

      {/* 编辑供应商模态框 */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={handleCloseModal}
        title="编辑供应商"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              供应商名称
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="请输入供应商名称"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              供应商ID
            </label>
            <input
              type="text"
              name="supplierId"
              value={formData.supplierId}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="请输入供应商ID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              匹配字符串
            </label>
            <input
              type="text"
              name="matchString"
              value={formData.matchString}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="请输入用于匹配的字符串（可选）"
            />
            <p className="mt-1 text-xs text-gray-500">
              用于在订单数据中自动匹配供应商信息
            </p>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="secondary" onClick={handleCloseModal}>
              取消
            </Button>
            <Button
              variant="primary"
              onClick={handleUpdateSupplier}
              disabled={!formData.name.trim() || !formData.supplierId.trim()}
            >
              更新
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
