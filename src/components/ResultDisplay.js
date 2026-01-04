"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { useSupplier } from "@/context/SupplierContext";
import { downloadExcel } from "@/lib/excelHandler";
import { processWithSkuAndBatch } from "@/lib/dataProcessor";
import { Button } from "./ui/button.js";
import { toast } from "sonner";

export default function ResultDisplay() {
  const {
    originalData,
    processedData,
    uploadedFiles,
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

  const { suppliers, loadSuppliers } = useSupplier();
  const [suppliersLoaded, setSuppliersLoaded] = useState(false);

  // 组件挂载时加载供应商数据
  useEffect(() => {
    const loadSupplierData = async () => {
      try {
        await loadSuppliers();
        setSuppliersLoaded(true);
        addLog("供应商数据加载完成", "info");
      } catch (error) {
        console.error("加载供应商数据失败:", error);
        addLog("加载供应商数据失败", "error");
      }
    };

    loadSupplierData();
  }, [loadSuppliers, addLog]);

  // 获取第一个上传的文件（兼容单文件模式）
  const uploadedFile = uploadedFiles.length > 0 ? uploadedFiles[0] : null;

  const [hasFailedReplacements, setHasFailedReplacements] = useState(false);
  const [isDeductingInventory, setIsDeductingInventory] = useState(false);
  const [inventoryDeducted, setInventoryDeducted] = useState(false);

  // 提取文件名中的日期部分
  const extractDateFromFileName = (fileName) => {
    if (!fileName) {
      console.log("文件名为空，返回空字符串");
      return "";
    }

    console.log("提取日期的文件名:", fileName); // 调试信息

    // 优先匹配格式：数字_数字（如 162418297002_20251130），取后面的8位数字
    const underscoreMatch = fileName.match(/_\d{8}/);
    if (underscoreMatch) {
      const datePart = underscoreMatch[0].substring(1); // 去掉下划线
      console.log("找到下划线分隔的日期:", datePart);
      return datePart;
    }

    // 如果没有下划线格式，匹配任何8位数字
    const dateMatch = fileName.match(/(\d{8})/);
    console.log("日期匹配结果:", dateMatch); // 调试信息

    if (dateMatch) {
      return dateMatch[1];
    }

    // 如果都没有找到，返回去除扩展名的文件名
    const baseName = fileName.replace(/\.[^/.]+$/, "");
    console.log("返回基础文件名:", baseName); // 调试信息
    return baseName;
  };

  // 复制列数据功能
  const handleCopyColumn = (columnName) => {
    const dataToCopy = processedData
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
      const datePart = extractDateFromFileName(uploadedFile?.name);
      const fileName = `订单处理结果_${datePart}.xlsx`;
      console.log("生成的文件名:", fileName); // 调试信息
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

    if (!suppliersLoaded) {
      setError("供应商数据尚未加载完成，请稍后再试");
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
      addLog(`使用 ${suppliers.length} 个供应商数据进行匹配`, "info");
      addLog("开始物料名称替换、批次号和供应商信息添加处理...", "info");

      const result = processWithSkuAndBatch(
        processedData,
        dbInventoryItems,
        suppliers
      );
      const enhancedData = result.data;
      const stats = result.stats;

      setSkuProcessedData(enhancedData);
      // 直接用物料名称替换后的数据替换processedData
      setProcessedData(enhancedData);

      // 设置是否有失败的替换
      setHasFailedReplacements(stats.failed > 0);

      addLog(
        `物料名称替换、批次号和供应商信息处理完成，生成 ${enhancedData.length} 条增强数据`,
        "success"
      );

      // 显示替换统计信息
      addLog(
        `替换统计: 成功 ${stats.success} 条，失败 ${stats.failed} 条`,
        stats.failed > 0 ? "warning" : "success"
      );

      // 统计供应商信息匹配情况
      const supplierMatchedCount = enhancedData.filter(
        (item) => item["供应商ID"] && item["供应商ID"].trim() !== ""
      ).length;

      addLog(
        `供应商信息匹配: ${supplierMatchedCount} 条记录包含供应商信息`,
        "info"
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
      const datePart = extractDateFromFileName(uploadedFile?.name);
      const fileName = `物料名称替换订单结果_${datePart}.xlsx`;
      console.log("生成的SKU文件名:", fileName); // 调试信息
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
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
                  <div>
                    <span className="text-blue-700">供应商匹配:</span>
                    <span className="ml-2 font-medium text-blue-900">
                      {
                        skuProcessedData.filter(
                          (item) =>
                            item["供应商ID"] && item["供应商ID"].trim() !== ""
                        ).length
                      }{" "}
                      条
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-700">批次号匹配:</span>
                    <span className="ml-2 font-medium text-blue-900">
                      {
                        skuProcessedData.filter(
                          (item) =>
                            item["供应商ID"] &&
                            item["供应商ID"].trim() !== "" &&
                            item["批次号"] &&
                            item["批次号"].trim() !== ""
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
              <Button variant="destructive" onClick={handleReset}>
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
            <div className="mt-2 text-sm text-gray-500 text-center">
              💡 提示：点击表头可复制该列的所有数据
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
