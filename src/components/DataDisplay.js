"use client";

import React, { useState } from "react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useSettlement } from "@/context/SettlementContext";
import { 
  ArrowLeft, 
  Download, 
  RefreshCcw, 
  Copy, 
  ArrowUp, 
  ArrowDown, 
  ChevronsUpDown 
} from "lucide-react";

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
  columnTotals = null,
  calculatedTotals = null,
  showStats = true,
  children = null,
  showDataChanges = true,
  columnMapping = null,
}) {
  const { toast } = useToast();
  const { dataChanges, processingHistory } = useSettlement();
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [showModal, setShowModal] = useState(false);
  const [modalSku, setModalSku] = useState(null);

  const calculateTotalAmount = (data) => {
    if (!data || data.length === 0) return 0;
    return data.reduce((total, row) => {
      const amount = parseFloat(row[amountField] || row["总价"] || 0);
      return total + amount;
    }, 0);
  };

  const totalAmount = calculateTotalAmount(processedData);

  const calculateColumnTotals = () => {
    // 如果已提供预计算的总和，直接使用
    if (calculatedTotals && typeof calculatedTotals === 'object') {
      return calculatedTotals;
    }
    
    // 否则根据 columnTotals 数组计算
    if (!columnTotals || !processedData || processedData.length === 0) return null;
    
    const totals = {};
    columnTotals.forEach((column) => {
      const total = processedData.reduce((sum, row) => {
        const value = parseFloat(row[column] || 0);
        return sum + (isNaN(value) ? 0 : value);
      }, 0);
      totals[column] = total;
    });
    return totals;
  };

  const columnTotalsResult = calculateColumnTotals();

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

  const handleDownloadExcel = () => {
    if (!onDownload) return;
    onDownload();
  };

  const handleReset = () => {
    if (onReset) onReset();
  };

  const formatAmount = (value) => {
    const num = parseFloat(value || 0);
    const formatted = Math.abs(num).toFixed(2);
    if (num < 0) {
      return <span className="text-destructive font-medium">-¥{formatted}</span>;
    }
    return <span className="text-primary font-medium">¥{formatted}</span>;
  };

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
      <div className="flex justify-between items-center">
        <Button onClick={handleReset} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回
        </Button>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <div></div>
      </div>

      {/* 标题下方的自定义内容（如表单） */}
      {children}

      <section className="bg-card rounded-lg border border-border p-6">
        {showStats && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-foreground mb-3">
              处理统计
            </h3>
            {statsContent}
          </div>
        )}

        <div className="mb-6 flex gap-3 flex-wrap">
          <Button variant="outline" onClick={handleDownloadExcel}>
            <Download className="w-4 h-4 mr-2" />
            {downloadButtonText}
          </Button>
          <Button variant="outline" onClick={handleReset}>
            <RefreshCcw className="w-4 h-4 mr-2" />
            {resetButtonText}
          </Button>
        </div>

        {showCopyColumn && (
          <div className="mb-4 p-3 bg-muted/50 rounded-lg flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Copy className="w-4 h-4" />
              <span>点击 <span className="font-medium">复制图标</span> 复制列数据</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <ChevronsUpDown className="w-4 h-4" />
              <span>点击 <span className="font-medium">排序图标</span> 排序</span>
            </div>
          </div>
        )}

        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/60 border-b border-border">
              <tr>
                {showRowNumber && (
                  <th className="px-4 py-3 text-left font-semibold text-foreground w-20">
                    序号
                  </th>
                )}
                {processedData.length > 0 &&
                  Object.keys(processedData[0]).map((header) => {
                    const displayHeader = columnMapping?.[header] || header;
                    const total = columnTotalsResult?.[header];
                    const isTotalColumn = total !== undefined;
                    const isAmtField = amountFields && Array.isArray(amountFields) 
                      ? amountFields.includes(header) 
                      : header === "单价" || header === "总价" || header === amountField;
                    
                    return (
                      <th
                        key={header}
                        className="px-4 py-3 text-left font-semibold text-foreground whitespace-nowrap"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1">
                            <span>{displayHeader}</span>
                            {isTotalColumn && (
                              <span className={`text-xs font-mono border rounded px-1.5 py-0.5 ${isAmtField ? "bg-primary/10 text-primary border-primary/20" : "bg-muted/50 text-muted-foreground border-border"}`}>
                                {isAmtField ? formatAmount(total) : total?.toFixed(0)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleSort(header)}
                              className="p-1 rounded hover:bg-muted/50 transition-colors"
                              title={`点击排序 "${displayHeader}"`}
                            >
                              {sortConfig.key === header ? (
                                sortConfig.direction === "asc" ? (
                                  <ArrowUp className="w-4 h-4 text-primary" />
                                ) : (
                                  <ArrowDown className="w-4 h-4 text-primary" />
                                )
                              ) : (
                                <ChevronsUpDown className="w-4 h-4 text-muted-foreground" />
                              )}
                            </button>
                            {showCopyColumn && (
                              <button
                                onClick={() => handleCopyColumn(header)}
                                className="p-1 rounded hover:bg-muted/50 transition-colors"
                                title={`点击复制 "${displayHeader}" 列数据`}
                              >
                                <Copy className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />
                              </button>
                            )}
                          </div>
                        </div>
                      </th>
                    );
                  })}
                <th className="px-4 py-3 text-left font-semibold text-foreground whitespace-nowrap">
                  变化详情
                </th>
              </tr>
            </thead>

               <tbody>
               {sortedData.map((row, rowIndex) => (
                 <TableRow
                   key={row["商品编号"] || rowIndex}
                   row={row}
                   rowIndex={rowIndex}
                   amountField={amountField}
                   amountFields={amountFields}
                   showRowNumber={showRowNumber}
                   showDataChanges={showDataChanges}
                   onShowModal={(sku) => {
                     setModalSku(sku);
                     setShowModal(true);
                   }}
                 />
               ))}
             </tbody>
          </table>
        </div>
      </section>

      {showModal && modalSku && dataChanges[modalSku] && (
        <div 
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50" 
          onClick={() => setShowModal(false)}
        >
          <div 
            className="bg-card border border-border rounded-lg shadow-xl p-6 max-w-lg w-full mx-4" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <div className="font-semibold text-lg text-foreground">数据变化详情</div>
              <button 
                onClick={() => setShowModal(false)}
                className="text-muted-foreground hover:text-foreground text-xl"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-4 gap-2 font-medium text-muted-foreground border-b pb-2">
                <div>字段</div>
                <div className="text-right">原始</div>
                <div className="text-right">减去</div>
                <div className="text-right">现在</div>
              </div>
              {(() => {
                const changes = dataChanges[modalSku];
                const { original, deducted, current } = changes;
                const formatNumber = (num) => (num !== undefined ? num.toFixed(2) : "0.00");
                return (
                  <>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="font-medium">数量</div>
                      <div className="text-right">{formatNumber(original?.数量)}</div>
                      <div className="text-right text-destructive">-{formatNumber(deducted?.数量)}</div>
                      <div className="text-right font-semibold">{formatNumber(current?.数量)}</div>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="font-medium">货款</div>
                      <div className="text-right">¥{formatNumber(original?.应结金额)}</div>
                      <div className="text-right text-destructive">-¥{formatNumber(deducted?.应结金额)}</div>
                      <div className="text-right font-semibold">¥{formatNumber(current?.应结金额)}</div>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="font-medium">直营服务费</div>
                      <div className="text-right">¥{formatNumber(original?.直营服务费)}</div>
                      <div className="text-right text-destructive">-¥{formatNumber(deducted?.直营服务费)}</div>
                      <div className="text-right font-semibold">¥{formatNumber(current?.直营服务费)}</div>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="font-medium">收入</div>
                      <div className="text-right">¥{formatNumber(original?.净结金额)}</div>
                      <div className="text-right text-destructive">-¥{formatNumber(deducted?.应结金额 + deducted?.直营服务费)}</div>
                      <div className="text-right font-semibold">¥{formatNumber(current?.净结金额)}</div>
                    </div>
                    <div className="pt-3 mt-3 border-t border-border text-xs text-muted-foreground">
                      处理时间: {new Date(changes.timestamp).toLocaleString()}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TableRow({ row, rowIndex, amountField, amountFields, showRowNumber, showDataChanges, onShowModal }) {
  const { dataChanges } = useSettlement();

  const formatAmount = (value) => {
    const num = parseFloat(value || 0);
    const formatted = Math.abs(num).toFixed(2);
    if (num < 0) {
      return <span className="text-destructive font-medium">-¥{formatted}</span>;
    }
    return <span className="text-primary font-medium">¥{formatted}</span>;
  };

  const isAmountField = (key) => {
    if (amountFields && Array.isArray(amountFields)) {
      return amountFields.includes(key);
    }
    return key === "单价" || key === "总价" || key === amountField;
  };

  const sku = row["商品编号"] || row["SKU"];
  const hasChanges = sku && dataChanges[sku];
  const changes = hasChanges ? dataChanges[sku] : null;

  const getRowBackgroundClass = () => {
    if (!hasChanges || !showDataChanges) {
      return rowIndex % 2 === 0 ? "bg-background" : "bg-muted/30";
    }

    const lastChange = changes;
    const currentQuantity = parseFloat(row["数量"] || 0);
    const originalQuantity = lastChange.original?.数量 || 0;

    if (currentQuantity < originalQuantity) {
      return "bg-destructive/10 hover:bg-destructive/20";
    } else if (currentQuantity > originalQuantity) {
      return "bg-primary/10 hover:bg-primary/20";
    } else {
      return rowIndex % 2 === 0 ? "bg-background" : "bg-muted/30";
    }
  };

  return (
    <tr
      className={`
        transition-colors duration-150
        ${getRowBackgroundClass()}
        relative
      `}
    >
      {showRowNumber && (
        <td className="px-4 py-2.5 text-left border-b border-border/50 text-muted-foreground w-20">
          {rowIndex + 1}
          {hasChanges && showDataChanges && (
            <span className="ml-1 inline-block w-2 h-2 bg-destructive rounded-full" title="已处理"></span>
          )}
        </td>
      )}
      {Object.entries(row).map(([key]) => (
        <td key={key} className="px-4 py-2.5 text-left border-b border-border/50 whitespace-nowrap">
          {isAmountField(key)
            ? formatAmount(row[key])
            : row[key]}
        </td>
      ))}
      {hasChanges && showDataChanges && (
        <td className="px-4 py-2.5 text-left border-b border-border/50 whitespace-nowrap">
          <button 
            onClick={() => onShowModal(sku)}
            className="text-xs text-muted-foreground hover:text-primary cursor-pointer p-1 rounded hover:bg-muted/50"
            title="点击查看数据变化详情"
          >
            ⓘ
          </button>
        </td>
      )}
    </tr>
  );
}
