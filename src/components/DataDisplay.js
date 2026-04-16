"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";
import { useSettlement } from "@/context/SettlementContext";
import { formatAmountJSX } from "@/lib/utils";
import {
  ArrowLeft,
  Download,
  Copy,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
  Search,
  X,
  FileText,
  Clock,
  Info,
  ChevronDown
} from "lucide-react";

/**
 * 数据展示组件，支持排序、复制列数据、查看变化详情等功能
 * @param {Object} props - 组件属性
 * @param {string} props.title - 标题
 * @param {Array} props.originalData - 原始数据
 * @param {Array} props.processedData - 处理后的数据
 * @param {Function} props.onReset - 重置回调
 * @param {Function} props.onDownload - 下载回调
 * @param {boolean} props.showCopyColumn - 是否显示复制列按钮
 * @param {string} props.downloadButtonText - 下载按钮文本
 * @param {string} props.resetButtonText - 重置按钮文本
 * @param {boolean} props.showRowNumber - 是否显示行号
 * @param {Array} props.amountFields - 金额字段列表
 * @param {Object} props.calculatedTotals - 预计算的总数
 * @param {React.ReactNode} props.children - 子元素
 * @param {boolean} props.showDataChanges - 是否显示数据变化
 * @param {Object} props.columnMapping - 列名映射
 */
export default function DataDisplay({
  title = "处理结果",
  originalData,
  processedData,
  onReset,
  onDownload,
  showCopyColumn = false,
  downloadButtonText = "下载 Excel 结果",
  resetButtonText = "重新上传",
  showRowNumber = false,
  amountFields = null,
  calculatedTotals = null,
  children = null,
  showDataChanges = true,
  columnMapping = null,
}) {
  const { toast } = useToast();
  const { dataChanges } = useSettlement();
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [showModal, setShowModal] = useState(false);
  const [modalSku, setModalSku] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showTotals, setShowTotals] = useState(true);

  /**
   * 关闭模态框的回调函数
   */
  const closeModal = useCallback(() => {
    setShowModal(false);
    setModalSku(null);
  }, []);

  /**
   * 处理键盘事件，支持 ESC 键关闭模态框
   * @param {KeyboardEvent} e - 键盘事件
   */
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape' && showModal) {
      closeModal();
    }
  }, [showModal, closeModal]);

  // 监听 ESC 键关闭模态框
  useEffect(() => {
    if (showModal) {
      document.addEventListener('keydown', handleKeyDown);
      // 防止背景滚动
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [showModal, handleKeyDown]);

  const calculatedTotal = calculatedTotals;
  
  // 计算收入合计（货款 + 直营服务费）
  const incomeTotal = React.useMemo(() => {
    if (!calculatedTotal) return 0;
    return (calculatedTotal["应结金额"] || 0) + (calculatedTotal["直营服务费"] || 0);
  }, [calculatedTotal]);

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

  // 全局搜索过滤
  const filteredData = React.useMemo(() => {
    if (!searchQuery || !sortedData) return sortedData;
    const query = searchQuery.toLowerCase().trim();
    if (!query) return sortedData;
    return sortedData.filter(row =>
      Object.values(row).some(val =>
        String(val).toLowerCase().includes(query)
      )
    );
  }, [sortedData, searchQuery]);

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
    } catch (err) {
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

  if (!processedData || processedData.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button
          onClick={handleReset}
          variant="outline"
          className="hover:bg-primary/5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回
        </Button>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">{title}</h1>
        <div></div>
      </div>

      {/* 合计仪表盘 - 可折叠 */}
      {calculatedTotal && Object.keys(calculatedTotal).length > 0 && (
        <section className="bg-muted/20 rounded-xl border border-border shadow-sm overflow-hidden">
          <button
            onClick={() => setShowTotals(!showTotals)}
            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
                <span className="text-muted-foreground font-bold text-sm">¥</span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  合计仪表盘
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  货款 ¥{Math.abs(calculatedTotal["应结金额"] || 0).toFixed(2)} · 
                  直营服务费 ¥{Math.abs(calculatedTotal["直营服务费"] || 0).toFixed(2)} · 
                  收入 ¥{Math.abs(incomeTotal).toFixed(2)} · 
                  数量 {(calculatedTotal["数量"] || 0).toFixed(0)}
                </p>
              </div>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${
                showTotals ? "rotate-180" : ""
              }`}
            />
          </button>
          
          {showTotals && (
            <div className="px-6 pb-6 pt-2 border-t border-border/50">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 货款合计 */}
                <div className="bg-card rounded-lg border border-border p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">货款合计</span>
                    <div className="w-9 h-9 rounded-full bg-green-500/10 flex items-center justify-center">
                      <span className="text-green-600 font-bold text-base">¥</span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-green-600 font-mono">
                    ¥{Math.abs(calculatedTotal["应结金额"] || 0).toFixed(2)}
                  </div>
                </div>

                {/* 直营服务费合计 */}
                <div className="bg-card rounded-lg border border-border p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">直营服务费合计</span>
                    <div className="w-9 h-9 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <span className="text-blue-600 font-bold text-base">¥</span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-blue-600 font-mono">
                    ¥{Math.abs(calculatedTotal["直营服务费"] || 0).toFixed(2)}
                  </div>
                </div>

                {/* 收入合计 */}
                <div className="bg-card rounded-lg border border-border p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">收入合计</span>
                    <div className="w-9 h-9 rounded-full bg-orange-500/10 flex items-center justify-center">
                      <span className="text-orange-600 font-bold text-base">¥</span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-orange-600 font-mono">
                    ¥{Math.abs(incomeTotal).toFixed(2)}
                  </div>
                </div>

                {/* 数量合计 */}
                <div className="bg-card rounded-lg border border-border p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">数量合计</span>
                    <div className="w-9 h-9 rounded-full bg-purple-500/10 flex items-center justify-center">
                      <span className="text-purple-600 font-bold text-base">#</span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-purple-600 font-mono">
                    {(calculatedTotal["数量"] || 0).toFixed(0)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* 标题下方的自定义内容（如表单） */}
      {children}

      <section className="bg-card rounded-xl border border-border p-6 shadow-sm">
        <div className="mb-6 flex gap-3 flex-wrap items-center justify-between">
          <Button
            variant="outline"
            onClick={handleDownloadExcel}
            className="hover:bg-primary/5 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            {downloadButtonText}
          </Button>

          {/* 全局搜索框 */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索商品编号、金额等..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2 rounded-lg border border-border bg-background text-sm
                focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                placeholder:text-muted-foreground transition-all duration-200"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors"
                title="清除搜索"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {searchQuery && (
          <p className="mb-4 text-sm text-muted-foreground">
            找到 <span className="font-medium text-primary">{filteredData.length}</span> 条结果，
            共 <span className="font-medium">{processedData.length}</span> 条数据
          </p>
        )}

        <div className="border border-border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-gradient-to-r from-muted/95 to-muted/80 backdrop-blur supports-[backdrop-filter]:bg-muted/80 border-b border-border">
                <tr>
                  {showRowNumber && (
                    <th className="px-4 py-3.5 text-left font-semibold text-foreground w-20 bg-muted/30">
                      序号
                    </th>
                  )}
                  {processedData.length > 0 &&
                    Object.keys(processedData[0]).map((header) => {
                      const displayHeader = columnMapping?.[header] || header;
                      const total = calculatedTotal?.[header];
                      const isAmtField = amountFields && Array.isArray(amountFields)
                        ? amountFields.includes(header)
                        : header === "单价" || header === "总价";

                      return (
                        <th
                          key={header}
                          className="px-4 py-3.5 text-left font-semibold text-foreground whitespace-nowrap bg-muted/30"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1">
                              <span>{displayHeader}</span>
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
                {filteredData.map((row, rowIndex) => (
                  <TableRow
                    key={row["商品编号"] || rowIndex}
                    row={row}
                    rowIndex={rowIndex}
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
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div
            className="bg-card border border-border rounded-2xl shadow-2xl p-6 max-w-lg w-full mx-4 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <div id="modal-title" className="font-bold text-xl text-foreground flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                数据变化详情
              </div>
              <button
                onClick={closeModal}
                className="text-muted-foreground hover:text-foreground hover:bg-muted p-2 rounded-lg transition-colors"
                aria-label="关闭"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-4 gap-2 font-semibold text-muted-foreground border-b pb-3">
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
                    <div className="grid grid-cols-4 gap-2 py-2">
                      <div className="font-medium">数量</div>
                      <div className="text-right">{formatNumber(original?.数量)}</div>
                      <div className="text-right text-destructive">-{formatNumber(deducted?.数量)}</div>
                      <div className="text-right font-bold text-primary">{formatNumber(current?.数量)}</div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 py-2">
                      <div className="font-medium">货款</div>
                      <div className="text-right">¥{formatNumber(original?.应结金额)}</div>
                      <div className="text-right text-destructive">-¥{formatNumber(deducted?.应结金额)}</div>
                      <div className="text-right font-bold text-primary">¥{formatNumber(current?.应结金额)}</div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 py-2">
                      <div className="font-medium">直营服务费</div>
                      <div className="text-right">¥{Math.abs(original?.直营服务费 || 0).toFixed(2)}</div>
                      <div className="text-right text-destructive">-¥{Math.abs(deducted?.直营服务费 || 0).toFixed(2)}</div>
                      <div className="text-right font-bold text-primary">¥{Math.abs(current?.直营服务费 || 0).toFixed(2)}</div>
                    </div>
                    <div className="pt-4 mt-4 border-t border-border text-xs text-muted-foreground flex items-center gap-2">
                      <Clock className="w-4 h-4" />
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

function TableRow({ row, rowIndex, amountFields, showRowNumber, showDataChanges, onShowModal }) {
  const { dataChanges } = useSettlement();

  const isAmountField = (key) => {
    if (amountFields && Array.isArray(amountFields)) {
      return amountFields.includes(key);
    }
    return key === "单价" || key === "总价";
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
        transition-all duration-150 hover:shadow-sm
        ${getRowBackgroundClass()}
        relative
      `}
    >
      {showRowNumber && (
        <td className="px-4 py-3 text-left border-b border-border/50 text-muted-foreground w-20 font-medium">
          {rowIndex + 1}
          {hasChanges && showDataChanges && (
            <span className="ml-1.5 inline-block w-2 h-2 bg-destructive rounded-full" title="已处理"></span>
          )}
        </td>
      )}
      {Object.entries(row).map(([key]) => (
        <td key={key} className="px-4 py-3 text-left border-b border-border/50 whitespace-nowrap">
          {isAmountField(key)
            ? formatAmountJSX(row[key], key === "直营服务费")
            : row[key]}
        </td>
      ))}
      {hasChanges && showDataChanges && (
        <td className="px-4 py-3 text-left border-b border-border/50 whitespace-nowrap">
          <button
            onClick={() => onShowModal(sku)}
            className="text-xs text-muted-foreground hover:text-primary cursor-pointer p-1.5 rounded-md hover:bg-primary/10 transition-colors"
            title="点击查看数据变化详情"
          >
            <Info className="w-4 h-4" />
          </button>
        </td>
      )}
    </tr>
  );
}
