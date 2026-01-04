"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { downloadExcel } from "@/lib/excelHandler";
import { processWithSkuAndBatch } from "@/lib/dataProcessor";
import Button from "./ui/Button";

export default function ResultDisplay() {
  const {
    originalData,
    processedData,
    uploadedFile,
    reset,
    inventoryItems,
    skuProcessedData,
    isSkuProcessing,
    setSkuProcessedData,
    setSkuProcessing,
    setProcessedData,
    addLog,
    setError,
  } = useApp();

  const [hasFailedReplacements, setHasFailedReplacements] = useState(false);
  const [isDeductingInventory, setIsDeductingInventory] = useState(false);
  const [inventoryDeducted, setInventoryDeducted] = useState(false);

  if (!originalData || originalData.length === 0) {
    return null;
  }

  const handleReset = () => {
    reset();
  };

  const handleDownloadCSV = () => {
    if (!uploadedFile) return;

    // 创建CSV内容
    const headers = Object.keys(originalData[0]);
    const csvContent = [
      headers.join(","),
      ...originalData.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            // 处理包含逗号的值，用引号包围
            if (typeof value === "string" && value.includes(",")) {
              return `"${value}"`;
            }
            return value;
          })
          .join(",")
      ),
    ].join("\n");

    // 创建Blob并下载
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `processed_${uploadedFile.name}`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadExcel = () => {
    if (!processedData || processedData.length === 0) return;

    try {
      const fileName = `订单处理结果_${
        uploadedFile?.name.replace(/\.[^/.]+$/, "") || "data"
      }.xlsx`;
      downloadExcel(processedData, fileName);
    } catch (error) {
      console.error("Excel下载失败:", error);
    }
  };

  const handleSkuProcessing = async () => {
    if (!processedData || processedData.length === 0) {
      setError("没有可处理的订单数据");
      return;
    }

    try {
      setSkuProcessing(true);
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

      const result = processWithSkuAndBatch(processedData, dbInventoryItems);
      const enhancedData = result.data;
      const stats = result.stats;

      setSkuProcessedData(enhancedData);
      // 直接用物料名称替换后的数据替换processedData
      setProcessedData(enhancedData);

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
      setSkuProcessing(false);
    }
  };

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

  const handleDownloadSkuExcel = () => {
    if (!skuProcessedData || skuProcessedData.length === 0) return;

    try {
      const fileName = `物料名称替换订单结果_${
        uploadedFile?.name.replace(/\.[^/.]+$/, "") || "data"
      }.xlsx`;
      downloadExcel(skuProcessedData, fileName);
    } catch (error) {
      console.error("物料名称替换Excel下载失败:", error);
    }
  };

  return (
    <div className="space-y-8">
      {/* 返回按钮和标题 */}
      <div className="flex justify-between items-center">
        <Button
          onClick={handleReset}
          className="bg-gray-200 text-gray-700 hover:bg-gray-300"
        >
          ← 返回主界面
        </Button>
        <h1 className="text-2xl font-bold text-white">订单处理结果</h1>
        <div></div>
      </div>

      {/* 处理后数据展示 */}
      {processedData && processedData.length > 0 && (
        <section className="bg-white rounded-xl shadow-lg p-8 animate-fade-in">
          {/* 统计信息 */}
          <div className="mb-6 p-4 bg-green-50 rounded-lg">
            <h3 className="text-sm font-medium text-green-900 mb-2">
              处理统计
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-green-700">订单数量:</span>
                <span className="ml-2 font-medium text-green-900">
                  {processedData.length}
                </span>
              </div>
              <div>
                <span className="text-green-700">商品总数:</span>
                <span className="ml-2 font-medium text-green-900">
                  {processedData.reduce(
                    (sum, item) => sum + parseFloat(item.商品数量),
                    0
                  )}
                </span>
              </div>
              <div>
                <span className="text-green-700">总金额:</span>
                <span className="ml-2 font-medium text-green-900">
                  ¥
                  {processedData
                    .reduce((sum, item) => sum + parseFloat(item.总价), 0)
                    .toFixed(2)}
                </span>
              </div>
            </div>

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
                    <span className="text-blue-700 text-sm">未匹配的SKU:</span>
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
          </div>

          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                订单处理结果
              </h2>
              <p className="text-gray-600">
                已处理 {processedData.length} 条订单记录
              </p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <Button
                variant="info"
                onClick={handleSkuProcessing}
                disabled={isSkuProcessing}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isSkuProcessing ? "处理中..." : "物料名称替换"}
              </Button>
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
                  onClick={handleDownloadSkuExcel}
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
              <Button variant="danger" onClick={handleReset}>
                重新上传
              </Button>
            </div>
          </div>

          {/* 处理后数据表格 */}
          <div className="table-container custom-scrollbar">
            <table className="preview-table">
              <thead>
                <tr>
                  {processedData.length > 0 &&
                    Object.keys(processedData[0]).map((header, index) => (
                      <th key={index}>{header}</th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {processedData.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {Object.entries(row).map(([key, value]) => (
                      <td key={key}>
                        {key === "单价" || key === "总价"
                          ? `¥${parseFloat(value).toFixed(2)}`
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
