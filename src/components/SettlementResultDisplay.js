"use client";

import React from "react";
import { useSettlement } from "@/context/SettlementContext";
import { downloadExcel } from "@/lib/excelHandler";
import DataDisplay from "./DataDisplay";

/**
 * 清理字符串中的Tab和换行字符
 */
function cleanString(value) {
  if (typeof value === "string") {
    return value.replace(/[\t\n\r]/g, "").trim();
  }
  return value;
}

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

  // 检查处理后的数据是否包含数量字段
  const hasQuantity = processedData && processedData.length > 0 && "数量" in processedData[0];
  
  // 计算数量合计
  const totalQuantity = processedData?.reduce((sum, item) => sum + (parseFloat(item.数量) || 0), 0) || 0;

  // 计算直营服务费金额（从原始数据中筛选费用名称或费用项为"直营服务费"的记录）
  const selfOperationData = originalData?.filter(item => {
    const feeName = cleanString(item["费用名称"] || item["费用项"] || "");
    return feeName === "直营服务费";
  }) || [];
  
  // 调试日志
  console.log("SettlementResultDisplay - originalData.length:", originalData?.length);
  console.log("SettlementResultDisplay - selfOperationData.length:", selfOperationData.length);
  if (originalData?.length > 0) {
    console.log("SettlementResultDisplay - 第一个费用名称:", cleanString(originalData[0]["费用名称"]));
    console.log("SettlementResultDisplay - 第一个费用项:", cleanString(originalData[0]["费用项"]));
  }
  
  const selfOperationAmount = selfOperationData.reduce((sum, item) => {
    const amount = parseFloat(item["应结金额"] || item["金额"] || item["合计金额"] || item["总金额"] || 0);
    return sum + amount;
  }, 0);

  // 计算应结金额合计减去直营服务费金额（直营服务费是负数，所以用加法）
  const totalAmount = processedData?.reduce((sum, item) => sum + (parseFloat(item.应结金额) || 0), 0) || 0;
  const finalAmount = totalAmount + selfOperationAmount;

  return (
    <DataDisplay
      title="结算单处理结果"
      originalData={originalData}
      processedData={processedData}
      onReset={handleReset}
      onDownload={handleDownloadExcel}
      showCopyColumn={true}
      downloadButtonText="下载Excel结果"
      resetButtonText="重新上传"
      showTotalAmount={true}
      amountField="应结金额"
      customStats={
        <div className="space-y-4">
          {/* 货款合并统计 */}
          <div className="grid grid-cols-4 gap-4">
            <div className="flex flex-col p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <span className="text-xs text-muted-foreground">应结金额合计</span>
              <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                ¥{totalAmount.toFixed(2)}
              </span>
            </div>
            <div className="flex flex-col p-3 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <span className="text-xs text-muted-foreground">直营服务费金额</span>
              <span className="text-xl font-bold text-orange-600 dark:text-orange-400">
                ¥{selfOperationAmount.toFixed(2)}
              </span>
            </div>
            <div className="flex flex-col p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <span className="text-xs text-muted-foreground">应结-服务费</span>
              <span className="text-xl font-bold text-purple-600 dark:text-purple-400">
                ¥{finalAmount.toFixed(2)}
              </span>
            </div>
            <div className="flex flex-col p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
              <span className="text-xs text-muted-foreground">商品数量合计</span>
              <span className="text-xl font-bold text-green-600 dark:text-green-400">
                {totalQuantity.toFixed(0)}
              </span>
            </div>
          </div>
        </div>
      }
    />
  );
}