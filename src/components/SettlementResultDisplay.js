"use client";

import React from "react";
import { useSettlement } from "@/context/SettlementContext";
import { downloadExcel } from "@/lib/excelHandler";
import DataDisplay from "./DataDisplay";
import SettlementProcessForm from "./SettlementProcessForm";

/**
 * 结算单结果显示组件
 * 显示处理后的结算单数据，并包含处理表单用于调整SKU数量
 */
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

  // 计算货款合计
  const totalAmount = processedData?.reduce((sum, item) => sum + (parseFloat(item.应结金额) || 0), 0) || 0;

  // 计算直营服务费合计（从processedData中直接获取，因为已经按SKU分配）
  const selfOperationAmount = processedData?.reduce((sum, item) => sum + (parseFloat(item.直营服务费) || 0), 0) || 0;

  // 计算实际应结金额（货款合计 + 直营服务费，直营服务费是负数）
  const finalAmount = totalAmount + selfOperationAmount;

  // 计算需要显示总和的列
  const columns = ["应结金额", "直营服务费", "数量", "净结金额"];
  const totals = {};
  columns.forEach((column) => {
    const total = processedData?.reduce((sum, row) => {
      const value = parseFloat(row[column] || 0);
      return sum + (isNaN(value) ? 0 : value);
    }, 0) || 0;
    totals[column] = total;
  });

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
      amountFields={["单价", "总价", "应结金额", "直营服务费", "净结金额"]}
      showRowNumber={true}
      columnTotals={["应结金额", "直营服务费", "数量", "净结金额"]}
      showStats={false}
      customStats={
        <div className="space-y-4">
          {/* 货款合并统计 */}
          <div className="grid grid-cols-4 gap-4">
            <div className="flex flex-col p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <span className="text-xs text-muted-foreground">货款合计</span>
              <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                ¥{totalAmount.toFixed(2)}
              </span>
            </div>
            <div className="flex flex-col p-3 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <span className="text-xs text-muted-foreground">直营服务费</span>
              <span className="text-xl font-bold text-orange-600 dark:text-orange-400">
                ¥{selfOperationAmount.toFixed(2)}
              </span>
            </div>
            <div className="flex flex-col p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <span className="text-xs text-muted-foreground">实际应结</span>
              <span className="text-xl font-bold text-purple-600 dark:text-purple-400">
                ¥{finalAmount.toFixed(2)}
              </span>
            </div>
            <div className="flex flex-col p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
              <span className="text-xs text-muted-foreground">数量合计</span>
              <span className="text-xl font-bold text-green-600 dark:text-green-400">
                {totalQuantity.toFixed(0)}
              </span>
            </div>
          </div>
        </div>
      }
    >
      {/* 标题下方的结算单处理表单 */}
      <SettlementProcessForm />
    </DataDisplay>
  );
}