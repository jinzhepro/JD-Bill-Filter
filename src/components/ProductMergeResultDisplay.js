"use client";

import React from "react";
import { useApp } from "@/context/AppContext";
import DataDisplay from "./DataDisplay";
import { Button } from "./ui/button";
import { Download, RotateCcw } from "lucide-react";
import * as XLSX from "exceljs";

export default function ProductMergeResultDisplay() {
  const { processedData, originalData, resetOrder, addLog, setProcessing } = useApp();

  const handleExport = async () => {
    if (!processedData || processedData.length === 0) {
      addLog("没有数据可导出", "warning");
      return;
    }

    try {
      setProcessing(true);
      addLog("正在导出数据...", "info");

      const workbook = new XLSX.Workbook();
      const worksheet = workbook.addWorksheet("商品合并结果");

      // 设置表头
      worksheet.columns = [
        { header: "商品名称", key: "商品名称", width: 30 },
        { header: "商品编号", key: "商品编号", width: 20 },
        { header: "单价", key: "单价", width: 15 },
        { header: "商品数量", key: "商品数量", width: 15 },
        { header: "总价", key: "总价", width: 15 },
      ];

      // 添加数据行
      processedData.forEach((row) => {
        worksheet.addRow(row);
      });

      // 设置表头样式
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };

      // 生成文件名
      const timestamp = new Date().toISOString().slice(0, 10);
      const fileName = `商品合并结果_${timestamp}.xlsx`;

      // 导出文件
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();
      window.URL.revokeObjectURL(url);

      addLog(`导出成功: ${fileName}`, "success");
    } catch (error) {
      addLog(`导出失败: ${error.message}`, "error");
      console.error("导出失败:", error);
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    resetOrder();
    addLog("已重置数据", "info");
  };

  return (
    <div className="space-y-4">
      <DataDisplay
        title="商品合并结果"
        originalData={originalData}
        processedData={processedData}
        onReset={handleReset}
        onDownload={handleExport}
        downloadButtonText="导出结果 📊"
        resetButtonText="重新上传"
        showTotalAmount={true}
        amountField="总价"
        showCopyColumn={true}
      />
    </div>
  );
}