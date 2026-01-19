"use client";

import React from "react";
import { useSettlement } from "@/context/SettlementContext";
import { downloadExcel } from "@/lib/excelHandler";
import DataDisplay from "./DataDisplay";

export default function SettlementResultDisplay() {
  const { originalData, processedData, resetSettlement } = useSettlement();

  const handleReset = () => {
    resetSettlement();
  };

  const handleDownloadExcel = () => {
    if (!processedData || processedData.length === 0) return;

    try {
      const fileName = `结算单合并结果_${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;
      downloadExcel(processedData, fileName);
    } catch (error) {
      console.error("Excel下载失败:", error);
    }
  };

  return (
    <DataDisplay
      title="结算单处理结果"
      originalData={originalData}
      processedData={processedData}
      onReset={handleReset}
      onDownload={handleDownloadExcel}
      showCopyColumn={false}
      downloadButtonText="下载Excel结果"
      resetButtonText="重新上传"
      showTotalAmount={true}
      amountField="金额"
    />
  );
}