"use client";

import React from "react";
import { useOrder } from "@/context/OrderContext";
import DataDisplay from "./DataDisplay";

export default function ResultDisplay() {
  const {
    originalData,
    processedData,
    resetOrder,
    addLog,
  } = useOrder();

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

  // 计算数量合计
  const totalQuantity = processedData?.reduce((sum, item) => sum + (parseFloat(item.商品数量) || 0), 0) || 0;

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
      amountField="总价"
      customStats={
        <div className="grid grid-cols-4 gap-4">
          <div className="flex flex-col p-3 rounded-lg bg-muted/50">
            <span className="text-xs text-muted-foreground">原始记录数</span>
            <span className="text-xl font-bold text-foreground">
              {originalData?.length || 0}
            </span>
          </div>
          <div className="flex flex-col p-3 rounded-lg bg-muted/50">
            <span className="text-xs text-muted-foreground">处理后记录数</span>
            <span className="text-xl font-bold text-foreground">
              {processedData?.length || 0}
            </span>
          </div>
          <div className="flex flex-col p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
            <span className="text-xs text-muted-foreground">数量合计</span>
            <span className="text-xl font-bold text-green-600 dark:text-green-400">
              {totalQuantity.toFixed(0)}
            </span>
          </div>
          <div className="flex flex-col p-3 rounded-lg bg-primary/10">
            <span className="text-xs text-muted-foreground">总价</span>
            <span className="text-xl font-bold text-primary">
              ¥{processedData?.reduce((sum, item) => sum + (parseFloat(item.总价) || 0), 0).toFixed(2) || "0.00"}
            </span>
          </div>
        </div>
      }
    />
  );
}