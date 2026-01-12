"use client";

import React from "react";
import { useApp } from "@/context/AppContext";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";

export default function ResultDisplay() {
  const {
    originalData,
    processedData,
    resetOrder,
    addLog,
  } = useApp();

  const { toast } = useToast();

  // 计算总价
  const calculateTotalAmount = (data) => {
    if (!data || data.length === 0) return 0;
    return data.reduce((total, row) => {
      const amount = parseFloat(row["金额"] || row["总价"] || 0);
      return total + amount;
    }, 0);
  };

  const totalAmount = calculateTotalAmount(processedData);

  // 复制列数据功能
  const handleCopyColumn = async (columnName) => {
    try {
      const dataToCopy = processedData
        .map((row) => row[columnName])
        .filter((value) => value !== null && value !== undefined);
      const textToCopy = dataToCopy.join("\n");

      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        // 降级方案：使用 textarea
        const textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }

      addLog(
        `已复制列 "${columnName}" 的 ${dataToCopy.length} 条数据到剪贴板`,
        "success"
      );
      toast({
        title: `已复制列 "${columnName}" 的 ${dataToCopy.length} 条数据到剪贴板`,
      });
    } catch (err) {
      console.error("复制失败:", err);
      addLog(`复制列 "${columnName}" 失败`, "error");
      toast({
        variant: "destructive",
        title: `复制列 "${columnName}" 失败`,
      });
    }
  };

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
      toast({
        title: `Excel文件已保存: ${fileName}`,
      });
      addLog(`已导出 ${processedData.length} 条订单数据到Excel`, "success");
    } catch (error) {
      console.error("Excel下载失败:", error);
      addLog("Excel下载失败", "error");
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
          variant="outline"
        >
          ← 返回主界面
        </Button>
        <h1 className="text-2xl font-bold text-foreground">订单处理结果</h1>
        <div></div>
      </div>

      {/* 处理后数据展示 */}
      {processedData && processedData.length > 0 && (
        <section className="bg-card rounded-lg shadow p-8">
          {/* 统计信息 */}
          <div className="mb-6 p-4 bg-primary/10 rounded-lg">
            <h3 className="text-sm font-medium text-foreground mb-2">
              处理统计
            </h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">原始记录数：</span>
                <span className="font-semibold text-foreground ml-2">
                  {originalData?.length || 0}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">处理后记录数：</span>
                <span className="font-semibold text-foreground ml-2">
                  {processedData.length}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">总价：</span>
                <span className="font-semibold text-foreground ml-2">
                  ¥{totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="mb-6 flex gap-3 flex-wrap">
            <Button
              onClick={handleDownloadExcel}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              下载Excel结果 📊
            </Button>
            <Button variant="destructive" onClick={handleReset}>
              重新上传
            </Button>
          </div>

          {/* 处理后数据表格 */}
          <div className="max-h-96 overflow-auto border border-border rounded-lg">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  {processedData.length > 0 &&
                    Object.keys(processedData[0]).map((header, index) => (
                      <th
                        key={index}
                        onClick={() => handleCopyColumn(header)}
                        title={`点击复制 "${header}" 列数据`}
                        className="px-3 py-3 text-left border-b border-border bg-muted font-semibold text-foreground sticky top-0 cursor-pointer hover:bg-muted/80 transition-colors"
                      >
                        {header} 📋
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {processedData.map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-muted/50">
                    {Object.entries(row).map(([key, value]) => (
                      <td key={key} className="px-3 py-3 text-left border-b border-border">
                        {key === "单价" || key === "总价"
                          ? `¥${parseFloat(value).toFixed(2)}`
                          : value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-2 text-sm text-muted-foreground text-center">
              💡 提示：点击表头可复制该列的所有数据
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
