"use client";

import React, { useState, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { ProcessingStep } from "@/types";
import { downloadExcel } from "@/lib/excelHandler";
import { generateStatistics } from "@/lib/dataProcessor";
import Button from "./ui/Button";
import { StatsTable, PreviewTable } from "./ui/Table";

export default function ResultDisplay() {
  const {
    uploadedFile,
    originalData,
    processedData,
    setStep,
    addLog,
    setError,
    clearError,
  } = useApp();

  const [showPreview, setShowPreview] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // 生成统计信息
  const stats = generateStatistics(originalData, processedData);

  // 计算总计总价
  const calculateTotalPrice = useCallback(() => {
    if (!processedData || processedData.length === 0) {
      return 0;
    }
    return processedData.reduce((total, item) => {
      const price = parseFloat(item["总价"]) || 0;
      return total + price;
    }, 0);
  }, [processedData]);

  const totalPrice = calculateTotalPrice();

  // 下载处理后的Excel文件
  const handleDownload = useCallback(async () => {
    if (!processedData || processedData.length === 0) {
      setError("没有可下载的数据");
      return;
    }

    try {
      setIsDownloading(true);
      clearError();

      // 生成文件名
      const originalName = uploadedFile.name.replace(/\.[^/.]+$/, "");
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const fileName = `${originalName}_已处理_${date}.xlsx`;

      // 下载文件
      await downloadExcel(processedData, fileName);
      addLog(`文件 "${fileName}" 下载成功`, "success");
    } catch (error) {
      console.error("下载失败:", error);
      setError(`文件下载失败: ${error.message}`);
      addLog(`下载失败: ${error.message}`, "error");
    } finally {
      setIsDownloading(false);
    }
  }, [processedData, uploadedFile, setError, clearError, addLog]);

  // 切换预览显示
  const togglePreview = useCallback(() => {
    setShowPreview(!showPreview);
  }, [showPreview]);

  // 重新开始
  const handleRestart = useCallback(() => {
    setStep(ProcessingStep.UPLOAD);
    addLog("已重新开始", "info");
  }, [setStep, addLog]);

  if (!processedData || processedData.length === 0) {
    return null;
  }

  return (
    <section className="bg-white rounded-xl shadow-lg p-8 animate-fade-in">
      <h3 className="text-2xl font-semibold text-primary-600 mb-6 text-center">
        处理结果
      </h3>

      {/* 统计信息 */}
      <div className="mb-6">
        <StatsTable stats={stats} />

        {/* 总计总价 */}
        <div className="mt-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 border border-green-200">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-gray-700">
              总计总价：
            </span>
            <span className="text-2xl font-bold text-green-600">
              ¥{totalPrice.toFixed(2)}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            所有商品的总价合计（单价 × 数量）
          </p>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-4 justify-center mb-6">
        <Button
          variant="success"
          onClick={handleDownload}
          disabled={isDownloading}
        >
          {isDownloading ? "下载中..." : "下载处理后的Excel"}
        </Button>
        <Button variant="secondary" onClick={togglePreview}>
          {showPreview ? "隐藏预览" : "预览数据"}
        </Button>
      </div>

      {/* 数据预览 */}
      {showPreview && (
        <div className="mb-6">
          {/* 预览总计 */}
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">
                预览数据总计：
              </span>
              <span className="text-lg font-bold text-primary-600">
                ¥{totalPrice.toFixed(2)}
              </span>
            </div>
          </div>
          <PreviewTable data={processedData} maxRows={100} />
        </div>
      )}

      {/* 重新开始按钮 */}
      <div className="flex justify-center pt-6 border-t border-gray-200">
        <Button variant="primary" onClick={handleRestart}>
          重新开始
        </Button>
      </div>

      {/* 处理说明 */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 mb-2">处理说明</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• 已根据业务规则过滤数据</li>
          <li>• 已应用商品单价并计算总价</li>
          <li>• 已合并相同商品编码的商品</li>
          <li>• 下载的文件包含处理后的完整数据</li>
        </ul>
      </div>
    </section>
  );
}
