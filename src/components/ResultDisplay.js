"use client";

import React from "react";
import { useApp } from "@/context/AppContext";
import DataDisplay from "./DataDisplay";

export default function ResultDisplay() {
  const {
    originalData,
    processedData,
    resetOrder,
    addLog,
  } = useApp();

  const handleReset = () => {
    resetOrder();
    addLog("已返回主界面", "info");
  };

  // 下载Excel文件
  const handleDownloadExcel = () => {
    if (!processedData || processedData.length === 0) return;

    try {
      const { downloadExcel } = require("@/lib/excelHandler");
      const dateStr = new Date().toISOString().split('T')[0];
      const fileName = `订单处理结果_${dateStr}.xlsx`;
      downloadExcel(processedData, fileName);
      addLog(`已导出 ${processedData.length} 条订单数据到Excel`, "success");
    } catch (error) {
      console.error("Excel下载失败:", error);
      addLog("Excel下载失败", "error");
    }
  };

  const handleCopyColumn = (columnName, count) => {
    addLog(
      `已复制列 "${columnName}" 的 ${count} 条数据到剪贴板`,
      "success"
    );
  };

  return (
    <DataDisplay
      title="订单处理结果"
      originalData={originalData}
      processedData={processedData}
      onReset={handleReset}
      onDownload={handleDownloadExcel}
      showCopyColumn={true}
      onCopyColumn={handleCopyColumn}
      downloadButtonText="下载Excel结果 📊"
      resetButtonText="重新上传"
      showTotalAmount={true}
      amountField="金额"
    />
  );
}