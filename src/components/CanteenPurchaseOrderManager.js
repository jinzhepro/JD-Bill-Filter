"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Search, Copy, Download, FileText, FileSpreadsheet, History } from "lucide-react";
import Decimal from "decimal.js";
import mammoth from "mammoth";
import { CanteenInvoiceModal } from "@/components/CanteenInvoiceModal";
import { CanteenInvoiceHistoryModal } from "@/components/CanteenInvoiceHistoryModal";

export function CanteenPurchaseOrderManager() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [previewItems, setPreviewItems] = useState([]);
  const [previewErrors, setPreviewErrors] = useState([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search });
      const res = await fetch(`/api/canteen-purchase-orders?${params}`);
      const data = await res.json();
      
      if (data.success) {
        setOrders(data.data);
      } else {
        toast({ title: data.error, variant: "destructive" });
      }
    } catch (error) {
      console.error('获取食堂采购单数据失败:', error);
      toast({ title: "获取数据失败", variant: "destructive" });
    }
    setLoading(false);
  }, [search, toast]);

  const handleSearch = () => {
    fetchOrders();
  };
  
  const parseWordFile = useCallback(async (file) => {
    const items = [];
    const errors = [];
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      const html = result.value;
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const tables = doc.querySelectorAll('table');
      
      if (tables.length === 0) {
        errors.push('未找到表格，请确保 Word 文件中包含表格');
        return { items, errors };
      }
      
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const timeStr = String(now.getTime()).slice(-6);
      const batchNo = `CP${dateStr}${timeStr}`;
      
      const cleanNumberStr = (str) => {
        if (!str) return '0';
        return str.replace(/[^\d.\-]/g, '') || '0';
      };
      
      tables.forEach((table, tableIndex) => {
        const rows = table.querySelectorAll('tr');
        
        if (rows.length < 3) {
          return;
        }
        
        const headerRow = rows[1];
        const headerCells = headerRow.querySelectorAll('td, th');
        const columnCount = headerCells.length;
        
        let hasSpecColumn = false;
        if (columnCount === 8) {
          const secondCell = headerCells[1] ? headerCells[1].textContent.trim() : '';
          if (secondCell.includes('规格') || secondCell.includes('型号')) {
            hasSpecColumn = true;
          }
        }
        
        for (let rowIndex = 2; rowIndex < rows.length; rowIndex++) {
          const row = rows[rowIndex];
          const cells = row.querySelectorAll('td, th');
          const cellValues = Array.from(cells).map(c => c.textContent.trim());
          
          if (cellValues.length === 0) {
            continue;
          }
          
          const firstCell = cellValues[0];
          if (firstCell.includes('小计') || firstCell.includes('合计') || firstCell.includes('总计')) {
            break;
          }
          
          if (!firstCell.startsWith('*')) {
            continue;
          }
          
          const productName = firstCell;
          let spec = '';
          let unit = '';
          let quantity = 0;
          let unitPrice = 0;
          let totalAmountWithoutTax = 0;
          let taxRateNum = 0;
          let taxAmount = 0;
          
          if (hasSpecColumn && cellValues.length >= 8) {
            spec = cellValues[1] || '';
            unit = cellValues[2] || '';
            quantity = parseFloat(cleanNumberStr(cellValues[3])) || 0;
            unitPrice = parseFloat(cleanNumberStr(cellValues[4])) || 0;
            totalAmountWithoutTax = parseFloat(cleanNumberStr(cellValues[5])) || 0;
            
            const taxRateStr = cellValues[6] || '';
            if (taxRateStr.includes('%')) {
              taxRateNum = parseFloat(taxRateStr.replace('%', '')) / 100;
            } else {
              taxRateNum = parseFloat(cleanNumberStr(taxRateStr)) / 100 || 0;
            }
            
            taxAmount = parseFloat(cleanNumberStr(cellValues[7])) || 0;
          } else if (cellValues.length >= 7) {
            spec = '';
            unit = cellValues[1] || '';
            quantity = parseFloat(cleanNumberStr(cellValues[2])) || 0;
            unitPrice = parseFloat(cleanNumberStr(cellValues[3])) || 0;
            totalAmountWithoutTax = parseFloat(cleanNumberStr(cellValues[4])) || 0;
            
            const taxRateStr = cellValues[5] || '';
            if (taxRateStr.includes('%')) {
              taxRateNum = parseFloat(taxRateStr.replace('%', '')) / 100;
            } else {
              taxRateNum = parseFloat(cleanNumberStr(taxRateStr)) / 100 || 0;
            }
            
            taxAmount = parseFloat(cleanNumberStr(cellValues[6])) || 0;
          } else {
            errors.push(`表格${tableIndex + 1}第${rowIndex + 1}行：列数不足`);
            continue;
          }
          
          if (quantity <= 0) {
            errors.push(`表格${tableIndex + 1}第${rowIndex + 1}行：数量无效`);
            continue;
          }
          
          if (unitPrice <= 0) {
            errors.push(`表格${tableIndex + 1}第${rowIndex + 1}行：单价无效`);
            continue;
          }
          
          if (totalAmountWithoutTax <= 0) {
            errors.push(`表格${tableIndex + 1}第${rowIndex + 1}行：金额无效`);
            continue;
          }
          
          const amountWithTax = new Decimal(totalAmountWithoutTax).plus(taxAmount).toNumber();
          
          items.push({
            product_name: productName,
            spec: spec,
            unit: unit,
            quantity: quantity,
            unit_price: unitPrice,
            total_amount: totalAmountWithoutTax,
            tax_rate: taxRateNum,
            tax_amount: taxAmount,
            amount_with_tax: amountWithTax,
            canteen_name: '',
            batch_no: batchNo
          });
        }
      });
      
      if (items.length === 0 && errors.length === 0) {
        errors.push('未找到有效数据，请确保项目名称以「*」开头');
      }
      
    } catch (error) {
      console.error('解析 Word 文件失败:', error);
      errors.push(`解析失败：${error.message}`);
    }
    
    return { items, errors };
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleCloseImportModal = () => {
    setImportModalOpen(false);
    setPreviewItems([]);
    setPreviewErrors([]);
  };
  
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.name.endsWith('.docx') && !file.name.endsWith('.doc')) {
      toast({ title: "请上传 .docx 或 .doc 格式的 Word 文件", variant: "destructive" });
      return;
    }
    
    setPreviewErrors([]);
    setPreviewItems([]);
    
    const { items, errors } = await parseWordFile(file);
    setPreviewItems(items);
    setPreviewErrors(errors);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = async () => {
    if (previewItems.length === 0) {
      toast({ title: "没有可导入的数据", variant: "destructive" });
      return;
    }

    setImporting(true);
    
    try {
      const res = await fetch("/api/canteen-purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: previewItems })
      });
      
      const data = await res.json();
      
      if (data.success) {
        const { results } = data;
        toast({ title: `导入完成：成功 ${results.success} 条` });
        handleCloseImportModal();
        fetchOrders();
      } else {
        toast({ title: data.error, variant: "destructive" });
      }
    } catch (error) {
      console.error('操作失败:', error);
      toast({ title: "导入失败", variant: "destructive" });
    }
    
    setImporting(false);
  };

  const handleDeleteBatch = async (batchNo) => {
    if (!confirm(`确定删除发票号码 ${batchNo} 的所有数据？`)) return;
    
    try {
      const res = await fetch(`/api/canteen-purchase-orders?batch_no=${batchNo}`, { method: "DELETE" });
      const data = await res.json();
      
      if (data.success) {
        toast({ title: `删除成功，共 ${data.deleted} 条` });
        fetchOrders();
      } else {
        toast({ title: data.error, variant: "destructive" });
      }
    } catch (error) {
      console.error('操作失败:', error);
      toast({ title: "删除失败", variant: "destructive" });
    }
  };

  const downloadCSV = (batchNo, items) => {
    if (!items || items.length === 0) return;
    
    const headers = ['批次号', '项目名称', '规格型号', '单位', '数量', '单价', '金额', '税率', '税额', '含税金额'];
    const csvRows = items.map(item => {
      const taxRate = item.tax_rate ? `${(item.tax_rate * 100).toFixed(0)}%` : '0%';
      const row = [
        batchNo,
        item.product_name || '',
        item.spec || '',
        item.unit || '',
        item.quantity || 0,
        item.unit_price || 0,
        item.total_amount || 0,
        taxRate,
        item.tax_amount || 0,
        item.amount_with_tax || 0
      ];
      return row.map(val => {
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',');
    });
    
    const csvContent = '\ufeff' + [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `食堂采购单_${batchNo}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    link.remove();
    toast({ title: `已导出批次 ${batchNo} 的CSV文件` });
  };

  const handleExportAll = () => {
    const batchEntries = Object.entries(batches);
    if (batchEntries.length === 0) {
      toast({ title: "暂无数据可导出", variant: "destructive" });
      return;
    }
    
    batchEntries.forEach(([batchNo, items]) => {
      downloadCSV(batchNo, items);
    });
    toast({ title: `已导出 ${batchEntries.length} 个批次的CSV文件` });
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(amount || 0);
  };

  const batches = orders.reduce((acc, order) => {
    if (!acc[order.batch_no]) {
      acc[order.batch_no] = [];
    }
    acc[order.batch_no].push(order);
    return acc;
  }, {});

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr.replace(" ", "T") + "Z");
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Shanghai"
    });
  };

  const copyColumn = async (items, columnKey, columnName) => {
    const values = items.map(item => {
      return item[columnKey] || "";
    }).join("\n");
    
    try {
      await navigator.clipboard.writeText(values);
      toast({ title: `${columnName} 已复制` });
    } catch (error) {
      console.error('操作失败:', error);
      toast({ title: "复制失败", variant: "destructive" });
    }
  };

  const ThWithCopy = ({ items, columnKey, columnName, className }) => (
    <th className={`border border-border px-3 py-2 ${className}`}>
      <div className="flex items-center gap-1">
        <span>{columnName}</span>
        <button
          onClick={() => copyColumn(items, columnKey, columnName)}
          className="cursor-pointer p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
          title={`复制${columnName}列`}
        >
          <Copy className="w-3 h-3" />
        </button>
      </div>
    </th>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>食堂采购单列表</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="搜索发票号码、品名..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
            <Button variant="outline" onClick={handleSearch}>
              <Search className="w-4 h-4 mr-1" />
              搜索
            </Button>
            <Button variant="outline" onClick={() => setImportModalOpen(true)}>
              <FileText className="w-4 h-4 mr-1" />
              导入
            </Button>
            <Button variant="outline" onClick={() => setInvoiceModalOpen(true)}>
              <FileSpreadsheet className="w-4 h-4 mr-1" />
              开发票
            </Button>
            <Button variant="outline" onClick={() => setHistoryModalOpen(true)}>
              <History className="w-4 h-4 mr-1" />
              开票记录
            </Button>
            <Button variant="outline" onClick={handleExportAll} disabled={orders.length === 0}>
              <Download className="w-4 h-4 mr-1" />
              导出CSV
            </Button>
          </div>

          {loading ? (
            <p className="text-muted-foreground text-center py-4">加载中...</p>
          ) : orders.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">暂无数据</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(batches).map(([batchNo, items]) => (
                <Card key={batchNo}>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="text-lg">发票号码: {batchNo}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          导入时间: {formatDateTime(items[0]?.created_at)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          数量: {items.reduce((sum, item) => sum + (item.quantity || 0), 0).toFixed(2)} | 
                          不含税金额: {formatAmount(items.reduce((sum, item) => sum.plus(item.total_amount || 0), new Decimal(0)).toNumber())} | 
                          税额: {formatAmount(items.reduce((sum, item) => sum.plus(item.tax_amount || 0), new Decimal(0)).toNumber())} | 
                          合计: {formatAmount(items.reduce((sum, item) => sum.plus(item.total_amount || 0).plus(item.tax_amount || 0), new Decimal(0)).toNumber())}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => downloadCSV(batchNo, items)}>
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteBatch(batchNo)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
<table className="w-full border-collapse">
<thead>
<tr className="bg-muted">
                                <ThWithCopy items={items} columnKey="product_name" columnName="项目名称" className="text-left" />
                                <ThWithCopy items={items} columnKey="spec" columnName="规格型号" className="text-center" />
                                <ThWithCopy items={items} columnKey="unit" columnName="单位" className="text-center" />
                                <ThWithCopy items={items} columnKey="quantity" columnName="数量" className="text-right" />
                                <ThWithCopy items={items} columnKey="unit_price" columnName="单价" className="text-right" />
                                <ThWithCopy items={items} columnKey="total_amount" columnName="金额" className="text-right" />
                                <ThWithCopy items={items} columnKey="tax_rate" columnName="税率" className="text-right" />
                                <ThWithCopy items={items} columnKey="tax_amount" columnName="税额" className="text-right" />
                                <ThWithCopy items={items} columnKey="amount_with_tax" columnName="含税金额" className="text-right" />
                              </tr>
                           </thead>
                           <tbody>
                             {items.map((item) => (
<tr key={item.id}>
                                   <td className="border border-border px-3 py-2">{item.product_name}</td>
                                   <td className="border border-border px-3 py-2 text-center">{item.spec || ''}</td>
                                   <td className="border border-border px-3 py-2 text-center">{item.unit}</td>
                                   <td className="border border-border px-3 py-2 text-right">{item.quantity}</td>
                                   <td className="border border-border px-3 py-2 text-right">{formatAmount(item.unit_price)}</td>
                                   <td className="border border-border px-3 py-2 text-right">{formatAmount(item.total_amount)}</td>
                                   <td className="border border-border px-3 py-2 text-right">{(item.tax_rate * 100).toFixed(0)}%</td>
                                   <td className="border border-border px-3 py-2 text-right">{formatAmount(item.tax_amount)}</td>
                                   <td className="border border-border px-3 py-2 text-right">{formatAmount(item.amount_with_tax || 0)}</td>
                                 </tr>
                             ))}
                           </tbody>
                       </table>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={importModalOpen} onOpenChange={handleCloseImportModal}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>导入食堂采购单</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">上传 Word 文件</label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".docx,.doc"
                  onChange={handleFileUpload}
                  ref={fileInputRef}
                  className="max-w-sm"
                />
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              支持 .docx 格式的 Word 文件，文件中需包含表格。表格列顺序：项目名称、规格型号、单位、数量、单价、金额、税率/征收率、税额。规格型号和单位可为空或合并为一列。以「*」开头的行才会被解析。
            </p>

            {previewErrors.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <p className="text-sm text-destructive">
                  解析问题：{previewErrors.slice(0, 5).join("；")}{previewErrors.length > 5 ? "..." : ""}
                </p>
              </div>
            )}

            {previewItems.length > 0 && (
              <div className="bg-muted rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium">解析结果</p>
                <div className="flex gap-6 text-sm">
                  <span>共 {previewItems.length} 条</span>
                  <span>不含税金额: {formatAmount(previewItems.reduce((sum, item) => sum.plus(item.total_amount || 0), new Decimal(0)).toNumber())}</span>
                  <span>税额: {formatAmount(previewItems.reduce((sum, item) => sum.plus(item.tax_amount || 0), new Decimal(0)).toNumber())}</span>
                  <span className="font-medium">合计: {formatAmount(previewItems.reduce((sum, item) => sum.plus(item.total_amount || 0).plus(item.tax_amount || 0), new Decimal(0)).toNumber())}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseImportModal}>
              取消
            </Button>
            <Button onClick={handleConfirmImport} disabled={importing || previewItems.length === 0}>
              {importing ? "导入中..." : "确认导入"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CanteenInvoiceModal
        open={invoiceModalOpen}
        onOpenChange={setInvoiceModalOpen}
        products={orders}
      />

      <CanteenInvoiceHistoryModal
        open={historyModalOpen}
        onOpenChange={setHistoryModalOpen}
      />
    </div>
  );
}
