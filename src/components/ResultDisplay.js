"use client";

import React, { useState, useEffect, useRef } from "react";
import { useApp } from "@/context/AppContext";
import { useSupplier } from "@/context/SupplierContext";
import { downloadExcel } from "@/lib/excelHandler";
import { processWithSkuAndBatch } from "@/lib/dataProcessor";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";

export default function ResultDisplay() {
  const {
    originalData,
    processedData,
    uploadedFiles,
    resetOrder,
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
  const { toast } = useToast();
  const [suppliersLoaded, setSuppliersLoaded] = useState(false);
  const hasLoadedSuppliers = useRef(false);

  // 组件挂载时加载供应商数据
  useEffect(() => {
    if (hasLoadedSuppliers.current) return;
    hasLoadedSuppliers.current = true;

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
  const handleCopyColumn = async (columnName) => {
    try {
      const dataToCopy = processedData
        .map((row) => row[columnName])
        .filter((value) => value !== null && value !== undefined);
      const textToCopy = dataToCopy.join("\n");

      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        // 降级方案：使用 textarea
        const textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }

      addLog(
        `已复制列 "${columnName}" 的 ${dataToCopy.length} 条数据到剪贴板`,
        "success"
      );
      toast({
        title: `已复制列 "${columnName}" 的 ${dataToCopy.length} 条数据到剪贴板`,
      });
    } catch (err) {
      console.error("复制失败:", err);
      addLog(`复制列 "${columnName}" 失败`, "error");
      toast({
        variant: "destructive",
        title: `复制列 "${columnName}" 失败`,
      });
    }
  };

  if (!originalData || originalData.length === 0) {
    return null;
  }

  const handleReset = () => {
    resetOrder();
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
      toast({
        title: `Excel文件已保存: ${fileName}`,
      });
    } catch (error) {
      console.error("Excel下载失败:", error);
      toast({
        variant: "destructive",
        title: "Excel下载失败",
      });
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
      addLog("开始物料名称替换、税率添加和出库信息生成...", "info");

      const result = processWithSkuAndBatch(
        processedData,
        dbInventoryItems,
        suppliers
      );
      const enhancedData = result.data;
      const stats = result.stats;

      // 只展示出库信息，不实际扣减库存
      addLog("出库信息已生成，库存未实际扣减（仅展示模式）", "info");

      setSkuProcessedData(enhancedData);
      // 直接用物料名称替换后的数据替换processedData
      setProcessedData(enhancedData);

      // 设置是否有失败的替换
      setHasFailedReplacements(stats.failed > 0);

      addLog(
        `物料名称替换、税率处理和出库信息生成完成，生成 ${enhancedData.length} 条增强数据`,
        "success"
      );
      toast({
        title: `物料名称替换、税率处理和出库信息生成完成，生成 ${enhancedData.length} 条增强数据`,
      });

      // 显示替换统计信息
      addLog(
        `替换统计: 成功 ${stats.success} 条，失败 ${stats.failed} 条`,
        stats.failed > 0 ? "warning" : "success"
      );

      if (stats.failed > 0) {
        addLog(`未匹配的SKU: ${stats.failedSkus.join(", ")}`, "warning");
      }

      if (stats.failed > 0) {
        addLog("注意：由于存在替换失败的记录，下载功能已被禁用", "error");
      }
    } catch (error) {
      console.error("SKU处理失败:", error);
      setError(`物料名称替换和出库信息生成失败: ${error.message}`);
      addLog(`物料名称替换和出库信息生成失败: ${error.message}`, "error");
    } finally {
      setSkuProcessing(false);
    }
  };

  const handleDownloadSkuExcel = () => {
    if (!skuProcessedData || skuProcessedData.length === 0) return;

    try {
      const datePart = extractDateFromFileName(uploadedFile?.name);
      const fileName = `物料名称替换订单结果_${datePart}.xlsx`;
      console.log("生成的SKU文件名:", fileName); // 调试信息
      downloadExcel(skuProcessedData, fileName);
      toast({
        title: `Excel文件已保存: ${fileName}`,
      });
    } catch (error) {
      console.error("物料名称替换Excel下载失败:", error);
      toast({
        variant: "destructive",
        title: "Excel下载失败",
      });
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
                            !item["税率"] ||
                            item["税率"].toString().trim() === ""
                        ).length
                      }{" "}
                      条
                    </span>
                  </div>
                </div>

                {/* 显示失败的SKU列表 */}
                {skuProcessedData.filter(
                  (item) =>
                    !item["税率"] || item["税率"].toString().trim() === ""
                ).length > 0 && (
                  <div className="mt-3">
                    <span className="text-blue-700 text-sm">未匹配的SKU:</span>
                    <div className="mt-1 text-xs text-blue-600 bg-blue-100 p-2 rounded max-h-20 overflow-y-auto">
                      {skuProcessedData
                        .filter(
                          (item) =>
                            !item["税率"] ||
                            item["税率"].toString().trim() === ""
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
                {isSkuProcessing ? "处理中..." : "处理"}
              </Button>

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
