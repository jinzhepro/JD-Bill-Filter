"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Search, Copy, ClipboardPaste, Download } from "lucide-react";

export function CanteenPurchaseOrderManager() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [pasteImportModalOpen, setPasteImportModalOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pastePreviewItems, setPastePreviewItems] = useState([]);
  const [pastePreviewErrors, setPastePreviewErrors] = useState([]);
  const [pasteImporting, setPasteImporting] = useState(false);
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

  const parsePasteText = useCallback((text) => {
    const items = [];
    const errors = [];
    
    if (!text || !text.trim()) {
      return { items, errors };
    }
    
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = String(now.getTime()).slice(-6);
    const batchNo = `CP${dateStr}${timeStr}`;
    
    const lines = text.trim().split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const parts = line.split('\t').filter(p => p.trim() !== '');
      
      if (parts.length < 6) {
        if (i > 0) {
          errors.push(`第${i + 1}行：列数不足，需要6列，实际${parts.length}列`);
        }
        continue;
      }
      
      if (i === 0) {
        const firstCol = parts[0].trim();
        if (firstCol === '产品名称' || firstCol === '项目名称' || firstCol.includes('名称')) {
          continue;
        }
      }
      
      const productName = parts[0].trim();
      
      if (!productName.startsWith('*')) {
        continue;
      }
      
      let quantityIdx = -1;
      let unit = '';
      let quantity = 0;
      let unitPrice = 0;
      let totalAmount = 0;
      let taxRateStr = '';
      let taxAmountStr = '';
      
      for (let j = 1; j < parts.length - 3; j++) {
        const val1 = parseFloat(parts[j]);
        const val2 = parseFloat(parts[j + 1]);
        const val3 = parseFloat(parts[j + 2]);
        
        if (!isNaN(val1) && !isNaN(val2) && !isNaN(val3) && 
            val1 > 0 && val2 > 0 && val3 > 0 &&
            /^\d+(\.\d+)?$/.test(parts[j].trim()) &&
            /^\d+(\.\d+)?$/.test(parts[j + 1].trim()) &&
            /^\d+(\.\d+)?$/.test(parts[j + 2].trim())) {
          
          const calculatedAmount = val1 * val2;
          const diff = Math.abs(calculatedAmount - val3) / val3;
          
          if (diff < 0.05) {
            quantityIdx = j;
            unit = parts[j - 1].trim();
            quantity = val1;
            unitPrice = val2;
            totalAmount = val3;
            taxRateStr = (parts[j + 3] || '').trim();
            taxAmountStr = (parts[j + 4] || '').trim();
            break;
          }
        }
      }
      
      if (quantityIdx === -1) {
        errors.push(`第${i + 1}行：未找到有效的数量-单价-金额关系`);
        continue;
      }
      
      let taxRateNum = 0;
      if (taxRateStr.includes('%')) {
        taxRateNum = parseFloat(taxRateStr.replace('%', '')) / 100;
      } else {
        taxRateNum = (parseFloat(taxRateStr) || 0) / 100;
      }
      
      const totalAmountWithoutTax = totalAmount;
      const taxAmount = taxAmountStr ? parseFloat(taxAmountStr) : Math.round(totalAmountWithoutTax * taxRateNum * 100) / 100;
      const amountWithTax = Math.round((totalAmountWithoutTax + taxAmount) * 100) / 100;
      
      if (!productName) {
        errors.push(`第${i + 1}行：项目名称为空`);
        continue;
      }
      
      if (quantity <= 0) {
        errors.push(`第${i + 1}行：数量无效`);
        continue;
      }
      
      if (unitPrice <= 0) {
        errors.push(`第${i + 1}行：单价无效`);
        continue;
      }
      
      if (totalAmount <= 0) {
        errors.push(`第${i + 1}行：金额无效`);
        continue;
      }
      
      items.push({
        product_name: productName,
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
    
    return { items, errors };
  }, []);

  useEffect(() => {
    if (pasteText) {
      const { items, errors } = parsePasteText(pasteText);
      setPastePreviewItems(items);
      setPastePreviewErrors(errors);
    } else {
      setPastePreviewItems([]);
      setPastePreviewErrors([]);
    }
  }, [pasteText, parsePasteText]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleClosePasteModal = () => {
    setPasteImportModalOpen(false);
    setPasteText("");
    setPastePreviewItems([]);
    setPastePreviewErrors([]);
  };

  const handlePasteConfirmImport = async () => {
    if (pastePreviewItems.length === 0) {
      toast({ title: "没有可导入的数据", variant: "destructive" });
      return;
    }

    setPasteImporting(true);
    
    try {
      const res = await fetch("/api/canteen-purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: pastePreviewItems })
      });
      
      const data = await res.json();
      
      if (data.success) {
        const { results } = data;
        toast({ title: `导入完成：成功 ${results.success} 条` });
        handleClosePasteModal();
        fetchOrders();
      } else {
        toast({ title: data.error, variant: "destructive" });
      }
    } catch (error) {
      console.error('操作失败:', error);
      toast({ title: "导入失败", variant: "destructive" });
    }
    
    setPasteImporting(false);
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
    
    const headers = ['批次号', '产品名称', '单位', '数量', '单价', '金额', '税率', '税额'];
    const csvRows = items.map(item => {
      const taxRate = item.tax_rate ? `${(item.tax_rate * 100).toFixed(0)}%` : '0%';
      const row = [
        batchNo,
        item.product_name || '',
        item.unit || '',
        item.quantity || 0,
        item.unit_price || 0,
        item.total_amount || 0,
        taxRate,
        item.tax_amount || 0
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
            <Button variant="outline" onClick={() => setPasteImportModalOpen(true)}>
              <ClipboardPaste className="w-4 h-4 mr-1" />
              导入
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
                          不含税金额: {formatAmount(items.reduce((sum, item) => sum + (item.total_amount || 0), 0))} | 
                          税额: {formatAmount(items.reduce((sum, item) => sum + (item.tax_amount || 0), 0))} | 
                          合计: {formatAmount(items.reduce((sum, item) => sum + (item.total_amount || 0) + (item.tax_amount || 0), 0))}
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

      <Dialog open={pasteImportModalOpen} onOpenChange={handleClosePasteModal}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>导入食堂采购单</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">粘贴数据（制表符分隔）</label>
              <Textarea
                placeholder={"产品名称\t单位\t数量\t单价\t金额\t税率（%）\n*调味品*纯白胡椒粉\t斤\t2\t40.7\t81.4\t9"}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                rows={12}
                className="font-mono text-sm"
              />
            </div>

            <p className="text-sm text-muted-foreground">
              格式：产品名称、单位、数量、单价、金额、税率（%），每行一条，制表符分隔。第一行为表头可省略，以「*」开头的行才会被解析。批次号自动生成。
            </p>

            {pastePreviewErrors.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <p className="text-sm text-destructive">
                  解析问题：{pastePreviewErrors.slice(0, 5).join("；")}{pastePreviewErrors.length > 5 ? "..." : ""}
                </p>
              </div>
            )}

            {pastePreviewItems.length > 0 && (
              <div className="bg-muted rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium">解析结果</p>
                <div className="flex gap-6 text-sm">
                  <span>共 {pastePreviewItems.length} 条</span>
                  <span>不含税金额: {formatAmount(pastePreviewItems.reduce((sum, item) => sum + (item.total_amount || 0), 0))}</span>
                  <span>税额: {formatAmount(pastePreviewItems.reduce((sum, item) => sum + (item.tax_amount || 0), 0))}</span>
                  <span className="font-medium">合计: {formatAmount(pastePreviewItems.reduce((sum, item) => sum + (item.amount_with_tax || 0), 0))}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClosePasteModal}>
              取消
            </Button>
            <Button onClick={handlePasteConfirmImport} disabled={pasteImporting || pastePreviewItems.length === 0}>
              {pasteImporting ? "导入中..." : "确认导入"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
