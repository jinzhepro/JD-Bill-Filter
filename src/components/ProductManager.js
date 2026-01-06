"use client";

import React, { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useProduct } from "@/context/ProductContext";
import { Button } from "./ui/button";
import Modal from "./ui/modal";
import { ProductImport } from "./ProductImport";
import {
  createProductTable,
  ensureWarehouseColumn,
  pushProductsToMySQL,
  getProductsFromMySQL,
  deleteProductFromMySQL,
  clearProductsInMySQL,
} from "@/lib/mysqlConnection";

export function ProductManager() {
  const {
    products,
    productForm,
    editingProductId,
    isLoading,
    setProducts,
    setProductForm,
    resetProductForm,
    setEditingProductId,
    addProduct,
    updateProduct,
    deleteProduct,
    setError,
    setLoading,
  } = useProduct();

  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formErrors, setFormErrors] = useState([]);
  const [isMySqlProcessing, setIsMySqlProcessing] = useState(false);
  const [mySqlStatus, setMySqlStatus] = useState("");
  const [activeTab, setActiveTab] = useState("manual"); // "manual" 或 "import"

  const hasLoadedProducts = useRef(false);

  // 在组件挂载时从数据库加载商品数据
  useEffect(() => {
    if (hasLoadedProducts.current) return;
    hasLoadedProducts.current = true;
    loadProductsFromDB();
  }, []);

  // 从数据库加载商品数据
  const loadProductsFromDB = async () => {
    setLoading(true);
    try {
      const result = await getProductsFromMySQL();

      if (result.success) {
        setProducts(result.data);
      } else {
        setError(result.message || "加载商品数据失败");
      }
    } catch (error) {
      setError(`加载商品数据失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 处理表单输入变化
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProductForm({ [name]: value });
  };

  // 验证商品表单
  const validateProductForm = (form) => {
    const errors = [];

    if (!form.sku || form.sku.trim() === "") {
      errors.push("商品SKU不能为空");
    }

    if (!form.productName || form.productName.trim() === "") {
      errors.push("商品名称不能为空");
    }

    // 检查SKU是否重复（编辑时排除当前商品）
    const isDuplicate = products.some(
      (product) => product.sku === form.sku && product.id !== editingProductId
    );
    if (isDuplicate) {
      errors.push("商品SKU已存在");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  };

  // 创建商品项
  const createProductItem = (form) => {
    return {
      id: `product-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sku: form.sku.trim(),
      productName: form.productName.trim(),
      brand: form.brand.trim(),
      warehouse: form.warehouse.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  // 更新商品项
  const updateProductItem = (existingItem, form) => {
    return {
      ...existingItem,
      sku: form.sku.trim(),
      productName: form.productName.trim(),
      brand: form.brand.trim(),
      warehouse: form.warehouse.trim(),
      updatedAt: new Date().toISOString(),
    };
  };

  // 处理表单提交
  const handleSubmit = async (e) => {
    e.preventDefault();

    // 验证表单
    const validation = validateProductForm(productForm);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }

    setFormErrors([]);

    try {
      if (editingProductId) {
        // 更新现有项
        const existingItem = products.find(
          (item) => item.id === editingProductId
        );
        const updatedItem = updateProductItem(existingItem, productForm);
        updateProduct(updatedItem);
        toast({
          title: "更新成功",
          description: `商品 "${productForm.productName}" 已更新`,
        });
      } else {
        // 添加新项
        const newItem = createProductItem(productForm);
        addProduct(newItem);
        toast({
          title: "添加成功",
          description: `商品 "${productForm.productName}" 已添加`,
        });
      }

      // 保存到数据库
      const updatedProducts = editingProductId
        ? products.map((item) =>
            item.id === editingProductId
              ? updateProductItem(item, productForm)
              : item
          )
        : [...products, createProductItem(productForm)];

      const pushResult = await pushProductsToMySQL(updatedProducts);
      if (!pushResult.success) {
        throw new Error(pushResult.message);
      }

      // 重新加载数据
      await loadProductsFromDB();

      // 重置表单
      resetProductForm();
      setEditingProductId(null);
      setIsFormModalOpen(false);
    } catch (error) {
      setError(`保存商品失败: ${error.message}`);
    }
  };

  // 处理编辑
  const handleEdit = (item) => {
    setProductForm({
      sku: item.sku,
      productName: item.productName,
      brand: item.brand || "",
      warehouse: item.warehouse || "",
    });
    setEditingProductId(item.id);
    setIsFormModalOpen(true);
    setFormErrors([]);
  };

  // 处理删除
  const handleDelete = async (id, event) => {
    // 阻止事件冒泡
    if (event) {
      event.stopPropagation();
    }

    const item = products.find((item) => item.id === id);
    if (item && window.confirm(`确定要删除商品 "${item.productName}" 吗？`)) {
      try {
        await deleteProductFromMySQL(id);
        deleteProduct(id);
        toast({
          title: "删除成功",
          description: `商品 "${item.productName}" 已删除`,
        });
      } catch (error) {
        setError(`删除商品失败: ${error.message}`);
      }
    }
  };

  // 处理复制SKU
  const handleCopySku = async (sku, event) => {
    // 阻止事件冒泡
    if (event) {
      event.stopPropagation();
    }

    try {
      await navigator.clipboard.writeText(sku);
      toast({
        title: "复制成功",
        description: `SKU "${sku}" 已复制到剪贴板`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "复制失败",
        description: `复制SKU失败: ${error.message}`,
      });
    }
  };

  // 处理复制商品名称
  const handleCopyProductName = async (productName, event) => {
    // 阻止事件冒泡
    if (event) {
      event.stopPropagation();
    }

    try {
      await navigator.clipboard.writeText(productName);
      toast({
        title: "复制成功",
        description: `商品名称 "${productName}" 已复制到剪贴板`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "复制失败",
        description: `复制商品名称失败: ${error.message}`,
      });
    }
  };

  // 复制整列数据
  const handleCopyColumn = async (columnName, event) => {
    // 阻止事件冒泡
    if (event) {
      event.stopPropagation();
    }

    try {
      let columnData = [];

      // 根据列名提取数据
      switch (columnName) {
        case "sku":
          columnData = filteredProducts.map((product) => product.sku || "");
          break;
        case "productName":
          columnData = filteredProducts.map(
            (product) => product.productName || ""
          );
          break;
        case "brand":
          columnData = filteredProducts.map((product) => product.brand || "");
          break;
        case "warehouse":
          columnData = filteredProducts.map(
            (product) => product.warehouse || ""
          );
          break;
        default:
          columnData = filteredProducts.map(
            (product) => product[columnName] || ""
          );
      }

      // 将数据格式化为列形式（每行一个值）
      const columnText = columnData.join("\n");

      await navigator.clipboard.writeText(columnText);
      toast({
        title: "复制成功",
        description: `已复制 ${columnName} 列数据 (${columnData.length} 行)`,
      });
    } catch (error) {
      console.error("复制列数据失败:", error);
      toast({
        variant: "destructive",
        title: "复制失败",
        description: `复制列数据失败: ${error.message}`,
      });
    }
  };

  // 处理取消
  const handleCancel = () => {
    resetProductForm();
    setEditingProductId(null);
    setIsFormModalOpen(false);
    setFormErrors([]);
  };

  // 测试MySQL连接
  const handleTestMySqlConnection = async () => {
    setIsMySqlProcessing(true);
    setMySqlStatus("正在测试MySQL连接...");

    try {
      const { testConnection } = await import("@/lib/mysqlConnection");
      const result = await testConnection();
      if (result.success) {
        setMySqlStatus("MySQL连接测试成功");
        toast({
          title: "连接测试成功",
          description: result.message,
        });
      } else {
        setMySqlStatus("MySQL连接测试失败");
        toast({
          variant: "destructive",
          title: "连接测试失败",
          description: result.message,
        });
      }
    } catch (error) {
      setMySqlStatus("MySQL连接测试出错");
      toast({
        variant: "destructive",
        title: "连接测试出错",
        description: `MySQL连接测试出错: ${error.message}`,
      });
    } finally {
      setIsMySqlProcessing(false);
    }
  };

  // 推送数据到MySQL
  const handlePushToMySQL = async () => {
    if (products.length === 0) {
      setError("没有商品数据可以推送");
      return;
    }

    if (
      !window.confirm(
        `确定要将 ${products.length} 条商品数据推送到MySQL数据库吗？此操作将会覆盖数据库中的现有数据！`
      )
    ) {
      return;
    }

    setIsMySqlProcessing(true);
    setMySqlStatus("正在推送数据到MySQL...");

    try {
      // 推送数据
      const pushResult = await pushProductsToMySQL(products);
      if (pushResult.success) {
        setMySqlStatus("数据推送成功");
        toast({
          title: "推送成功",
          description: pushResult.message,
        });
      } else {
        throw new Error(pushResult.message);
      }
    } catch (error) {
      setMySqlStatus("数据推送失败");
      toast({
        variant: "destructive",
        title: "推送失败",
        description: `数据推送失败: ${error.message}`,
      });
    } finally {
      setIsMySqlProcessing(false);
    }
  };

  // 从MySQL拉取数据
  const handlePullFromMySQL = async () => {
    if (
      !window.confirm(
        "确定要从MySQL数据库拉取商品数据吗？此操作将会覆盖当前本地数据！"
      )
    ) {
      return;
    }

    setIsMySqlProcessing(true);
    setMySqlStatus("正在从MySQL拉取数据...");

    try {
      await loadProductsFromDB();
      setMySqlStatus("数据拉取成功");
      toast({
        title: "拉取成功",
        description: `成功从数据库拉取 ${products.length} 条商品数据`,
      });
    } catch (error) {
      setMySqlStatus("数据拉取失败");
      toast({
        variant: "destructive",
        title: "拉取失败",
        description: `数据拉取失败: ${error.message}`,
      });
    } finally {
      setIsMySqlProcessing(false);
    }
  };

  // 清空MySQL数据
  const handleClearMySQL = async () => {
    if (
      !window.confirm("确定要清空MySQL数据库中的商品数据吗？此操作无法撤销！")
    ) {
      return;
    }

    setIsMySqlProcessing(true);
    setMySqlStatus("正在清空MySQL数据...");

    try {
      const result = await clearProductsInMySQL();
      if (result.success) {
        setMySqlStatus("MySQL数据清空成功");
        toast({
          title: "清空成功",
          description: result.message,
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      setMySqlStatus("MySQL数据清空失败");
      toast({
        variant: "destructive",
        title: "清空失败",
        description: `MySQL数据清空失败: ${error.message}`,
      });
    } finally {
      setIsMySqlProcessing(false);
    }
  };

  // 修复warehouse字段
  const handleFixWarehouseColumn = async () => {
    setIsMySqlProcessing(true);
    setMySqlStatus("正在修复warehouse字段...");

    try {
      const result = await ensureWarehouseColumn();
      if (result.success) {
        setMySqlStatus("warehouse字段修复成功");
        toast({
          title: "修复成功",
          description: result.message,
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      setMySqlStatus("warehouse字段修复失败");
      toast({
        variant: "destructive",
        title: "修复失败",
        description: `warehouse字段修复失败: ${error.message}`,
      });
    } finally {
      setIsMySqlProcessing(false);
    }
  };

  // 获取过滤后的商品项
  const filteredProducts = products.filter((product) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      product.sku.toLowerCase().includes(searchLower) ||
      product.productName.toLowerCase().includes(searchLower) ||
      (product.brand && product.brand.toLowerCase().includes(searchLower)) ||
      (product.warehouse &&
        product.warehouse.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div className="space-y-6">
      {/* 统计信息 */}
      <section className="bg-white rounded-xl shadow-lg p-6 animate-fade-in">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">商品统计</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-800">
              {products.length}
            </div>
            <div className="text-sm text-gray-600">总商品数</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-800">
              {new Set(products.map((p) => p.warehouse).filter(Boolean)).size}
            </div>
            <div className="text-sm text-gray-600">仓库数</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-800">
              {new Set(products.map((p) => p.brand).filter(Boolean)).size}
            </div>
            <div className="text-sm text-gray-600">品牌数</div>
          </div>
        </div>
      </section>

      {/* 搜索和添加按钮 */}
      <section className="bg-white rounded-xl shadow-lg p-6 animate-fade-in">
        {/* 标签页切换 */}
        <div className="flex border-b border-gray-200 mb-4">
          <button
            onClick={() => setActiveTab("manual")}
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === "manual"
                ? "border-b-2 border-gray-500 text-gray-700"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            手动添加
          </button>
          <button
            onClick={() => setActiveTab("import")}
            className={`px-4 py-2 font-medium text-sm ml-6 ${
              activeTab === "import"
                ? "border-b-2 border-gray-500 text-gray-700"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            批量导入
          </button>
        </div>

        {/* 搜索栏 */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="w-full md:w-1/2">
            <input
              type="text"
              placeholder="搜索SKU、商品名称、品牌或仓库..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
            />
          </div>
          {activeTab === "manual" && (
            <div className="flex gap-3">
              <Button
                onClick={() => setIsFormModalOpen(true)}
                className="w-full md:w-auto"
              >
                添加商品
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* 批量导入区域 */}
      {activeTab === "import" && <ProductImport />}

      {/* 添加/编辑商品模态框 */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={handleCancel}
        title={editingProductId ? "编辑商品" : "添加商品"}
        size="lg"
      >
        <div className="space-y-4">
          {formErrors.length > 0 && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              {formErrors.map((error, index) => (
                <div key={index} className="text-gray-600 text-sm">
                  {error}
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  商品SKU *
                </label>
                <input
                  type="text"
                  name="sku"
                  value={productForm.sku}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                  required
                  disabled={!!editingProductId}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  商品名称 *
                </label>
                <input
                  type="text"
                  name="productName"
                  value={productForm.productName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  品牌
                </label>
                <input
                  type="text"
                  name="brand"
                  value={productForm.brand}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                  placeholder="可选，输入品牌"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  仓库
                </label>
                <input
                  type="text"
                  name="warehouse"
                  value={productForm.warehouse}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                  placeholder="可选，输入仓库"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Button type="button" onClick={handleCancel} variant="secondary">
                取消
              </Button>
              <Button type="submit">
                {editingProductId ? "更新" : "添加"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* 商品列表 */}
      <section className="bg-white rounded-xl shadow-lg p-6 animate-fade-in">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          商品列表 ({filteredProducts.length})
        </h2>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex flex-col items-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-500"></div>
              <div className="text-lg text-gray-600">正在加载商品数据...</div>
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchTerm ? "没有找到匹配的商品" : "暂无商品数据，请添加商品"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th
                    className="px-3 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-50"
                    onClick={(e) => handleCopyColumn("sku", e)}
                    title="点击复制整列数据"
                  >
                    京东SKU 📋
                  </th>
                  <th
                    className="px-3 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-50"
                    onClick={(e) => handleCopyColumn("productName", e)}
                    title="点击复制整列数据"
                  >
                    商品名称 📋
                  </th>
                  <th
                    className="px-3 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-50"
                    onClick={(e) => handleCopyColumn("brand", e)}
                    title="点击复制整列数据"
                  >
                    品牌 📋
                  </th>
                  <th
                    className="px-3 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-50"
                    onClick={(e) => handleCopyColumn("warehouse", e)}
                    title="点击复制整列数据"
                  >
                    仓库 📋
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-700">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr
                    key={product.id}
                    className="border-b border-gray-200 hover:bg-gray-50"
                  >
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className="flex-1 truncate" title={product.sku}>
                          {product.sku}
                        </span>
                        <Button
                          onClick={(e) => handleCopySku(product.sku, e)}
                          className="px-2 py-1 text-xs flex-shrink-0"
                          title="复制SKU"
                        >
                          复制
                        </Button>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="flex-1 truncate"
                          title={product.productName}
                        >
                          {product.productName}
                        </span>
                        <Button
                          onClick={(e) =>
                            handleCopyProductName(product.productName, e)
                          }
                          className="px-2 py-1 text-xs flex-shrink-0"
                          title="复制商品名称"
                        >
                          复制
                        </Button>
                      </div>
                    </td>
                    <td className="px-3 py-3 truncate" title={product.brand}>
                      {product.brand || "-"}
                    </td>
                    <td
                      className="px-3 py-3 truncate"
                      title={product.warehouse}
                    >
                      {product.warehouse || "-"}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1">
                        <Button
                          onClick={() => handleEdit(product)}
                          className="px-2 py-1 text-xs"
                        >
                          编辑
                        </Button>
                        <Button
                          onClick={(e) => handleDelete(product.id, e)}
                          className="px-2 py-1 text-xs"
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
        )}
      </section>
    </div>
  );
}
