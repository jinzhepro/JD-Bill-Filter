"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Upload, Trash2, Search, Copy, CheckCircle, Circle } from "lucide-react";

export function PurchaseOrderManager() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const { toast } = useToast();

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products?pageSize=1000");
      const data = await res.json();
      if (data.success) {
        setProducts(data.data);
      }
    } catch {}
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search });
      const res = await fetch(`/api/purchase-orders?${params}`);
      const data = await res.json();
      
      if (data.success) {
        setOrders(data.data);
      } else {
        toast({ title: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "获取数据失败", variant: "destructive" });
    }
    setLoading(false);
  }, [search, toast]);

  useEffect(() => {
    fetchProducts();
    fetchOrders();
  }, [fetchProducts, fetchOrders]);

  const handleSearch = () => {
    fetchOrders();
  };

  const parseImportText = (text) => {
    const lines = text.trim().split("\n");
    const items = [];
    
    for (const line of lines) {
      const parts = line.split("\t");
      if (parts.length >= 6) {
        const sku = parts[1].trim();
        const product = products.find(p => p.sku === sku);
        
        if (!product) {
          toast({ title: `SKU ${sku} 未找到商品`, variant: "destructive" });
          continue;
        }
        
        const taxRateValue = parseFloat(parts[2]) || 13;
        const taxRate = taxRateValue > 1 ? taxRateValue / 100 : taxRateValue;
        
        const productName = `${product.product_name.replace(/\s+/g, '')}_${sku}`;
        
        items.push({
          batch_no: parts[0].trim(),
          sku: sku,
          product_name: productName,
          tax_rate: taxRate,
          quantity: parseFloat(parts[3]) || 0,
          unit_price: parseFloat(parts[4]) || 0,
          total_amount: parseFloat(parts[5]) || 0
        });
      }
    }
    
    return items;
  };

  const handleImport = async () => {
    if (!importText.trim()) {
      toast({ title: "请粘贴导入内容", variant: "destructive" });
      return;
    }

    if (products.length === 0) {
      toast({ title: "商品数据未加载，请稍后重试", variant: "destructive" });
      return;
    }

    const items = parseImportText(importText);
    
    if (items.length === 0) {
      toast({ title: "无法解析导入内容，请检查格式", variant: "destructive" });
      return;
    }

    setImporting(true);
    
    try {
      const res = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items })
      });
      
      const data = await res.json();
      
      if (data.success) {
        const { results } = data;
        toast({ 
          title: `导入完成：成功 ${results.success} 条，失败 ${results.failed} 条` 
        });
        setImportModalOpen(false);
        setImportText("");
        fetchOrders();
      } else {
        toast({ title: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "导入失败", variant: "destructive" });
    }
    
    setImporting(false);
  };

  const handleDeleteBatch = async (batchNo) => {
    if (!confirm(`确定删除批次 ${batchNo} 的所有数据？`)) return;
    
    try {
      const res = await fetch(`/api/purchase-orders?batch_no=${batchNo}`, { method: "DELETE" });
      const data = await res.json();
      
      if (data.success) {
        toast({ title: `删除成功，共 ${data.deleted} 条` });
        fetchOrders();
      } else {
        toast({ title: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "删除失败", variant: "destructive" });
    }
  };

  const toggleEnterStatus = async (batchNo, currentStatus) => {
    const newStatus = currentStatus === 1 ? 0 : 1;
    
    try {
      const res = await fetch("/api/purchase-orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batch_no: batchNo, is_entered: newStatus })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setOrders(prev => prev.map(order => 
          order.batch_no === batchNo ? { ...order, is_entered: newStatus } : order
        ));
        toast({ title: `状态已更新为${newStatus === 1 ? "已录入" : "未录入"}` });
      } else {
        toast({ title: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "更新失败", variant: "destructive" });
    }
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
    const date = new Date(dateStr);
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const copyColumn = async (items, columnKey, columnName) => {
    let values;
    if (columnKey === "tax_rate") {
      values = items.map(item => `${item.tax_rate * 100}%`).join("\n");
    } else if (columnKey === "unit_price" || columnKey === "total_amount") {
      values = items.map(item => item[columnKey] || 0).join("\n");
    } else {
      values = items.map(item => item[columnKey] || "").join("\n");
    }
    
    try {
      await navigator.clipboard.writeText(values);
      toast({ title: `${columnName} 已复制` });
    } catch {
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

  const unEnteredBatches = Object.entries(batches).filter(([, items]) => items[0]?.is_entered !== 1);
  const unEnteredCount = unEnteredBatches.length;
  const unEnteredBatchNos = unEnteredBatches.map(([batchNo]) => batchNo);

  return (
    <div className="space-y-4">
      {unEnteredCount > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="py-3">
            <div className="flex items-center gap-2">
              <Circle className="w-4 h-4 text-orange-500" />
              <span className="font-medium text-orange-700">未录入批次: {unEnteredCount} 个</span>
              <span className="text-orange-600">({unEnteredBatchNos.join("、")})</span>
            </div>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>采购单列表</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="搜索批次号、SKU、商品名称..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
            <Button variant="outline" onClick={handleSearch}>
              <Search className="w-4 h-4 mr-1" />
              搜索
            </Button>
            <Button variant="outline" onClick={() => setImportModalOpen(true)}>
              <Upload className="w-4 h-4 mr-1" />
              导入
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
                        <CardTitle className="text-lg">批次号: {batchNo}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          导入时间: {formatDateTime(items[0]?.created_at)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          总数量: {items.reduce((sum, item) => sum + (item.quantity || 0), 0)} | 总金额: {formatAmount(items.reduce((sum, item) => sum + (item.total_amount || 0), 0))}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => toggleEnterStatus(batchNo, items[0]?.is_entered || 0)}
                          title={items[0]?.is_entered === 1 ? "点击标记为未录入" : "点击标记为已录入"}
                        >
                          {items[0]?.is_entered === 1 ? (
                            <>
                              <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                              已录入
                            </>
                          ) : (
                            <>
                              <Circle className="w-4 h-4 mr-1" />
                              未录入
                            </>
                          )}
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
                            <ThWithCopy items={items} columnKey="sku" columnName="SKU" className="text-left" />
                            <ThWithCopy items={items} columnKey="product_name" columnName="商品名称" className="text-left" />
                            <ThWithCopy items={items} columnKey="tax_rate" columnName="税率" className="text-right" />
                            <ThWithCopy items={items} columnKey="quantity" columnName="数量" className="text-right" />
                            <ThWithCopy items={items} columnKey="unit_price" columnName="单价" className="text-right" />
                            <ThWithCopy items={items} columnKey="total_amount" columnName="入库金额" className="text-right" />
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item) => (
                            <tr key={item.id}>
                              <td className="border border-border px-3 py-2">{item.sku}</td>
                              <td className="border border-border px-3 py-2">{item.product_name}</td>
                              <td className="border border-border px-3 py-2 text-right">{item.tax_rate * 100}%</td>
                              <td className="border border-border px-3 py-2 text-right">{item.quantity}</td>
                              <td className="border border-border px-3 py-2 text-right">{formatAmount(item.unit_price)}</td>
                              <td className="border border-border px-3 py-2 text-right">{formatAmount(item.total_amount)}</td>
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

      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>导入采购单</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">粘贴导入内容（每行一条，Tab分隔）</label>
              <Textarea
                placeholder="格式：批次号	SKU	税率	入库数量	单价	入库金额"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                rows={10}
                className="font-mono"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              商品名称根据SKU自动从商品管理查询。未找到SKU的行将跳过。
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportModalOpen(false)}>
              取消
            </Button>
            <Button onClick={handleImport} disabled={importing}>
              {importing ? "导入中..." : "导入"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}