"use client";

import React, { useState } from "react";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";

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
  showRowNumber = false,
  amountFields = null,
}) {
  const { toast } = useToast();
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  // 计算总价
  const calculateTotalAmount = (data) => {
    if (!data || data.length === 0) return 0;
    return data.reduce((total, row) => {
      const amount = parseFloat(row[amountField] || row["总价"] || 0);
      return total + amount;
    }, 0);
  };

  const totalAmount = calculateTotalAmount(processedData);

  // 排序处理
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sortedData = React.useMemo(() => {
    if (!sortConfig.key || !processedData) return processedData;
    return [...processedData].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal === bVal) return 0;
      const aNum = parseFloat(aVal);
      const bNum = parseFloat(bVal);
      const isNumeric = !isNaN(aNum) && !isNaN(bNum);
      if (isNumeric) {
        return sortConfig.direction === "asc" ? aNum - bNum : bNum - aNum;
      }
      return sortConfig.direction === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [processedData, sortConfig]);

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

  // 格式化金额显示
  const formatAmount = (value) => {
    const num = parseFloat(value || 0);
    const formatted = Math.abs(num).toFixed(2);
    if (num < 0) {
      return <span className="text-destructive font-medium">-¥{formatted}</span>;
    }
    return <span className="text-green-600 font-medium">¥{formatted}</span>;
  };

  // 自定义统计信息或默认统计
  const statsContent = customStats || (
    <div className="grid grid-cols-3 gap-4">
      <div className="flex flex-col p-3 rounded-lg bg-muted/50">
        <span className="text-xs text-muted-foreground">原始记录数</span>
        <span className="text-xl font-bold text-foreground">
          {originalData?.length || 0}
        </span>
      </div>
      <div className="flex flex-col p-3 rounded-lg bg-muted/50">
        <span className="text-xs text-muted-foreground">处理后记录数</span>
        <span className="text-xl font-bold text-foreground">
          {processedData?.length || 0}
        </span>
      </div>
      {showTotalAmount && (
        <div className="flex flex-col p-3 rounded-lg bg-primary/10">
          <span className="text-xs text-muted-foreground">总价</span>
          <span className="text-xl font-bold text-primary">
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
    <div className="space-y-6">
      {/* 返回按钮和标题 */}
      <div className="flex justify-between items-center">
        <Button onClick={handleReset} variant="outline">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          返回
        </Button>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <div></div>
      </div>

      {/* 处理后数据展示 */}
      <section className="bg-card rounded-lg border border-border p-6">
        {/* 统计信息 */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-foreground mb-3">
            处理统计
          </h3>
          {statsContent}
        </div>

        {/* 操作按钮 */}
        <div className="mb-6 flex gap-3 flex-wrap">
          <Button variant="outline" onClick={handleDownloadExcel}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {downloadButtonText}
          </Button>
          <Button variant="outline" onClick={handleReset}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {resetButtonText}
          </Button>
        </div>

        {/* 表格操作提示 */}
        {showCopyColumn && (
          <div className="mb-4 p-3 bg-muted/50 rounded-lg flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>点击 <span className="font-medium">复制图标</span> 复制列数据</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
              <span>点击 <span className="font-medium">排序图标</span> 排序</span>
            </div>
          </div>
        )}

        {/* 处理后数据表格 */}
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full border-collapse text-sm">
            {/* 表头 - sticky定位 */}
            <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/60 border-b border-border">
              <tr>
                {/* 序号列 */}
                {showRowNumber && (
                  <th className="px-4 py-3 text-left font-semibold text-foreground w-14">
                    序号
                  </th>
                )}
                {processedData.length > 0 &&
                  Object.keys(processedData[0]).map((header) => (
                    <th
                      key={header}
                      className="px-4 py-3 text-left font-semibold text-foreground whitespace-nowrap"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span>{header}</span>
                        <div className="flex items-center gap-1">
                          {/* 排序按钮 */}
                          <button
                            onClick={() => handleSort(header)}
                            className="p-1 rounded hover:bg-muted/50 transition-colors"
                            title={`点击排序 "${header}"`}
                          >
                            {sortConfig.key === header ? (
                              sortConfig.direction === "asc" ? (
                                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              )
                            ) : (
                              <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                              </svg>
                            )}
                          </button>
                          {/* 复制按钮 */}
                          {showCopyColumn && (
                            <button
                              onClick={() => handleCopyColumn(header)}
                              className="p-1 rounded hover:bg-muted/50 transition-colors"
                              title={`点击复制 "${header}" 列数据`}
                            >
                              <svg className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </th>
                  ))}
              </tr>
            </thead>

            {/* 表格内容 */}
            <tbody>
              {sortedData.map((row, rowIndex) => (
                <TableRow
                  key={row["商品编号"] || rowIndex}
                  row={row}
                  rowIndex={rowIndex}
                  amountField={amountField}
                  amountFields={amountFields}
                  showRowNumber={showRowNumber}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/**
 * 表格行组件
 * 用于虚拟滚动中渲染每一行数据
 */
function TableRow({ row, rowIndex, amountField, amountFields, showRowNumber }) {
  // 格式化金额显示
  const formatAmount = (value) => {
    const num = parseFloat(value || 0);
    const formatted = Math.abs(num).toFixed(2);
    if (num < 0) {
      return <span className="text-destructive font-medium">-¥{formatted}</span>;
    }
    return <span className="text-green-600 font-medium">¥{formatted}</span>;
  };

  // 检查字段是否为金额字段
  const isAmountField = (key) => {
    if (amountFields && Array.isArray(amountFields)) {
      return amountFields.includes(key);
    }
    return key === "单价" || key === "总价" || key === amountField;
  };

  return (
    <tr
      className={`
        transition-colors duration-150
        ${rowIndex % 2 === 0 ? "bg-background" : "bg-muted/30"}
        hover:bg-primary/5
      `}
    >
      {/* 序号列 */}
      {showRowNumber && (
        <td className="px-4 py-2.5 text-left border-b border-border/50 text-muted-foreground">
          {rowIndex + 1}
        </td>
      )}
      {Object.entries(row).map(([key]) => (
        <td key={key} className="px-4 py-2.5 text-left border-b border-border/50 whitespace-nowrap">
          {isAmountField(key)
            ? formatAmount(row[key])
            : row[key]}
        </td>
      ))}
    </tr>
  );
}
