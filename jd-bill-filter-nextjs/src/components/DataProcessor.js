"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { ProcessingStep } from "@/types";
import {
  groupByOrderNumber,
  applyBusinessRules,
  applyUnitPrices,
  mergeSameSKU,
  generateStatistics,
} from "@/lib/dataProcessor";
import Button from "./ui/Button";
import ProgressBar from "./ui/ProgressBar";

export default function DataProcessor() {
  const {
    originalData,
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
    if (!originalData || originalData.length === 0) {
      setError("没有可处理的数据，请重新上传文件");
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

      // 步骤1：按订单编号分组
      setProgress(15);
      setProgressText("正在按订单编号分组...");
      const groupedData = groupByOrderNumber(originalData);
      addLog(
        `按订单编号分组完成，共 ${Object.keys(groupedData).length} 个订单组`,
        "info"
      );

      // 步骤2：应用业务规则
      setProgress(35);
      setProgressText("正在应用业务规则...");
      const filteredData = applyBusinessRules(groupedData, addLog);
      addLog("业务规则处理完成", "success");

      // 步骤3：应用单价到数据
      setProgress(55);
      setProgressText("正在应用单价到数据...");
      console.log("应用单价前的 productPrices:", productPrices);
      const pricedData = applyUnitPrices(filteredData, productPrices);
      console.log("应用单价后的 pricedData 样本:", pricedData.slice(0, 2));

      // 统计费用项过滤情况
      const beforeFilterCount = filteredData.length;
      const afterFilterCount = pricedData.length;
      const filteredFeeCount = beforeFilterCount - afterFilterCount;

      if (filteredFeeCount > 0) {
        addLog(
          `费用项过滤完成，仅保留费用项为"货款"的记录，过滤掉 ${filteredFeeCount} 条其他费用项记录`,
          "info"
        );
      } else {
        addLog("所有记录均为费用项'货款'，无需额外过滤", "info");
      }
      addLog("单价应用完成", "success");

      // 步骤4：合并相同SKU的商品
      setProgress(70);
      setProgressText("正在合并相同SKU的商品...");
      const beforeMergeCount = pricedData.length;
      const mergedData = mergeSameSKU(pricedData);
      const afterMergeCount = mergedData.length;
      const mergedCount = beforeMergeCount - afterMergeCount;
      addLog(`SKU合并完成，合并了 ${mergedCount} 行重复数据`, "success");

      // 步骤5：生成统计信息
      setProgress(85);
      setProgressText("正在生成统计信息...");
      const stats = generateStatistics(originalData, mergedData);
      addLog("统计信息生成完成", "success");

      // 步骤6：完成处理
      setProgress(100);
      setProgressText("处理完成！");
      addLog("所有数据处理完成", "success");

      // 设置处理后的数据
      setProcessedData(mergedData);

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
    originalData,
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
    if (originalData.length > 0 && Object.keys(productPrices).length > 0) {
      processData();
    }
  }, [originalData, productPrices, processData]);

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
    </section>
  );
}
