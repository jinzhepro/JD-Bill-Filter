"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSupplier } from "@/context/SupplierContext";
import { Button } from "./ui/button";
import Modal, { ConfirmModal } from "./ui/modal";
import { useToast } from "@/hooks/use-toast";

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
    convertTextToSuppliers,
  } = useSupplier();

  const { toast } = useToast();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] =
    useState(false);
  const [deletingSupplier, setDeletingSupplier] = useState(null);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    supplierId: "",
    matchString: "",
  });
  const [convertText, setConvertText] = useState("");
  const [convertResults, setConvertResults] = useState([]);

  const hasLoadedSuppliers = useRef(false);

  // 组件挂载时加载数据
  useEffect(() => {
    if (hasLoadedSuppliers.current) return;
    hasLoadedSuppliers.current = true;
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

  // 重置转换表单
  const resetConvertForm = useCallback(() => {
    setConvertText("");
    setConvertResults([]);
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

  // 打开转换模态框
  const handleConvertClick = useCallback(() => {
    resetConvertForm();
    setIsConvertModalOpen(true);
  }, [resetConvertForm]);

  // 关闭模态框
  const handleCloseModal = useCallback(() => {
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setIsConvertModalOpen(false);
    setIsDeleteModalOpen(false);
    setIsConfirmDeleteModalOpen(false);
    setDeletingSupplier(null);
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
  const handleAddSupplier = useCallback(async () => {
    const success = await addSupplier(formData);
    if (success) {
      toast({
        title: "添加成功",
        description: `供应商 "${formData.name}" 已添加`,
      });
      // 重新加载数据
      loadSuppliers();
      handleCloseModal();
    } else {
      toast({
        variant: "destructive",
        title: "添加失败",
        description: `供应商 "${formData.name}" 添加失败`,
      });
    }
  }, [addSupplier, formData, handleCloseModal, loadSuppliers]);

  // 处理更新供应商
  const handleUpdateSupplier = useCallback(async () => {
    if (!editingSupplier) return;

    const success = await updateSupplier(editingSupplier.id, formData);
    if (success) {
      toast({
        title: "更新成功",
        description: `供应商 "${formData.name}" 已更新`,
      });
      // 重新加载数据
      loadSuppliers();
      handleCloseModal();
    } else {
      toast({
        variant: "destructive",
        title: "更新失败",
        description: `供应商 "${formData.name}" 更新失败`,
      });
    }
  }, [
    editingSupplier,
    updateSupplier,
    formData,
    handleCloseModal,
    loadSuppliers,
  ]);

  // 处理删除供应商
  const handleDeleteSupplier = useCallback((supplier) => {
    setDeletingSupplier(supplier);
    setIsDeleteModalOpen(true);
  }, []);

  // 处理转换文本输入变化
  const handleConvertTextChange = useCallback((e) => {
    setConvertText(e.target.value);
  }, []);

  // 处理转换
  const handleConvert = useCallback(() => {
    if (!convertText.trim()) {
      return;
    }
    const results = convertTextToSuppliers(convertText);
    setConvertResults(results);
  }, [convertText, convertTextToSuppliers]);

  // 复制供应商ID到剪贴板
  const handleCopySupplierIds = useCallback(() => {
    const supplierIds = convertResults
      .filter((result) => result.matched)
      .map((result) => result.supplier.supplierId)
      .join("\n");

    if (supplierIds) {
      navigator.clipboard
        .writeText(supplierIds)
        .then(() => {
          toast({
            title: "复制成功",
            description: "供应商ID已复制到剪贴板",
          });
        })
        .catch((err) => {
          console.error("复制失败:", err);
          toast({
            variant: "destructive",
            title: "复制失败",
            description: "请手动复制",
          });
        });
    } else {
      toast({
        variant: "destructive",
        title: "无数据",
        description: "没有可复制的供应商ID",
      });
    }
  }, [convertResults, toast]);

  // 第一次确认删除
  const handleConfirmDelete = useCallback(() => {
    if (deletingSupplier) {
      setIsDeleteModalOpen(false);
      setIsConfirmDeleteModalOpen(true);
    }
  }, [deletingSupplier]);

  // 第二次确认删除
  const handleFinalConfirmDelete = useCallback(async () => {
    if (deletingSupplier) {
      const success = await deleteSupplier(deletingSupplier.id);
      if (success) {
        toast({
          title: "删除成功",
          description: `供应商 "${deletingSupplier.name}" 已删除`,
        });
        // 重新加载数据
        loadSuppliers();
      }
      handleCloseModal();
    }
  }, [
    deletingSupplier,
    deleteSupplier,
    toast,
    handleCloseModal,
    loadSuppliers,
  ]);

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
        <div className="flex flex-col items-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-500"></div>
          <div className="text-lg text-gray-600">正在加载供应商数据...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 错误提示 */}
      {error && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-gray-600 mr-2">⚠️</span>
            <span className="text-gray-700">{error}</span>
            <button
              onClick={clearError}
              className="ml-auto text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 操作栏 */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">供应商管理</h2>
        <div className="flex space-x-3">
          <Button onClick={handleConvertClick} variant="secondary">
            文本转换
          </Button>
          <Button onClick={handleAddClick}>添加供应商</Button>
        </div>
      </div>

      {/* 供应商列表 */}
      {suppliers.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-gray-500 text-lg mb-4">暂无供应商数据</div>
          <Button onClick={handleAddClick}>添加第一个供应商</Button>
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
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEditClick(supplier)}
                      className="text-gray-600 hover:text-gray-900 mr-4"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDeleteSupplier(supplier)}
                      className="text-gray-600 hover:text-gray-900"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
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
              供应商名称 *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
              placeholder="请输入供应商名称"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              供应商ID *
            </label>
            <input
              type="text"
              name="supplierId"
              value={formData.supplierId}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
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

      {/* 文本转换模态框 */}
      <Modal
        isOpen={isConvertModalOpen}
        onClose={handleCloseModal}
        title="文本转换为供应商ID"
        size="xl"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              输入文本
            </label>
            <textarea
              value={convertText}
              onChange={handleConvertTextChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
              rows={10}
              placeholder="请输入要转换的文本，每行一个编码"
            />
            <p className="mt-1 text-xs text-gray-500">
              每行输入一个编码，系统将根据供应商的匹配字符串自动识别对应的供应商
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="secondary" onClick={handleCloseModal}>
              取消
            </Button>
            <Button
              variant="primary"
              onClick={handleConvert}
              disabled={!convertText.trim()}
            >
              转换
            </Button>
          </div>

          {/* 转换结果 */}
          {convertResults.length > 0 && (
            <div className="mt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">转换结果</h3>
                <Button
                  onClick={handleCopySupplierIds}
                  variant="secondary"
                  size="sm"
                  disabled={
                    convertResults.filter((r) => r.matched).length === 0
                  }
                >
                  复制供应商ID
                </Button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  供应商ID结果
                </label>
                <textarea
                  readOnly
                  value={convertResults
                    .filter((result) => result.matched)
                    .map((result) => result.supplier.supplierId)
                    .join("\n")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  rows={10}
                  placeholder="转换后的供应商ID将显示在这里"
                />
                <p className="mt-1 text-xs text-gray-500">
                  只显示匹配成功的供应商ID，可直接复制使用
                </p>
              </div>

              {/* 统计信息 */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    总计: {convertResults.length} 条
                  </span>
                  <span className="text-gray-600">
                    匹配成功: {convertResults.filter((r) => r.matched).length}{" "}
                    条
                  </span>
                  <span className="text-gray-600">
                    未匹配: {convertResults.filter((r) => !r.matched).length} 条
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* 确认删除模态框 */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseModal}
        onConfirm={handleConfirmDelete}
        title="删除供应商"
        message={`确定要删除供应商 "${deletingSupplier?.name}" 吗？此操作不可撤销。`}
        confirmText="删除"
        cancelText="取消"
        confirmVariant="destructive"
      />

      {/* 第二次确认删除模态框 */}
      <ConfirmModal
        isOpen={isConfirmDeleteModalOpen}
        onClose={handleCloseModal}
        onConfirm={handleFinalConfirmDelete}
        title="最终确认删除"
        message={`请再次确认：真的要删除供应商 "${deletingSupplier?.name}" 吗？此操作不可撤销！`}
        confirmText="确认删除"
        cancelText="取消"
        confirmVariant="destructive"
      />
    </div>
  );
}
