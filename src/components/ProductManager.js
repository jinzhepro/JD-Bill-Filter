"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { useProduct } from "@/context/ProductContext";
import Button from "./ui/Button";
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

  const [searchTerm, setSearchTerm] = useState("");
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [formErrors, setFormErrors] = useState([]);
  const [isMySqlProcessing, setIsMySqlProcessing] = useState(false);
  const [mySqlStatus, setMySqlStatus] = useState("");
  const [activeTab, setActiveTab] = useState("manual"); // "manual" 或 "import"

  // 在组件挂载时从数据库加载商品数据
  useEffect(() => {
    loadProductsFromDB();
  }, []);

  // 从数据库加载商品数据
  const loadProductsFromDB = async () => {
    setLoading(true);
    try {
      let result = await getProductsFromMySQL();

      // 如果获取失败且错误是表不存在，尝试创建表后重试
      if (
        !result.success &&
        result.message &&
        result.message.includes("doesn't exist")
      ) {
        console.log("商品表不存在，尝试创建表...");
        const tableResult = await createProductTable();
        if (tableResult.success) {
          console.log("商品表创建成功，重新获取数据...");
          result = await getProductsFromMySQL();
        } else {
          console.error("创建商品表失败:", tableResult.message);
        }
      }

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
        toast.success(`商品 "${productForm.productName}" 已更新`);
      } else {
        // 添加新项
        const newItem = createProductItem(productForm);
        addProduct(newItem);
        toast.success(`商品 "${productForm.productName}" 已添加`);
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
      setIsFormVisible(false);
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
    setIsFormVisible(true);
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
        toast.success(`商品 "${item.productName}" 已删除`);
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
      toast.success(`SKU "${sku}" 已复制到剪贴板`);
    } catch (error) {
      toast.error(`复制SKU失败: ${error.message}`);
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
      toast.success(`商品名称 "${productName}" 已复制到剪贴板`);
    } catch (error) {
      toast.error(`复制商品名称失败: ${error.message}`);
    }
  };

  // 处理取消
  const handleCancel = () => {
    resetProductForm();
    setEditingProductId(null);
    setIsFormVisible(false);
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
        toast.success(result.message);
      } else {
        setMySqlStatus("MySQL连接测试失败");
        toast.error(result.message);
      }
    } catch (error) {
      setMySqlStatus("MySQL连接测试出错");
      toast.error(`MySQL连接测试出错: ${error.message}`);
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
      // 先创建表（如果不存在）
      const tableResult = await createProductTable();
      if (!tableResult.success) {
        throw new Error(tableResult.message);
      }

      // 推送数据
      const pushResult = await pushProductsToMySQL(products);
      if (pushResult.success) {
        setMySqlStatus("数据推送成功");
        toast.success(pushResult.message);
      } else {
        throw new Error(pushResult.message);
      }
    } catch (error) {
      setMySqlStatus("数据推送失败");
      toast.error(`数据推送失败: ${error.message}`);
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
      toast.success(`成功从数据库拉取 ${products.length} 条商品数据`);
    } catch (error) {
      setMySqlStatus("数据拉取失败");
      toast.error(`数据拉取失败: ${error.message}`);
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
        toast.success(result.message);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      setMySqlStatus("MySQL数据清空失败");
      toast.error(`MySQL数据清空失败: ${error.message}`);
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
        toast.success(result.message);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      setMySqlStatus("warehouse字段修复失败");
      toast.error(`warehouse字段修复失败: ${error.message}`);
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
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {products.length}
            </div>
            <div className="text-sm text-gray-600">总商品数</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {new Set(products.map((p) => p.warehouse).filter(Boolean)).size}
            </div>
            <div className="text-sm text-gray-600">仓库数</div>
          </div>
          <div className="text-center p-3 bg-indigo-50 rounded-lg">
            <div className="text-2xl font-bold text-indigo-600">
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
                ? "border-b-2 border-primary-500 text-primary-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            手动添加
          </button>
          <button
            onClick={() => setActiveTab("import")}
            className={`px-4 py-2 font-medium text-sm ml-6 ${
              activeTab === "import"
                ? "border-b-2 border-primary-500 text-primary-600"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          {activeTab === "manual" && (
            <div className="flex gap-3">
              <Button
                onClick={() => setIsFormVisible(true)}
                className="w-full md:w-auto"
              >
                添加商品
              </Button>
            </div>
          )}
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
            onClick={handleTestMySqlConnection}
            disabled={isMySqlProcessing}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            {isMySqlProcessing ? "测试中..." : "测试MySQL连接"}
          </Button>

          <Button
            onClick={handlePushToMySQL}
            disabled={isMySqlProcessing || products.length === 0}
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

          <Button
            onClick={handleFixWarehouseColumn}
            disabled={isMySqlProcessing}
            className="bg-orange-600 text-white hover:bg-orange-700"
          >
            {isMySqlProcessing ? "修复中..." : "修复warehouse字段"}
          </Button>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          <p className="font-medium mb-2">MySQL数据库连接信息：</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            <div>• 主机: localhost:3306</div>
            <div>• 数据库: testdb</div>
            <div>• 用户: root</div>
            <div>• 表名: products</div>
          </div>
        </div>
      </section>

      {/* 批量导入区域 */}
      {activeTab === "import" && <ProductImport />}

      {/* 添加/编辑表单 */}
      {activeTab === "manual" && isFormVisible && (
        <section className="bg-white rounded-xl shadow-lg p-6 animate-fade-in">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            {editingProductId ? "编辑商品" : "添加商品"}
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
                  商品SKU *
                </label>
                <input
                  type="text"
                  name="sku"
                  value={productForm.sku}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="可选，输入仓库"
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
                {editingProductId ? "更新" : "添加"}
              </Button>
            </div>
          </form>
        </section>
      )}

      {/* 商品列表 */}
      <section className="bg-white rounded-xl shadow-lg p-6 animate-fade-in">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          商品列表 ({filteredProducts.length})
        </h2>

        {isLoading ? (
          <div className="text-center py-8 text-gray-500">
            正在从数据库加载商品数据...
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
                  <th className="px-3 py-3 text-left font-semibold text-primary-600">
                    京东SKU
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-primary-600">
                    商品名称
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-primary-600">
                    品牌
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-primary-600">
                    仓库
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-primary-600">
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
                          className="px-2 py-1 text-xs bg-gray-500 text-white hover:bg-gray-600 flex-shrink-0"
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
                          className="px-2 py-1 text-xs bg-gray-500 text-white hover:bg-gray-600 flex-shrink-0"
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
                          className="px-2 py-1 text-xs bg-blue-500 text-white hover:bg-blue-600"
                        >
                          编辑
                        </Button>
                        <Button
                          onClick={(e) => handleDelete(product.id, e)}
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
        )}
      </section>
    </div>
  );
}
