"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import {
  processMultipleFilesData,
  processWithSkuAndBatch,
} from "@/lib/dataProcessor";
import { downloadExcel } from "@/lib/excelHandler";
import Button from "./ui/Button";

export default function MergeProcessor() {
  const {
    uploadedFiles,
    fileDataArray,
    mergeMode,
    setMergeMode,
    setMergedData,
    mergedData,
    addLog,
    setError,
    clearError,
    setProcessing,
    reset,
  } = useApp();

  const [isProcessing, setIsProcessing] = useState(false);
  const [isSkuProcessing, setIsSkuProcessing] = useState(false);
  const [skuProcessedData, setSkuProcessedData] = useState([]);
  const [hasFailedReplacements, setHasFailedReplacements] = useState(false);

  // 处理多文件合并
  const handleMergeProcess = useCallback(async () => {
    if (!fileDataArray || fileDataArray.length === 0) {
      setError("没有可合并的文件数据");
      return;
    }

    try {
      setIsProcessing(true);
      setProcessing(true);
      clearError();

      addLog("开始处理多文件合并...", "info");

      // 提取所有文件的数据
      const dataArray = fileDataArray.map((item) => item.data);

      // 处理多文件数据合并
      const mergedResult = processMultipleFilesData(dataArray);

      // 设置合并后的数据
      setMergedData(mergedResult);

      addLog(
        `多文件合并完成，生成 ${mergedResult.length} 条合并记录`,
        "success"
      );

      // 计算统计信息
      const totalQuantity = mergedResult.reduce(
        (sum, item) => sum + parseFloat(item.商品数量 || 0),
        0
      );
      const totalAmount = mergedResult.reduce(
        (sum, item) => sum + parseFloat(item.总价 || 0),
        0
      );

      addLog(
        `合并统计：商品总数 ${totalQuantity}，总金额 ¥${totalAmount.toFixed(
          2
        )}`,
        "info"
      );
    } catch (error) {
      console.error("多文件合并失败:", error);
      setError(error.message);
      addLog(`多文件合并失败: ${error.message}`, "error");
    } finally {
      setIsProcessing(false);
      setProcessing(false);
    }
  }, [
    fileDataArray,
    setMergedData,
    addLog,
    setError,
    clearError,
    setProcessing,
  ]);

  // 物料名称替换处理
  const handleSkuProcessing = useCallback(async () => {
    if (!mergedData || mergedData.length === 0) {
      setError("没有可处理的合并数据");
      return;
    }

    try {
      setIsSkuProcessing(true);
      addLog("正在从数据库加载库存数据...", "info");

      // 从数据库获取最新的库存数据
      const { getInventoryFromDatabase } = await import(
        "@/lib/inventoryStorage"
      );
      const dbInventoryItems = await getInventoryFromDatabase();

      if (!dbInventoryItems || dbInventoryItems.length === 0) {
        setError("数据库中没有库存数据，请先添加库存项");
        return;
      }

      addLog(`从数据库加载了 ${dbInventoryItems.length} 条库存数据`, "info");
      addLog("开始物料名称替换和批次号添加处理...", "info");

      const result = processWithSkuAndBatch(mergedData, dbInventoryItems);
      const enhancedData = result.data;
      const stats = result.stats;

      setSkuProcessedData(enhancedData);
      // 直接用物料名称替换后的数据替换mergedData
      setMergedData(enhancedData);

      // 设置是否有失败的替换
      setHasFailedReplacements(stats.failed > 0);

      addLog(
        `物料名称替换和批次号处理完成，生成 ${enhancedData.length} 条增强数据`,
        "success"
      );

      // 显示替换统计信息
      addLog(
        `替换统计: 成功 ${stats.success} 条，失败 ${stats.failed} 条`,
        stats.failed > 0 ? "warning" : "success"
      );

      if (stats.failed > 0) {
        addLog(`未匹配的SKU: ${stats.failedSkus.join(", ")}`, "warning");
        addLog("注意：由于存在替换失败的记录，下载功能已被禁用", "error");
      }
    } catch (error) {
      console.error("SKU处理失败:", error);
      setError(`物料名称替换处理失败: ${error.message}`);
      addLog(`物料名称替换处理失败: ${error.message}`, "error");
    } finally {
      setIsSkuProcessing(false);
    }
  }, [mergedData, setMergedData, addLog, setError]);

  // 下载合并结果
  const handleDownloadMerged = useCallback(() => {
    if (!mergedData || mergedData.length === 0) return;

    try {
      const fileName = `多文件合并结果_${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;
      downloadExcel(mergedData, fileName);
      addLog(`合并结果已下载: ${fileName}`, "success");
    } catch (error) {
      console.error("下载合并结果失败:", error);
      setError(`下载失败: ${error.message}`);
    }
  }, [mergedData, addLog, setError]);

  // 重置合并模式
  const handleResetMerge = useCallback(() => {
    setMergeMode(false);
    setMergedData([]);
    reset();
  }, [setMergeMode, setMergedData, reset]);

  // 当进入合并模式时自动开始处理
  useEffect(() => {
    if (
      mergeMode &&
      fileDataArray &&
      fileDataArray.length > 0 &&
      !mergedData.length
    ) {
      handleMergeProcess();
    }
  }, [mergeMode, fileDataArray, mergedData.length, handleMergeProcess]);

  if (!mergeMode) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* 返回按钮和标题 */}
      <div className="flex justify-between items-center">
        <Button
          onClick={handleResetMerge}
          className="bg-gray-200 text-gray-700 hover:bg-gray-300"
        >
          ← 返回主界面
        </Button>
        <h1 className="text-2xl font-bold text-white">多文件合并处理</h1>
        <div></div>
      </div>

      {/* 合并处理状态 */}
      <section className="bg-white rounded-xl shadow-lg p-8 animate-fade-in">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            多文件合并处理
          </h2>

          {isProcessing ? (
            <div className="py-8">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              <p className="mt-4 text-gray-600">
                正在处理多文件合并，请稍候...
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 合并统计信息 */}
              {mergedData && mergedData.length > 0 && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <h3 className="text-sm font-medium text-green-900 mb-2">
                    合并统计
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-green-700">原始文件数:</span>
                      <span className="ml-2 font-medium text-green-900">
                        {uploadedFiles.length}
                      </span>
                    </div>
                    <div>
                      <span className="text-green-700">合并后记录数:</span>
                      <span className="ml-2 font-medium text-green-900">
                        {mergedData.length}
                      </span>
                    </div>
                    <div>
                      <span className="text-green-700">商品总数:</span>
                      <span className="ml-2 font-medium text-green-900">
                        {mergedData.reduce(
                          (sum, item) => sum + parseFloat(item.商品数量 || 0),
                          0
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-green-700">总金额:</span>
                      <span className="ml-2 font-medium text-green-900">
                        ¥
                        {mergedData
                          .reduce(
                            (sum, item) => sum + parseFloat(item.总价 || 0),
                            0
                          )
                          .toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 物料名称替换统计信息 */}
              {skuProcessedData && skuProcessedData.length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">
                    物料名称替换统计
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-blue-700">替换成功:</span>
                      <span className="ml-2 font-medium text-blue-900">
                        {
                          skuProcessedData.filter(
                            (item) =>
                              item["批次号"] && item["批次号"].trim() !== ""
                          ).length
                        }{" "}
                        条
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-700">替换失败:</span>
                      <span className="ml-2 font-medium text-blue-900">
                        {
                          skuProcessedData.filter(
                            (item) =>
                              !item["批次号"] || item["批次号"].trim() === ""
                          ).length
                        }{" "}
                        条
                      </span>
                    </div>
                  </div>

                  {/* 显示失败的SKU列表 */}
                  {skuProcessedData.filter(
                    (item) => !item["批次号"] || item["批次号"].trim() === ""
                  ).length > 0 && (
                    <div className="mt-3">
                      <span className="text-blue-700 text-sm">
                        未匹配的SKU:
                      </span>
                      <div className="mt-1 text-xs text-blue-600 bg-blue-100 p-2 rounded max-h-20 overflow-y-auto">
                        {skuProcessedData
                          .filter(
                            (item) =>
                              !item["批次号"] || item["批次号"].trim() === ""
                          )
                          .map((item) => item["商品编号"])
                          .join(", ")}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex justify-center gap-4">
                {mergedData && mergedData.length > 0 && (
                  <Button
                    variant="info"
                    onClick={handleSkuProcessing}
                    disabled={isSkuProcessing}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {isSkuProcessing ? "处理中..." : "物料名称替换"}
                  </Button>
                )}
                {skuProcessedData && skuProcessedData.length > 0 && (
                  <Button
                    variant="success"
                    onClick={handleDownloadMerged}
                    disabled={hasFailedReplacements}
                    className={`${
                      hasFailedReplacements
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-green-600 hover:bg-green-700"
                    } text-white`}
                    title={
                      hasFailedReplacements
                        ? "存在替换失败的记录，无法下载"
                        : "下载Excel结果"
                    }
                  >
                    {hasFailedReplacements
                      ? "存在替换失败，无法下载"
                      : "下载Excel结果"}
                  </Button>
                )}
                <Button variant="primary" onClick={handleMergeProcess}>
                  重新合并
                </Button>
                <Button variant="danger" onClick={handleResetMerge}>
                  重新开始
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 合并结果展示 */}
      {mergedData && mergedData.length > 0 && (
        <section className="bg-white rounded-xl shadow-lg p-8 animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                合并结果
              </h3>
              <p className="text-gray-600">
                显示全部 {mergedData.length} 条合并记录
              </p>
            </div>
          </div>

          {/* 合并结果表格 */}
          <div className="table-container custom-scrollbar">
            <table className="preview-table">
              <thead>
                <tr>
                  {mergedData.length > 0 &&
                    Object.keys(mergedData[0]).map((header, index) => (
                      <th key={index}>{header}</th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {mergedData.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {Object.entries(row).map(([key, value]) => (
                      <td key={key}>
                        {key === "单价" || key === "总价"
                          ? `¥${parseFloat(value).toFixed(2)}`
                          : key === "批次号"
                          ? value || "未匹配"
                          : value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
