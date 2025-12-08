"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { ProcessingStep } from "@/types";
import { processDataSecondStage } from "@/lib/dataProcessor";
import Button from "./ui/Button";
import ProgressBar from "./ui/ProgressBar";

export default function DataProcessor() {
  const {
    orderStats,
    productPrices,
    setProcessedData,
    setStep,
    addLog,
    setError,
    clearError,
    logs,
    clearLogs,
  } = useApp();

  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("准备中...");
  const [isProcessing, setIsProcessing] = useState(false);

  // 处理数据
  const processData = useCallback(async () => {
    if (!orderStats || Object.keys(orderStats).length === 0) {
      setError("没有可处理的订单统计数据");
      return;
    }

    if (!productPrices || Object.keys(productPrices).length === 0) {
      setError("请先为商品设置单价");
      return;
    }

    try {
      setIsProcessing(true);
      clearError();
      clearLogs();
      setProgress(0);
      setProgressText("准备中...");

      // 使用第二阶段的处理逻辑
      setProgress(20);
      setProgressText("正在应用单价并生成最终结果...");
      const result = processDataSecondStage(orderStats, productPrices, addLog);

      // 步骤完成
      setProgress(100);
      setProgressText("处理完成！");
      addLog("所有数据处理完成", "success");

      // 设置处理后的数据
      setProcessedData(result.processedData);

      // 延迟显示结果
      setTimeout(() => {
        setStep(ProcessingStep.RESULT);
        addLog("处理完成，可以查看结果和下载文件", "success");
      }, 1000);
    } catch (error) {
      console.error("数据处理失败:", error);
      addLog(`处理失败: ${error.message}`, "error");
      setError(`数据处理失败: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  }, [
    orderStats,
    productPrices,
    setProcessedData,
    setStep,
    addLog,
    setError,
    clearError,
    clearLogs,
  ]);

  // 组件挂载时自动开始处理
  useEffect(() => {
    if (
      orderStats &&
      Object.keys(orderStats).length > 0 &&
      productPrices &&
      Object.keys(productPrices).length > 0
    ) {
      processData();
    }
  }, [orderStats, productPrices, processData]);

  // 获取日志类型对应的样式
  const getLogTypeClass = (type) => {
    const typeClasses = {
      info: "text-blue-600",
      success: "text-green-600",
      error: "text-red-600",
      warning: "text-yellow-600",
    };
    return typeClasses[type] || "text-gray-600";
  };

  return (
    <section className="bg-white rounded-xl shadow-lg p-8 animate-fade-in">
      <h3 className="text-2xl font-semibold text-primary-600 mb-6 text-center">
        处理进度
      </h3>

      {/* 进度条 */}
      <div className="mb-6">
        <ProgressBar
          progress={progress}
          text={progressText}
          showPercentage={true}
          size="lg"
          color="primary"
        />
      </div>

      {/* 日志区域 */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-sm font-medium text-gray-700">处理日志</h4>
          {logs.length > 0 && (
            <Button variant="secondary" size="sm" onClick={clearLogs}>
              清空日志
            </Button>
          )}
        </div>
        <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-2">
          {logs.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">
              暂无日志信息
            </p>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className={`text-sm font-mono ${getLogTypeClass(log.type)}`}
              >
                <span className="text-gray-500">[{log.timestamp}]</span>{" "}
                {log.message}
              </div>
            ))
          )}
        </div>
      </div>

      {/* 操作按钮 */}
      {isProcessing && (
        <div className="mt-6 text-center">
          <p className="text-gray-600">正在处理数据，请稍候...</p>
        </div>
      )}

      {/* 处理说明 */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 mb-2">处理说明</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• 应用商品单价到最终数量</li>
          <li>• 计算每个商品的总价（单价 × 最终数量）</li>
          <li>• 生成包含单价和总价的统计结果</li>
          <li>• 准备下载处理后的Excel文件</li>
        </ul>
      </div>
    </section>
  );
}
