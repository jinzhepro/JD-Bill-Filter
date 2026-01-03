"use client";

import React from "react";
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
    addLog,
    setError,
  } = useApp();

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

    if (!inventoryItems || inventoryItems.length === 0) {
      setError("没有库存数据，请先添加库存项");
      return;
    }

    try {
      setSkuProcessing(true);
      addLog("开始物料名称替换和批次号添加处理...", "info");

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
      console.error("SKU处理失败:", error);
      setError(`物料名称替换处理失败: ${error.message}`);
      addLog(`物料名称替换处理失败: ${error.message}`, "error");
    } finally {
      setSkuProcessing(false);
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
              <Button variant="success" onClick={handleDownloadExcel}>
                下载Excel结果
              </Button>
              <Button
                variant="info"
                onClick={handleSkuProcessing}
                disabled={isSkuProcessing}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isSkuProcessing ? "处理中..." : "物料名称替换和批次号"}
              </Button>
              {skuProcessedData && skuProcessedData.length > 0 && (
                <Button
                  variant="success"
                  onClick={handleDownloadSkuExcel}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  下载物料名称替换结果
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

      {/* SKU处理后的数据展示 */}
      {skuProcessedData && skuProcessedData.length > 0 && (
        <section className="bg-white rounded-xl shadow-lg p-8 animate-fade-in">
          {/* SKU处理统计信息 */}
          <div className="mb-6 p-4 bg-purple-50 rounded-lg">
            <h3 className="text-sm font-medium text-purple-900 mb-2">
              物料名称替换和批次号处理统计
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-purple-700">处理记录数:</span>
                <span className="ml-2 font-medium text-purple-900">
                  {skuProcessedData.length}
                </span>
              </div>
              <div>
                <span className="text-purple-700">有批次号记录:</span>
                <span className="ml-2 font-medium text-purple-900">
                  {
                    skuProcessedData.filter(
                      (item) => item["批次号"] && item["批次号"].trim() !== ""
                    ).length
                  }
                </span>
              </div>
              <div>
                <span className="text-purple-700">物料名称替换记录:</span>
                <span className="ml-2 font-medium text-purple-900">
                  {
                    skuProcessedData.filter(
                      (item) => item["批次号"] && item["批次号"].trim() !== ""
                    ).length
                  }
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                物料名称替换和批次号处理结果
              </h2>
              <p className="text-gray-600">
                已根据库存数据用物料名称替换商品名称并添加批次号，共{" "}
                {skuProcessedData.length} 条记录
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="success"
                onClick={handleDownloadSkuExcel}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                下载SKU增强结果
              </Button>
            </div>
          </div>

          {/* SKU处理后数据表格 */}
          <div className="table-container custom-scrollbar">
            <table className="preview-table">
              <thead>
                <tr>
                  {skuProcessedData.length > 0 &&
                    Object.keys(skuProcessedData[0]).map((header, index) => (
                      <th key={index}>{header}</th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {skuProcessedData.map((row, rowIndex) => (
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
