"use client";

import React, { useState, useMemo } from "react";
import { useSettlement } from "@/context/SettlementContext";
import { downloadExcel } from "@/lib/excelHandler";
import DataDisplay from "./DataDisplay";
import SettlementProcessForm from "./SettlementProcessForm";
import { Button } from "./ui/button";

/**
 * 结算单结果显示组件
 * 显示处理后的结算单数据，并包含处理表单用于调整SKU数量
 */
export default function SettlementResultDisplay() {
  const { originalData, processedData, resetSettlement, processingHistory, dataChanges } = useSettlement();
  const [showDataChanges, setShowDataChanges] = useState(true);

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

  // 使用 useMemo 优化派生计算，避免不必要的重复计算
  const hasQuantity = useMemo(() =>
    processedData && processedData.length > 0 && "数量" in processedData[0],
    [processedData]
  );

  const totalQuantity = useMemo(() =>
    processedData?.reduce((sum, item) => sum + (parseFloat(item.数量) || 0), 0) || 0,
    [processedData]
  );

  const totalAmount = useMemo(() =>
    processedData?.reduce((sum, item) => sum + (parseFloat(item.应结金额) || 0), 0) || 0,
    [processedData]
  );

  const selfOperationAmount = useMemo(() =>
    processedData?.reduce((sum, item) => sum + (parseFloat(item.直营服务费) || 0), 0) || 0,
    [processedData]
  );

  const finalAmount = useMemo(() =>
    totalAmount + selfOperationAmount,
    [totalAmount, selfOperationAmount]
  );

  // 使用 calculatedTotals 传递预计算的总和对象
  const calculatedTotals = useMemo(() => {
    const totals = {};
    ["应结金额", "直营服务费", "数量", "净结金额"].forEach((column) => {
      const total = processedData?.reduce((sum, row) => {
        const value = parseFloat(row[column] || 0);
        return sum + (isNaN(value) ? 0 : value);
      }, 0) || 0;
      totals[column] = total;
    });
    return totals;
  }, [processedData]);

  const dataChangesCount = useMemo(() =>
    Object.keys(dataChanges).length,
    [dataChanges]
  );

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
      calculatedTotals={calculatedTotals}
      showStats={false}
      showDataChanges={showDataChanges}
      columnMapping={{
        "应结金额": "货款",
        "净结金额": "收入",
      }}
      customStats={
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="flex flex-col p-3 rounded-lg bg-primary/10 border border-primary/20">
              <span className="text-xs text-muted-foreground">货款合计</span>
              <span className="text-xl font-bold text-primary">
                ¥{totalAmount.toFixed(2)}
              </span>
            </div>
            <div className="flex flex-col p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <span className="text-xs text-muted-foreground">直营服务费</span>
              <span className="text-xl font-bold text-destructive">
                ¥{selfOperationAmount.toFixed(2)}
              </span>
            </div>
            <div className="flex flex-col p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <span className="text-xs text-muted-foreground">收入</span>
              <span className="text-xl font-bold text-purple-500 dark:text-purple-400">
                ¥{finalAmount.toFixed(2)}
              </span>
            </div>
            <div className="flex flex-col p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <span className="text-xs text-muted-foreground">数量合计</span>
              <span className="text-xl font-bold text-blue-500 dark:text-blue-400">
                {totalQuantity.toFixed(0)}
              </span>
            </div>
          </div>
          {dataChangesCount > 0 && (
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
              <span className="text-sm font-medium text-foreground">
                已处理: {dataChangesCount} 个SKU
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDataChanges(!showDataChanges)}
              >
                {showDataChanges ? "隐藏" : "显示"}数据变化
              </Button>
            </div>
          )}
        </div>
      }
    >
      {/* 标题下方的结算单处理表单 */}
      <SettlementProcessForm />
    </DataDisplay>
  );
}