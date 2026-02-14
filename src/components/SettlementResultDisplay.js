"use client";

import React, { useState, useMemo } from "react";
import { useSettlement } from "@/context/SettlementContext";
import { downloadExcel } from "@/lib/excelHandler";
import DataDisplay from "./DataDisplay";
import SettlementProcessModal from "./SettlementProcessModal";
import { Button } from "./ui/button";
import { Clipboard } from "lucide-react";

/**
 * 计算列总和的辅助函数
 * @param {Array} processedData - 处理后的数据
 * @returns {Object} 各列的总和
 */
function calculateColumnTotals(processedData) {
  const columns = ["应结金额", "直营服务费", "数量", "净结金额"];
  const totals = {};

  columns.forEach((column) => {
    const total = processedData?.reduce((sum, row) => {
      const value = parseFloat(row[column] || 0);
      return sum + (isNaN(value) ? 0 : value);
    }, 0) || 0;
    totals[column] = total;
  });

  return totals;
}

/**
 * 结算单结果显示组件
 * 显示处理后的结算单数据，并包含处理表单用于调整SKU数量
 */
export default function SettlementResultDisplay() {
  const { originalData, processedData, resetSettlement, processingHistory, dataChanges } = useSettlement();
  const [showDataChanges, setShowDataChanges] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleReset = () => {
    resetSettlement();
  };

  const handleDownloadExcel = () => {
    if (!processedData || processedData.length === 0) return;

    try {
      const fileName = `结算单合并结果_${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;
      downloadExcel(processedData, fileName, calculatedTotals, dataChanges);
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

  // 计算各列总和
  const calculatedTotals = calculateColumnTotals(processedData);

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
        <div className="space-y-5">
          <div className="grid grid-cols-4 gap-4">
            <div className="relative overflow-hidden flex flex-col p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
              <span className="text-xs font-medium text-muted-foreground mb-1">货款合计</span>
              <span className="text-2xl font-bold text-primary tracking-tight">
                ¥{totalAmount.toFixed(2)}
              </span>
            </div>
            <div className="relative overflow-hidden flex flex-col p-4 rounded-xl bg-gradient-to-br from-rose-500/10 to-rose-500/5 border border-rose-500/20 shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
              <span className="text-xs font-medium text-muted-foreground mb-1">直营服务费</span>
              <span className="text-2xl font-bold text-rose-600 dark:text-rose-400 tracking-tight">
                ¥{selfOperationAmount.toFixed(2)}
              </span>
            </div>
            <div className="relative overflow-hidden flex flex-col p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
              <span className="text-xs font-medium text-muted-foreground mb-1">收入</span>
              <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
                ¥{finalAmount.toFixed(2)}
              </span>
            </div>
            <div className="relative overflow-hidden flex flex-col p-4 rounded-xl bg-gradient-to-br from-sky-500/10 to-sky-500/5 border border-sky-500/20 shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="absolute top-0 right-0 w-16 h-16 bg-sky-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
              <span className="text-xs font-medium text-muted-foreground mb-1">数量合计</span>
              <span className="text-2xl font-bold text-sky-600 dark:text-sky-400 tracking-tight">
                {totalQuantity.toFixed(0)}
              </span>
            </div>
          </div>
          {dataChangesCount > 0 && (
            <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-foreground">
                  已处理 <span className="text-amber-600 dark:text-amber-400 font-bold">{dataChangesCount}</span> 个SKU
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDataChanges(!showDataChanges)}
                className="hover:bg-amber-500/10"
              >
                {showDataChanges ? "隐藏" : "显示"}数据变化
              </Button>
            </div>
          )}
        </div>
      }
    >
      {/* 标题下方的结算单处理按钮 */}
      <div className="flex justify-end mb-4">
        <Button 
          onClick={() => setIsModalOpen(true)}
          className="shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-200"
        >
          <Clipboard className="w-4 h-4 mr-2" />
          开票处理
        </Button>
      </div>
      <SettlementProcessModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </DataDisplay>
  );
}