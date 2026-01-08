"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { downloadExcel } from "@/lib/excelHandler";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";

export default function SettlementResultDisplay() {
  const { originalData, processedData, resetOrder } = useApp();
  const { toast } = useToast();

  if (!originalData || originalData.length === 0) {
    return null;
  }

  const handleReset = () => {
    resetOrder();
  };

  const handleDownloadExcel = () => {
    if (!processedData || processedData.length === 0) return;

    try {
      const fileName = `结算单合并结果_${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;
      downloadExcel(processedData, fileName);
      toast({
        title: `Excel文件已保存: ${fileName}`,
      });
    } catch (error) {
      console.error("Excel下载失败:", error);
      toast({
        variant: "destructive",
        title: "Excel下载失败",
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* 返回按钮和标题 */}
      <div className="flex justify-between items-center">
        <Button
          onClick={handleReset}
          className="bg-gray-200 text-gray-700 hover:bg-gray-300"
        >
          ← 返回
        </Button>
        <h1 className="text-2xl font-bold text-white">结算单处理结果</h1>
        <div></div>
      </div>

      {/* 处理后数据展示 */}
      {processedData && processedData.length > 0 && (
        <section className="bg-white rounded-xl shadow-lg p-8 animate-fade-in">
          {/* 统计信息 */}
          <div className="mb-6 p-4 bg-green-50 rounded-lg">
            <h3 className="text-sm font-medium text-green-900 mb-2">
              处理统计
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-green-700">原始记录数:</span>
                <span className="ml-2 font-medium text-green-900">
                  {originalData.length}
                </span>
              </div>
              <div>
                <span className="text-green-700">合并后记录数:</span>
                <span className="ml-2 font-medium text-green-900">
                  {processedData.length}
                </span>
              </div>
              <div>
                <span className="text-green-700">总金额:</span>
                <span className="ml-2 font-medium text-green-900">
                  ¥
                  {processedData
                    .reduce((sum, item) => sum + parseFloat(item.金额 || 0), 0)
                    .toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                结算单处理结果
              </h2>
              <p className="text-gray-600">
                已合并 {processedData.length} 条记录
              </p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <Button
                variant="success"
                onClick={handleDownloadExcel}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                下载Excel结果
              </Button>
              <Button variant="destructive" onClick={handleReset}>
                重新上传
              </Button>
            </div>
          </div>

          {/* 数据表格 */}
          <div className="table-container custom-scrollbar">
            <table className="preview-table">
              <thead>
                <tr>
                  {processedData.length > 0 &&
                    Object.keys(processedData[0]).map((header, index) => (
                      <th key={index}>{header}</th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {processedData.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {Object.entries(row).map(([key, value]) => (
                      <td key={key}>
                        {key === "金额"
                          ? `¥${parseFloat(value || 0).toFixed(2)}`
                          : value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
