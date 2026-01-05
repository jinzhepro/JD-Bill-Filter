"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import {
  processMultipleFilesData,
  processWithSkuAndBatch,
} from "@/lib/dataProcessor";
import { downloadExcel } from "@/lib/excelHandler";
import { Button } from "./ui/button";
import { toast } from "sonner";

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
  const [isDeductingInventory, setIsDeductingInventory] = useState(false);
  const [inventoryDeducted, setInventoryDeducted] = useState(false);

  // 提取文件名中的日期部分
  const extractDateFromFileName = (fileName) => {
    if (!fileName) {
      return "";
    }

    // 优先匹配格式：数字_数字（如 162418297002_20251130），取后面的8位数字
    const underscoreMatch = fileName.match(/_\d{8}/);
    if (underscoreMatch) {
      const datePart = underscoreMatch[0].substring(1); // 去掉下划线
      return datePart;
    }

    // 如果没有下划线格式，匹配任何8位数字
    const dateMatch = fileName.match(/(\d{8})/);
    if (dateMatch) {
      return dateMatch[1];
    }

    // 如果都没有找到，返回去除扩展名的文件名
    return fileName.replace(/\.[^/.]+$/, "");
  };

  // 复制列数据功能
  const handleCopyColumn = (columnName) => {
    const dataToCopy = mergedData
      .map((row) => row[columnName])
      .filter((value) => value !== null && value !== undefined);
    const textToCopy = dataToCopy.join("\n");

    navigator.clipboard
      .writeText(textToCopy)
      .then(() => {
        addLog(
          `已复制列 "${columnName}" 的 ${dataToCopy.length} 条数据到剪贴板`,
          "success"
        );
        toast.success(
          `已复制列 "${columnName}" 的 ${dataToCopy.length} 条数据到剪贴板`
        );
      })
      .catch((err) => {
        console.error("复制失败:", err);
        addLog(`复制列 "${columnName}" 失败`, "error");
        toast.error(`复制列 "${columnName}" 失败`);
      });
  };

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

  // 库存扣减处理
  const handleInventoryDeduction = async () => {
    if (!skuProcessedData || skuProcessedData.length === 0) {
      setError("没有可进行库存扣减的数据");
      return;
    }

    try {
      setIsDeductingInventory(true);
      addLog("开始执行库存扣减...", "info");

      // 从数据库获取最新的库存数据
      const { getInventoryFromDatabase } = await import(
        "@/lib/inventoryStorage"
      );
      const dbInventoryItems = await getInventoryFromDatabase();

      if (!dbInventoryItems || dbInventoryItems.length === 0) {
        setError("数据库中没有库存数据");
        return;
      }

      const { deductInventory } = await import("@/lib/dataProcessor");
      const deductionResult = await deductInventory(
        skuProcessedData,
        dbInventoryItems
      );

      if (deductionResult.success) {
        addLog(
          `库存扣减成功：共扣减 ${deductionResult.totalDeducted} 件商品，创建 ${deductionResult.deductionRecords.length} 条扣减记录`,
          "success"
        );
        setInventoryDeducted(true);
      } else {
        addLog(
          `库存扣减部分失败：${deductionResult.errors.join(", ")}`,
          "warning"
        );
      }
    } catch (error) {
      console.error("库存扣减失败:", error);
      setError(`库存扣减失败: ${error.message}`);
      addLog(`库存扣减失败: ${error.message}`, "error");
    } finally {
      setIsDeductingInventory(false);
    }
  };

  // 下载合并结果
  const handleDownloadMerged = useCallback(() => {
    if (!mergedData || mergedData.length === 0) return;

    try {
      // 提取所有文件的日期部分
      const dateParts = uploadedFiles
        .map((file) => extractDateFromFileName(file.name))
        .filter((date) => date);
      let datePart;

      if (dateParts.length === 0) {
        datePart = "data";
      } else if (dateParts.length === 1) {
        datePart = dateParts[0];
      } else {
        // 多个文件时，用分隔符连接日期
        datePart = dateParts.join("-");
      }

      const fileName = `多文件合并结果_${datePart}.xlsx`;
      downloadExcel(mergedData, fileName);
      addLog(`合并结果已下载: ${fileName}`, "success");
    } catch (error) {
      console.error("下载合并结果失败:", error);
      setError(`下载失败: ${error.message}`);
    }
  }, [mergedData, addLog, setError, uploadedFiles]);

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
                      <span className="text-blue-700">税率匹配:</span>
                      <span className="ml-2 font-medium text-blue-900">
                        {
                          skuProcessedData.filter(
                            (item) =>
                              item["税率"] &&
                              item["税率"].toString().trim() !== ""
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
                    {isSkuProcessing ? "处理中..." : "处理"}
                  </Button>
                )}
                {skuProcessedData && skuProcessedData.length > 0 && (
                  <Button
                    variant="warning"
                    onClick={handleInventoryDeduction}
                    disabled={
                      isDeductingInventory ||
                      hasFailedReplacements ||
                      inventoryDeducted
                    }
                    className={`${
                      isDeductingInventory ||
                      hasFailedReplacements ||
                      inventoryDeducted
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-orange-600 hover:bg-orange-700"
                    } text-white`}
                    title={
                      hasFailedReplacements
                        ? "存在替换失败的记录，无法扣减库存"
                        : inventoryDeducted
                        ? "库存已扣减"
                        : "扣减库存"
                    }
                  >
                    {isDeductingInventory
                      ? "扣减中..."
                      : hasFailedReplacements
                      ? "存在替换失败，无法扣减"
                      : inventoryDeducted
                      ? "库存已扣减"
                      : "扣减库存"}
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
                <Button onClick={handleMergeProcess}>重新合并</Button>
                <Button variant="destructive" onClick={handleResetMerge}>
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
                      <th
                        key={index}
                        onClick={() => handleCopyColumn(header)}
                        title={`点击复制 "${header}" 列数据`}
                        className="cursor-pointer hover:bg-blue-50 transition-colors"
                      >
                        {header} 📋
                      </th>
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
                          : key === "税率"
                          ? value
                            ? `${value}%`
                            : "未匹配"
                          : value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-2 text-sm text-gray-500 text-center">
              💡 提示：点击表头可复制该列的所有数据
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
