"use client";

import React, { useState } from "react";
import { useSettlement } from "@/context/SettlementContext";
import { downloadExcel } from "@/lib/excelHandler";
import { calculateColumnTotals } from "@/lib/utils";
import DataDisplay from "./DataDisplay";
import SettlementProcessModal from "./SettlementProcessModal";
import { Button } from "./ui/button";
import { Clipboard } from "lucide-react";

/**
 * 结算单结果显示组件
 * 显示处理后的结算单数据，并包含处理表单用于调整 SKU 数量
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
      downloadExcel(processedData, fileName, null, dataChanges);
    } catch (error) {
      console.error("Excel 下载失败:", error);
    }
  };

  const calculatedTotals = calculateColumnTotals(processedData);

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