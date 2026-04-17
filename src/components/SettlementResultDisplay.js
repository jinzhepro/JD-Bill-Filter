"use client";

import React, { useState } from "react";
import { useSettlement } from "@/context/SettlementContext";
import { downloadExcel } from "@/lib/excelHandler";
import { calculateColumnTotals } from "@/lib/utils";
import DataDisplay from "./DataDisplay";
import SettlementProcessModal from "./SettlementProcessModal";
import { Button } from "./ui/button";
import { Clipboard, Undo2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * 结算单结果显示组件
 * 显示处理后的结算单数据，并包含处理表单用于调整 SKU 数量
 */
export default function SettlementResultDisplay() {
  const { originalData, processedData, resetSettlement, processingHistory, dataChanges, previousProcessedData, undoProcessing } = useSettlement();
  const [showDataChanges, setShowDataChanges] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  const handleReset = () => {
    resetSettlement();
  };

  const handleDownloadExcel = () => {
    if (!processedData || processedData.length === 0) return;

    try {
      const fileName = `结算单合并结果_${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;
      const totals = calculateColumnTotals(processedData);
      downloadExcel(processedData, fileName, totals, dataChanges);
    } catch (error) {
      toast({
        title: "下载失败",
        description: error instanceof Error ? error.message : "文件下载时发生错误",
        variant: "destructive",
      });
    }
  };

  const handleUndo = () => {
    undoProcessing();
    toast({
      title: "撤回成功",
      description: "已恢复到上次处理前的数据状态",
    });
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
      showRowNumber={true}
      calculatedTotals={calculatedTotals}
      showStats={false}
      showDataChanges={showDataChanges}
      amountFields={["应结金额", "直营服务费"]}
      columnMapping={{
        "应结金额": "货款",
      }}
    >
      {/* 标题下方的结算单处理按钮 */}
      <div className="flex justify-end gap-3 mb-4">
        {previousProcessedData && (
          <Button 
            onClick={handleUndo}
            variant="outline"
            className="hover:bg-primary/5 transition-colors"
          >
            <Undo2 className="w-4 h-4 mr-2" />
            撤回
          </Button>
        )}
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