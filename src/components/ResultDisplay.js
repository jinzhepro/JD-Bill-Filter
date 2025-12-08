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

  // 计算总计数量和金额
  const calculateTotals = useCallback(() => {
    if (!processedData || processedData.length === 0) {
      return {
        totalQuantity: 0,
        totalAmount: 0,
      };
    }

    return processedData.reduce(
      (totals, item) => {
        const quantity = parseFloat(item["数量"]) || 0;
        const amount = parseFloat(item["总价"]) || 0;

        return {
          totalQuantity: totals.totalQuantity + quantity,
          totalAmount: totals.totalAmount + amount,
        };
      },
      {
        totalQuantity: 0,
        totalAmount: 0,
      }
    );
  }, [processedData]);

  const totals = calculateTotals();

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

        {/* 总计统计 */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-700">
                总数量：
              </span>
              <span className="text-2xl font-bold text-blue-600">
                {totals.totalQuantity}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-2">所有商品的数量合计</p>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-700">
                总金额：
              </span>
              <span className="text-2xl font-bold text-purple-600">
                ¥{totals.totalAmount.toFixed(2)}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              所有商品的总价合计（单价 × 数量）
            </p>
          </div>
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
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <span className="text-sm font-medium text-gray-600">
                  总数量
                </span>
                <div className="text-lg font-bold text-blue-600">
                  {totals.totalQuantity}
                </div>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">
                  总金额
                </span>
                <div className="text-lg font-bold text-purple-600">
                  ¥{totals.totalAmount.toFixed(2)}
                </div>
              </div>
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
          <li>• 已删除费用项为"直营服务费"的数据行</li>
          <li>• 已统计所有单据类型为"订单"的商品数量</li>
          <li>• 已根据商品名称扣减"取消退款单"和"售后服务单"的数量</li>
          <li>• 已应用商品单价并计算总价</li>
          <li>• 下载的文件包含：商品名称、商品编号、单价、数量、总价</li>
        </ul>
      </div>
    </section>
  );
}
