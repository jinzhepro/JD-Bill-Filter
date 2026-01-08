"use client";

import React, { useState, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useProduct } from "@/context/ProductContext";
import {
  validateFileType,
  validateFileSize,
  readFile,
} from "@/lib/excelHandler";
import {
  validateProductDataStructure,
  processProductImportData,
} from "@/lib/dataProcessor";
import { Button } from "./ui/button";

export function ProductImport() {
  const { products, addProduct, setError, setLoading } = useProduct();
  const { toast } = useToast();

  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importStatus, setImportStatus] = useState("");
  const [importResults, setImportResults] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = useCallback(
    async (file) => {
      if (!file) return;

      try {
        setIsProcessing(true);
        setImportStatus("正在读取文件...");
        setImportResults(null);

        // 验证文件类型
        if (!validateFileType(file)) {
          throw new Error("请选择有效的文件（.xlsx, .xls 或 .csv 格式）");
        }

        // 验证文件大小
        if (!validateFileSize(file)) {
          throw new Error("文件大小不能超过50MB");
        }

        toast({
          title: "上传成功",
          description: `文件 "${file.name}" 上传成功`,
        });

        // 读取文件
        const fileType = file.name.match(/\.(xlsx|xls|csv)$/i)[1].toLowerCase();
        const data = await readFile(file, fileType);

        // 验证商品数据结构
        setImportStatus("正在验证数据结构...");
        validateProductDataStructure(data);
        toast({
          title: "验证通过",
          description: "数据结构验证通过",
        });

        // 处理商品数据
        setImportStatus("正在处理商品数据...");
        const processedProducts = processProductImportData(data);

        // 检查SKU重复并处理覆盖逻辑
        setImportStatus("正在处理SKU...");
        // 创建SKU到现有商品的映射
        const existingSkuMap = new Map(products.map((p) => [p.sku, p]));
        const updatedProducts = [];
        const newProducts = [];
        const updatedSkus = [];

        processedProducts.forEach((product) => {
          if (existingSkuMap.has(product.sku)) {
            // SKU已存在，更新现有商品
            updatedSkus.push(product.sku);
          } else {
            // 新SKU，添加到新商品列表
            newProducts.push(product);
          }
        });

        // 合并所有商品（已存在的SKU使用导入的数据覆盖）
        const allProducts = [...products];

        // 更新已存在的商品
        processedProducts.forEach((product) => {
          const existingIndex = allProducts.findIndex(
            (p) => p.sku === product.sku
          );
          if (existingIndex !== -1) {
            // 覆盖更新
            allProducts[existingIndex] = {
              ...product,
              createdAt: allProducts[existingIndex].createdAt, // 保留原始创建时间
            };
            updatedProducts.push(allProducts[existingIndex]);
          }
        });

        // 添加新商品
        const productsWithNew = [...allProducts, ...newProducts];

        // 批量添加新商品到本地状态
        if (newProducts.length > 0) {
          setImportStatus(`正在导入 ${newProducts.length} 个新商品...`);
          for (const product of newProducts) {
            addProduct(product);
          }
        }

        // 推送到数据库
        try {
          const { createProductTable, pushProductsToMySQL } = await import(
            "@/lib/mysqlConnection"
          );

          // 先创建表（如果不存在）
          setImportStatus("正在创建商品表...");
          const tableResult = await createProductTable();
          if (!tableResult.success) {
            throw new Error(tableResult.message);
          }

          // 推送数据
          setImportStatus("正在同步数据到数据库...");
          const pushResult = await pushProductsToMySQL(productsWithNew);

          if (!pushResult.success) {
            throw new Error(pushResult.message);
          }

          toast({
            title: "同步成功",
            description: "商品数据已同步到数据库",
          });
        } catch (error) {
          console.error("同步到数据库失败:", error);
          toast({
            variant: "destructive",
            title: "同步失败",
            description: `同步到数据库失败: ${error.message}`,
          });
        }

        // 设置导入结果
        setImportResults({
          total: processedProducts.length,
          imported: newProducts.length,
          updated: updatedSkus.length,
          updatedSkus: updatedSkus,
        });

        setImportStatus("导入完成");

        if (newProducts.length > 0 || updatedSkus.length > 0) {
          toast({
            title: "导入成功",
            description: `成功导入 ${newProducts.length} 个商品，更新 ${updatedSkus.length} 个商品`,
          });
        } else {
          toast({
            title: "无需更新",
            description: "所有商品数据已是最新",
          });
        }
      } catch (error) {
        console.error("商品导入失败:", error);
        setError(error.message);
        toast({
          variant: "destructive",
          title: "导入失败",
          description: `商品导入失败: ${error.message}`,
        });
        setImportStatus("导入失败");
      } finally {
        setIsProcessing(false);
      }
    },
    [products, addProduct, setError]
  );

  const handleFileInputChange = useCallback(
    (event) => {
      const file = event?.target?.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event) => {
    event.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (event) => {
      event.preventDefault();
      setIsDragOver(false);

      const files = event.dataTransfer.files;
      if (files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect]
  );

  const handleButtonClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleReset = useCallback(() => {
    setImportResults(null);
    setImportStatus("");
  }, []);

  return (
    <section className="bg-white rounded-xl shadow-lg p-6 animate-fade-in">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">批量导入商品</h2>

      {/* 导入状态显示 */}
      {importStatus && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-blue-600 text-sm">{importStatus}</div>
        </div>
      )}

      {/* 导入结果显示 */}
      {importResults && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="text-green-800 font-medium mb-2">导入结果</h3>
          <div className="text-sm text-green-700 space-y-1">
            <div>• 总记录数: {importResults.total}</div>
            <div>• 新增商品: {importResults.imported}</div>
            <div>• 更新商品: {importResults.updated}</div>
            {importResults.updatedSkus &&
              importResults.updatedSkus.length > 0 && (
                <div className="mt-2">
                  <div className="font-medium">更新的SKU:</div>
                  <div className="text-xs mt-1 max-h-20 overflow-y-auto">
                    {importResults.updatedSkus.join(", ")}
                  </div>
                </div>
              )}
          </div>
          <Button onClick={handleReset} className="mt-3">
            继续导入
          </Button>
        </div>
      )}

      {/* 文件上传区域 */}
      {!importResults && (
        <div className="text-center">
          <div
            className={`
              border-3 border-dashed rounded-xl p-12 transition-all duration-300 cursor-pointer
              ${
                isDragOver
                  ? "border-green-500 bg-green-50 transform scale-102"
                  : "border-gray-gray-300 bg-gray-gray-50 hover:border-gray-gray-400 hover:bg-gray-gray-100"
              }
              ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={!isProcessing ? handleButtonClick : undefined}
          >
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-gray-gray-600 mb-3">
              {isProcessing ? "正在处理..." : "上传商品数据文件"}
            </h3>
            <p className="text-gray-600 mb-4 max-w-md mx-auto">
              拖拽文件到此处或点击选择文件（支持 .xlsx, .xls, .csv 格式）
            </p>
            <Button size="lg" disabled={isProcessing} className="px-6">
              {isProcessing ? "处理中..." : "选择文件"}
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileInputChange}
            className="hidden"
            disabled={isProcessing}
          />

          <div className="mt-4 text-sm text-gray-500">
            <p>支持的文件格式：.xlsx, .xls, .csv</p>
            <p>最大文件大小：50MB</p>
          </div>
        </div>
      )}

      {/* 导入说明 */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 mb-2">商品导入说明</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• 文件必须包含"京东SKU"和"商品名称"列</li>
          <li>• 可选列：仓库</li>
          <li>• 相同的SKU会自动覆盖更新</li>
          <li>• 导入后数据会自动同步到数据库</li>
          <li>• 支持拖拽上传和点击选择文件</li>
        </ul>
      </div>

      {/* 示例数据格式 */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-2">示例数据格式</h4>
        <div className="text-xs text-gray-600 font-mono bg-white p-3 rounded border">
          京东SKU 商品名称 仓库
          <br />
          10199075323422 【整箱】蒙牛特仑苏纯牛奶250ml*12盒/提 北京仓
          <br />
          10199075295528 【整箱】蒙牛特仑苏纯牛奶250ml*12盒/提 天津仓
        </div>
      </div>
    </section>
  );
}
