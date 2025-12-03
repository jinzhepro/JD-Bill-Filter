"use client";

import React, { useState, useRef, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import {
  validateFileType,
  validateFileSize,
  readFile,
} from "@/lib/excelHandler";
import { validateDataStructure } from "@/lib/dataProcessor";
import { ProcessingStep } from "@/types";
import Button from "./ui/Button";

export default function FileUpload() {
  const {
    setFile,
    setOriginalData,
    setUniqueProducts,
    setStep,
    addLog,
    setError,
    clearError,
    defaultPricesConfig,
  } = useApp();

  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = useCallback(
    async (file) => {
      if (!file) return;

      try {
        setIsProcessing(true);
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

        // 提取唯一商品
        const uniqueProducts =
          require("@/lib/dataProcessor").extractUniqueProducts(
            data,
            defaultPricesConfig
          );
        setUniqueProducts(uniqueProducts);
        addLog(`提取到 ${uniqueProducts.length} 个唯一商品`, "info");

        // 统计应用了默认单价的商品数量
        const defaultPriceCount = uniqueProducts.filter(
          (p) => p.hasDefaultPrice
        ).length;
        if (defaultPriceCount > 0) {
          addLog(`自动应用了 ${defaultPriceCount} 个商品的默认单价`, "info");
        }

        // 切换到单价输入步骤
        setStep(ProcessingStep.PRICE_INPUT);
        addLog("请为商品设置单价", "info");
      } catch (error) {
        console.error("文件处理失败:", error);
        setError(error.message);
        addLog(`文件处理失败: ${error.message}`, "error");
      } finally {
        setIsProcessing(false);
      }
    },
    [
      setFile,
      setOriginalData,
      setUniqueProducts,
      setStep,
      addLog,
      setError,
      clearError,
      defaultPricesConfig,
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
          <Button
            variant="primary"
            size="lg"
            disabled={isProcessing}
            className="px-8"
          >
            {isProcessing ? "处理中..." : "选择文件"}
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
      </div>
    </section>
  );
}
