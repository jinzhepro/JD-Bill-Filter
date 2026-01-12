"use client";

import React from "react";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";

/**
 * 通用数据展示组件
 * 支持显示统计数据、表格、下载Excel等功能
 */
export default function DataDisplay({
  title = "处理结果",
  originalData,
  processedData,
  onReset,
  onDownload,
  showCopyColumn = false,
  onCopyColumn,
  downloadButtonText = "下载Excel结果 📊",
  resetButtonText = "重新上传",
  showTotalAmount = true,
  amountField = "金额",
  customStats = null,
}) {
  const { toast } = useToast();

  // 计算总价
  const calculateTotalAmount = (data) => {
    if (!data || data.length === 0) return 0;
    return data.reduce((total, row) => {
      const amount = parseFloat(row[amountField] || row["总价"] || 0);
      return total + amount;
    }, 0);
  };

  const totalAmount = calculateTotalAmount(processedData);

  // 复制列数据功能
  const handleCopyColumn = async (columnName) => {
    if (!onCopyColumn) return;

    try {
      const dataToCopy = processedData
        .map((row) => row[columnName])
        .filter((value) => value !== null && value !== undefined);
      const textToCopy = dataToCopy.join("\n");

      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
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

      toast({
        title: `已复制列 "${columnName}" 的 ${dataToCopy.length} 条数据到剪贴板`,
      });

      if (onCopyColumn) {
        onCopyColumn(columnName, dataToCopy.length);
      }
    } catch (err) {
      console.error("复制失败:", err);
      toast({
        variant: "destructive",
        title: `复制列 "${columnName}" 失败`,
      });
    }
  };

  // 下载Excel文件
  const handleDownloadExcel = () => {
    if (!onDownload) return;
    onDownload();
  };

  const handleReset = () => {
    if (onReset) onReset();
  };

  // 自定义统计信息或默认统计
  const statsContent = customStats || (
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
          {processedData?.length || 0}
        </span>
      </div>
      {showTotalAmount && (
        <div>
          <span className="text-muted-foreground">总价：</span>
          <span className="font-semibold text-foreground ml-2">
            ¥{totalAmount.toFixed(2)}
          </span>
        </div>
      )}
    </div>
  );

  if (!processedData || processedData.length === 0) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* 返回按钮和标题 */}
      <div className="flex justify-between items-center">
        <Button onClick={handleReset} variant="outline">
          ← 返回
        </Button>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <div></div>
      </div>

      {/* 处理后数据展示 */}
      <section className="bg-card rounded-lg shadow p-8">
        {/* 统计信息 */}
        <div className="mb-6 p-4 bg-primary/10 rounded-lg">
          <h3 className="text-sm font-medium text-foreground mb-2">
            处理统计
          </h3>
          {statsContent}
        </div>

        {/* 操作按钮 */}
        <div className="mb-6 flex gap-3 flex-wrap">
          <Button
            onClick={handleDownloadExcel}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {downloadButtonText}
          </Button>
          <Button variant="destructive" onClick={handleReset}>
            {resetButtonText}
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
                      onClick={
                        showCopyColumn ? () => handleCopyColumn(header) : undefined
                      }
                      title={
                        showCopyColumn
                          ? `点击复制 "${header}" 列数据`
                          : undefined
                      }
                      className={`px-3 py-3 text-left border-b border-border bg-muted font-semibold text-foreground sticky top-0 ${
                        showCopyColumn
                          ? "cursor-pointer hover:bg-muted/80 transition-colors"
                          : ""
                      }`}
                    >
                      {header} {showCopyColumn && "📋"}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {processedData.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-muted/50">
                  {Object.entries(row).map(([key, value]) => (
                    <td key={key} className="px-3 py-3 text-left border-b border-border">
                      {key === "单价" || key === "总价" || key === amountField
                        ? `¥${parseFloat(value || 0).toFixed(2)}`
                        : value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {showCopyColumn && (
            <div className="mt-2 text-sm text-muted-foreground text-center">
              💡 提示：点击表头可复制该列的所有数据
            </div>
          )}
        </div>
      </section>
    </div>
  );
}