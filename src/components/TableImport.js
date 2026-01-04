"use client";

import React, { useState, useCallback } from "react";
import { Button } from "./ui/button.js";
import {
  readFile,
  validateFileType,
  validateFileSize,
} from "@/lib/excelHandler";
import { createMultipleInventoryItems } from "@/lib/inventoryStorage";
import { updateProductNamesBySku } from "@/data/jdSkuMapping";

export function TableImport({ onImportItems, onCancel }) {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [errors, setErrors] = useState([]);
  const [importProgress, setImportProgress] = useState("");

  // 处理文件选择
  const handleFileSelect = useCallback((e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // 验证文件类型
    if (!validateFileType(selectedFile)) {
      setErrors(["请选择有效的Excel文件(.xlsx, .xls)或CSV文件"]);
      return;
    }

    // 验证文件大小
    if (!validateFileSize(selectedFile)) {
      setErrors(["文件大小不能超过50MB"]);
      return;
    }

    setFile(selectedFile);
    setErrors([]);
    setPreviewData([]);
    setImportProgress("");
  }, []);

  // 处理文件拖拽
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    const droppedFile = e.dataTransfer.files[0];
    if (!droppedFile) return;

    // 验证文件类型
    if (!validateFileType(droppedFile)) {
      setErrors(["请选择有效的Excel文件(.xlsx, .xls)或CSV文件"]);
      return;
    }

    // 验证文件大小
    if (!validateFileSize(droppedFile)) {
      setErrors(["文件大小不能超过50MB"]);
      return;
    }

    setFile(droppedFile);
    setErrors([]);
    setPreviewData([]);
    setImportProgress("");
  }, []);

  // 解析和预览数据
  const parseAndPreviewData = useCallback(async () => {
    if (!file) return;

    setIsProcessing(true);
    setErrors([]);
    setImportProgress("正在读取文件...");

    try {
      // 确定文件类型
      const fileExtension = file.name.split(".").pop().toLowerCase();
      const fileType = fileExtension === "csv" ? "csv" : "excel";

      // 读取文件数据
      const rawData = await readFile(file, fileType);
      setImportProgress("正在解析数据...");

      if (!rawData || rawData.length === 0) {
        throw new Error("文件中没有数据");
      }

      // 转换数据格式
      const convertedData = convertTableDataToInventory(rawData);

      if (convertedData.length === 0) {
        throw new Error("没有找到有效的库存数据");
      }

      // 显示预览数据（最多前5条）
      setPreviewData(convertedData.slice(0, 5));
      setImportProgress(
        `成功解析 ${convertedData.length} 条数据，显示前5条预览`
      );
    } catch (error) {
      console.error("数据解析失败:", error);
      setErrors([`数据解析失败: ${error.message}`]);
      setPreviewData([]);
    } finally {
      setIsProcessing(false);
    }
  }, [file]);

  // 转换表格数据为库存格式
  const convertTableDataToInventory = (rawData) => {
    const convertedData = [];

    rawData.forEach((row, index) => {
      try {
        // 跳过空行
        if (!row || Object.keys(row).length === 0) {
          return;
        }

        // 字段映射 - 支持多种可能的字段名
        const materialName =
          row["产品名称"] ||
          row["物料名称"] ||
          row["商品名称"] ||
          row["名称"] ||
          "";

        const quantity =
          row["数量（箱）"] ||
          row["数量"] ||
          row["库存数量"] ||
          row["箱数"] ||
          0;

        const unitPrice =
          row["供货单价（含税）（元/包）"] ||
          row["单价"] ||
          row["供货单价"] ||
          row["含税单价"] ||
          0;

        const totalPrice =
          row["总金额（含税）（人民币元）"] ||
          row["总金额"] ||
          row["总价"] ||
          row["含税总价"] ||
          0;

        const taxRate = row["税率（%）"] || row["税率"] || 13;

        const purchaseBatch =
          row["采购订单"] ||
          row["采购批号"] ||
          row["订单号"] ||
          row["批号"] ||
          "";

        const sku =
          row["SKU"] || row["sku"] || row["商品编码"] || row["商品SKU"] || "";

        const warehouse = row["仓库"] || row["仓库名称"] || "";

        // 验证必填字段
        if (!materialName || !quantity) {
          console.warn(`第 ${index + 1} 行缺少必要字段，跳过`);
          return;
        }

        // 创建库存项
        const inventoryItem = {
          materialName: materialName.toString().trim(),
          quantity: parseInt(quantity) || 0,
          purchaseBatch: purchaseBatch.toString().trim(),
          sku: sku.toString().trim(),
          unitPrice: parseFloat(unitPrice) || 0,
          totalPrice: parseFloat(totalPrice) || 0,
          taxRate: parseFloat(taxRate) || 13,
          taxAmount: 0, // 可以根据总价和税率计算
          warehouse: warehouse.toString().trim(),
        };

        // 计算税额
        if (inventoryItem.totalPrice && inventoryItem.taxRate) {
          inventoryItem.taxAmount = (
            (inventoryItem.totalPrice * inventoryItem.taxRate) /
            100
          ).toFixed(2);
        }

        convertedData.push(inventoryItem);
      } catch (error) {
        console.warn(`第 ${index + 1} 行数据转换失败:`, error);
      }
    });

    return convertedData;
  };

  // 确认导入
  const handleConfirmImport = useCallback(async () => {
    if (!file) return;

    setIsProcessing(true);
    setErrors([]);
    setImportProgress("正在导入数据...");

    try {
      // 重新读取完整数据
      const fileExtension = file.name.split(".").pop().toLowerCase();
      const fileType = fileExtension === "csv" ? "csv" : "excel";
      setImportProgress("正在读取文件...");
      const rawData = await readFile(file, fileType);

      if (!rawData || rawData.length === 0) {
        throw new Error("文件中没有数据或文件格式不正确");
      }

      setImportProgress("正在转换数据格式...");
      // 转换所有数据
      const convertedData = convertTableDataToInventory(rawData);

      if (convertedData.length === 0) {
        throw new Error("没有找到有效的库存数据，请检查文件格式和字段名称");
      }

      setImportProgress("正在更新商品名称...");
      // 使用SKU映射更新商品名称
      const updatedItems = updateProductNamesBySku(convertedData);

      setImportProgress("正在创建库存项...");
      // 创建库存项
      const newItems = createMultipleInventoryItems(updatedItems);

      // 验证创建的库存项
      if (!newItems || newItems.length === 0) {
        throw new Error("创建库存项失败，数据验证未通过");
      }

      setImportProgress(
        `成功导入 ${newItems.length} 条库存数据，正在添加到系统...`
      );

      // 延迟一下让用户看到成功消息
      setTimeout(() => {
        onImportItems(newItems);
      }, 1000);
    } catch (error) {
      console.error("导入失败:", error);
      setErrors([`导入失败: ${error.message}`]);
      setImportProgress("");
    } finally {
      setIsProcessing(false);
    }
  }, [file, onImportItems]);

  // 重置状态
  const handleReset = useCallback(() => {
    setFile(null);
    setPreviewData([]);
    setErrors([]);
    setImportProgress("");
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 animate-fade-in">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        表格导入库存项
      </h2>

      {/* 错误信息 */}
      {errors.length > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          {errors.map((error, index) => (
            <div key={index} className="text-red-600 text-sm">
              {error}
            </div>
          ))}
        </div>
      )}

      {/* 进度信息 */}
      {importProgress && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-blue-600 text-sm">{importProgress}</div>
        </div>
      )}

      {!file ? (
        /* 文件上传区域 */
        <div className="space-y-4">
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-500 transition-colors"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div className="space-y-2">
              <div className="text-gray-500">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="text-sm text-gray-600">
                <label htmlFor="file-upload" className="cursor-pointer">
                  <span className="font-medium text-primary-600 hover:text-primary-500">
                    点击上传文件
                  </span>
                  <span className="text-gray-500"> 或拖拽文件到此处</span>
                </label>
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  className="sr-only"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                />
              </div>
              <p className="text-xs text-gray-500">
                支持 Excel (.xlsx, .xls) 和 CSV 文件，最大 50MB
              </p>
            </div>
          </div>

          <div className="text-sm text-gray-600">
            <p className="font-medium mb-2">支持的表格字段：</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>• 产品名称 → 物料名称</div>
              <div>• 数量（箱） → 数量</div>
              <div>• 供货单价（含税） → 单价</div>
              <div>• 总金额（含税） → 总价</div>
              <div>• 税率（%） → 税率</div>
              <div>• 采购订单 → 采购批号</div>
              <div>• SKU → 商品SKU</div>
              <div>• 仓库 → 仓库</div>
            </div>
          </div>
        </div>
      ) : (
        /* 文件已选择，显示预览 */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <span className="font-medium">已选择文件：</span>
              <span className="text-primary-600">{file.name}</span>
              <span className="text-gray-500 ml-2">
                ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </span>
            </div>
            <Button
              onClick={handleReset}
              className="px-3 py-1 text-xs bg-gray-200 text-gray-700 hover:bg-gray-300"
            >
              重新选择
            </Button>
          </div>

          {previewData.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700">
                数据预览（前5条）
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-2 py-1 text-left font-semibold text-primary-600 border">
                        物料名称
                      </th>
                      <th className="px-2 py-1 text-left font-semibold text-primary-600 border">
                        数量
                      </th>
                      <th className="px-2 py-1 text-left font-semibold text-primary-600 border">
                        采购批号
                      </th>
                      <th className="px-2 py-1 text-left font-semibold text-primary-600 border">
                        单价
                      </th>
                      <th className="px-2 py-1 text-left font-semibold text-primary-600 border">
                        总价
                      </th>
                      <th className="px-2 py-1 text-left font-semibold text-primary-600 border">
                        税率
                      </th>
                      <th className="px-2 py-1 text-left font-semibold text-primary-600 border">
                        SKU
                      </th>
                      <th className="px-2 py-1 text-left font-semibold text-primary-600 border">
                        仓库
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((item, index) => (
                      <tr key={index} className="border hover:bg-gray-50">
                        <td className="px-2 py-1 border">
                          {item.materialName}
                        </td>
                        <td className="px-2 py-1 border">{item.quantity}</td>
                        <td className="px-2 py-1 border">
                          {item.purchaseBatch}
                        </td>
                        <td className="px-2 py-1 border">¥{item.unitPrice}</td>
                        <td className="px-2 py-1 border">¥{item.totalPrice}</td>
                        <td className="px-2 py-1 border">{item.taxRate}%</td>
                        <td className="px-2 py-1 border">{item.sku}</td>
                        <td className="px-2 py-1 border">
                          {item.warehouse || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <Button
              onClick={onCancel}
              className="bg-gray-200 text-gray-700 hover:bg-gray-300"
            >
              取消
            </Button>
            {!previewData.length ? (
              <Button
                onClick={parseAndPreviewData}
                disabled={isProcessing}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                {isProcessing ? "处理中..." : "解析数据"}
              </Button>
            ) : (
              <Button
                onClick={handleConfirmImport}
                disabled={isProcessing}
                className="bg-green-600 text-white hover:bg-green-700"
              >
                {isProcessing ? "导入中..." : "确认导入"}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
