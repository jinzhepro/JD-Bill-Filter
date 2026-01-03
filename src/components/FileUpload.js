"use client";

import React, { useState, useRef, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import {
  validateFileType,
  validateFileSize,
  readFile,
  downloadExcel,
} from "@/lib/excelHandler";
import {
  validateDataStructure,
  processOrderData,
  processWithSkuAndBatch,
} from "@/lib/dataProcessor";
import Button from "./ui/Button";

export default function FileUpload() {
  const {
    setFile,
    setOriginalData,
    setProcessedData,
    addLog,
    setError,
    clearError,
    setProcessing,
    inventoryItems,
    setSkuProcessedData,
  } = useApp();

  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = useCallback(
    async (file) => {
      if (!file) return;

      try {
        setProcessing(true);
        clearError();

        // 验证文件类型
        if (!validateFileType(file)) {
          throw new Error("请选择有效的文件（.xlsx, .xls 或 .csv 格式）");
        }

        // 验证文件大小
        if (!validateFileSize(file)) {
          throw new Error("文件大小不能超过50MB");
        }

        setFile(file);
        addLog(`文件 "${file.name}" 上传成功`, "success");

        // 读取文件
        const fileType = file.name.match(/\.(xlsx|xls|csv)$/i)[1].toLowerCase();
        const data = await readFile(file, fileType);

        // 验证数据结构
        validateDataStructure(data);
        addLog("数据结构验证通过", "info");

        // 设置原始数据
        setOriginalData(data);
        addLog(`成功读取 ${data.length} 行数据`, "info");

        // 处理订单数据
        addLog("开始处理订单数据...", "info");
        const processedData = processOrderData(data);
        setProcessedData(processedData);
        addLog(`成功处理 ${processedData.length} 条订单记录`, "success");

        // 自动应用SKU映射和批次号替换
        if (inventoryItems && inventoryItems.length > 0) {
          try {
            addLog("开始自动应用物料名称替换和批次号...", "info");
            const enhancedData = processWithSkuAndBatch(
              processedData,
              inventoryItems
            );
            setSkuProcessedData(enhancedData);
            addLog(
              `物料名称替换和批次号处理完成，生成 ${enhancedData.length} 条增强数据`,
              "success"
            );
          } catch (error) {
            console.error("自动SKU处理失败:", error);
            addLog(`自动物料名称替换处理失败: ${error.message}`, "error");
            // 不阻止流程，继续执行
          }
        } else {
          addLog("没有库存数据，跳过物料名称替换和批次号处理", "info");
        }

        addLog("文件上传完成", "success");
      } catch (error) {
        console.error("文件处理失败:", error);
        setError(error.message);
        addLog(`文件处理失败: ${error.message}`, "error");
      } finally {
        setProcessing(false);
      }
    },
    [
      setFile,
      setOriginalData,
      addLog,
      setError,
      clearError,
      setProcessing,
      inventoryItems,
      setSkuProcessedData,
    ]
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

  return (
    <section className="bg-white rounded-xl shadow-lg p-8 animate-fade-in">
      <div className="text-center">
        <div
          className={`
            border-3 border-dashed rounded-xl p-16 transition-all duration-300 cursor-pointer
            ${
              isDragOver
                ? "border-green-500 bg-green-50 transform scale-102"
                : "border-primary-300 bg-primary-50 hover:border-primary-400 hover:bg-primary-100"
            }
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleButtonClick}
        >
          <div className="text-6xl mb-6">📁</div>
          <h3 className="text-2xl font-semibold text-primary-600 mb-4">
            上传Excel/CSV文件
          </h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            拖拽文件到此处或点击选择文件（支持 .xlsx, .xls, .csv 格式）
          </p>
          <Button variant="primary" size="lg" disabled={false} className="px-8">
            选择文件
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileInputChange}
          className="hidden"
        />

        <div className="mt-6 text-sm text-gray-500">
          <p>支持的文件格式：.xlsx, .xls, .csv</p>
          <p>最大文件大小：50MB</p>
        </div>

        {/* 处理说明 */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg text-left">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            文件上传说明
          </h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 支持上传 Excel (.xlsx, .xls) 和 CSV 文件</li>
            <li>• 文件大小限制为 50MB</li>
            <li>• 上传后系统会验证文件格式和数据结构</li>
            <li>• 成功上传后会显示读取的数据行数</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
