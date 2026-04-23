"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, Search, Upload, RefreshCw } from "lucide-react";

const getInvoiceName = (name, brandMappings) => {
  for (const mapping of brandMappings) {
    const keywords = mapping.brand_keywords.split(",").map(k => k.trim());
    for (const keyword of keywords) {
      if (name.includes(keyword)) {
        return mapping.invoice_name;
      }
    }
  }
  return "";
};

export function ProductManager() {
  const [products, setProducts] = useState([]);
  const [brandMappings, setBrandMappings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    sku: "",
    product_name: "",
    warehouse: "",
    spec: "",
    invoice_name: ""
  });
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const { toast } = useToast();

  const stats = useMemo(() => {
    const total = products.length;
    const missingSpec = products.filter(p => !p.spec).length;
    const missingInvoiceName = products.filter(p => !p.invoice_name).length;
    return { total, missingSpec, missingInvoiceName };
  }, [products]);

  const fetchBrandMappings = useCallback(async () => {
    try {
      const res = await fetch("/api/brand-mappings");
      const data = await res.json();
      if (data.success) {
        setBrandMappings(data.data);
      }
    } catch {}
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search, pageSize: 1000 });
      const res = await fetch(`/api/products?${params}`);
      const data = await res.json();
      
      if (data.success) {
        setProducts(data.data);
      } else {
        toast({ title: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "获取数据失败", variant: "destructive" });
    }
    setLoading(false);
  }, [search, toast]);

  useEffect(() => {
    fetchBrandMappings();
    fetchProducts();
  }, [fetchBrandMappings, fetchProducts]);

  const handleSearch = () => {
    fetchProducts();
  };

  const handleAdd = () => {
    setEditingProduct(null);
    setFormData({
      sku: "",
      product_name: "",
      warehouse: "",
      spec: "",
      invoice_name: ""
    });
    setModalOpen(true);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      sku: product.sku,
      product_name: product.product_name,
      warehouse: product.warehouse || "",
      spec: product.spec || "",
      invoice_name: product.invoice_name || ""
    });
    setModalOpen(true);
  };

  const handleProductNameChange = (name) => {
    const spec = extractSpec(name);
    const invoiceName = getInvoiceName(name, brandMappings);
    setFormData({ ...formData, product_name: name, spec, invoice_name: invoiceName });
  };

  const handleDelete = async (id) => {
    if (!confirm("确定删除此商品？")) return;
    
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      const data = await res.json();
      
      if (data.success) {
        toast({ title: "删除成功" });
        fetchProducts();
      } else {
        toast({ title: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "删除失败", variant: "destructive" });
    }
  };

  const handleSubmit = async () => {
    if (!formData.sku || !formData.product_name) {
      toast({ title: "SKU、商品名称必填", variant: "destructive" });
      return;
    }

    if (!formData.spec || formData.spec.trim() === "") {
      toast({ title: "规格必填", variant: "destructive" });
      return;
    }

    const expectedInvoiceName = getInvoiceName(formData.product_name, brandMappings);
    if (!formData.invoice_name || formData.invoice_name.trim() === "") {
      if (expectedInvoiceName) {
        toast({ title: "发票名称未填写，品牌映射建议：" + expectedInvoiceName, variant: "destructive" });
        return;
      } else {
        toast({ title: "发票名称必填，未匹配到品牌映射", variant: "destructive" });
        return;
      }
    }

    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : "/api/products/add";
      const method = editingProduct ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast({ title: editingProduct ? "更新成功" : "添加成功" });
        setModalOpen(false);
        fetchProducts();
      } else {
        toast({ title: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "操作失败", variant: "destructive" });
    }
  };

  const extractSpec = (name) => {
    const specMatch = name.match(/(\d+(?:ml|L|g|kg|ML))\s*(?:\/[^*]*)?[×*xX]\s*(\d+)/i);
    if (specMatch) {
      const spec = `${specMatch[1]}×${specMatch[2]}`;
      return spec;
    }
    return "";
  };

  const parseImportText = (text) => {
    const lines = text.trim().split("\n");
    const items = [];
    
    for (const line of lines) {
      const parts = line.split("\t");
      if (parts.length >= 2) {
        const productName = parts[1].trim();
        const spec = extractSpec(productName);
        const invoiceName = getInvoiceName(productName, brandMappings);
        items.push({
          sku: parts[0].trim(),
          product_name: productName,
          warehouse: parts.length >= 3 ? parts[2].trim() : "",
          spec: spec,
          invoice_name: invoiceName
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

    const items = parseImportText(importText);
    
    if (items.length === 0) {
      toast({ title: "无法解析导入内容，请检查格式", variant: "destructive" });
      return;
    }

    const missingSpecItems = items.filter(item => !item.spec || item.spec.trim() === "");
    if (missingSpecItems.length > 0) {
      const missingNames = missingSpecItems.map(item => item.product_name).slice(0, 3).join(", ");
      toast({ 
        title: `以下商品缺少规格：${missingNames}${missingSpecItems.length > 3 ? "..." : ""}`, 
        variant: "destructive" 
      });
      return;
    }

    const unmatchedItems = items.filter(item => !item.invoice_name || item.invoice_name.trim() === "");
    if (unmatchedItems.length > 0) {
      const unmatchedNames = unmatchedItems.map(item => item.product_name).slice(0, 3).join(", ");
      toast({ 
        title: `以下商品未匹配到发票名称：${unmatchedNames}${unmatchedItems.length > 3 ? "..." : ""}`, 
        variant: "destructive" 
      });
      return;
    }

    setImporting(true);
    
    try {
      const res = await fetch("/api/products/batch-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items })
      });
      
      const data = await res.json();
      
      if (data.success) {
        const { results } = data;
        toast({ 
          title: `导入完成：新增 ${results.success} 条，更新 ${results.updated} 条，失败 ${results.failed} 条` 
        });
        setImportModalOpen(false);
        setImportText("");
        fetchProducts();
      } else {
        toast({ title: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "导入失败", variant: "destructive" });
    }
    
    setImporting(false);
  };

  const handleUpdateInvoiceNames = async () => {
    if (!confirm("确定根据品牌映射更新所有商品的发票名称？")) return;

    try {
      const res = await fetch("/api/products/update-invoice-names", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (data.success) {
        toast({ 
          title: `更新完成：成功 ${data.updated} 条，未匹配 ${data.unmatched} 条` 
        });
        fetchProducts();
      } else {
        toast({ title: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "更新失败", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>商品名称-SKU映射管理</CardTitle>
          {!loading && (
            <div className="flex gap-4 text-sm mt-2">
              <span className="text-muted-foreground">总条数：<span className="font-medium text-foreground">{stats.total}</span></span>
              {stats.missingSpec > 0 && (
                <span className="text-destructive">缺少规格：{stats.missingSpec}</span>
              )}
              {stats.missingInvoiceName > 0 && (
                <span className="text-destructive">缺少发票名称：{stats.missingInvoiceName}</span>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="搜索 SKU、商品名称、仓库..."
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
            <Button variant="outline" onClick={handleUpdateInvoiceNames}>
              <RefreshCw className="w-4 h-4 mr-1" />
              更新发票名称
            </Button>
            <Button onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-1" />
              添加
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted">
                  <th className="border border-border px-3 py-2 text-left">SKU</th>
                  <th className="border border-border px-3 py-2 text-left">商品名称</th>
                  <th className="border border-border px-3 py-2 text-left">仓库</th>
                  <th className="border border-border px-3 py-2 text-left">规格</th>
                  <th className="border border-border px-3 py-2 text-left">发票名称</th>
                  <th className="border border-border px-3 py-2 text-center w-20">操作</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="border border-border px-3 py-4 text-center text-muted-foreground">
                      加载中...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="border border-border px-3 py-4 text-center text-muted-foreground">
                      暂无数据
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr key={product.id}>
                      <td className="border border-border px-3 py-2">{product.sku}</td>
                      <td className="border border-border px-3 py-2">{product.product_name}</td>
                      <td className="border border-border px-3 py-2">{product.warehouse || "-"}</td>
                      <td className="border border-border px-3 py-2">{product.spec || "-"}</td>
                      <td className="border border-border px-3 py-2">{product.invoice_name || "-"}</td>
                      <td className="border border-border px-3 py-2 text-center">
                        <div className="flex gap-1 justify-center">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(product)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(product.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "编辑商品" : "添加商品"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">SKU *</label>
              <Input
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">商品名称 *</label>
              <Input
                value={formData.product_name}
                onChange={(e) => handleProductNameChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">仓库</label>
              <Input
                value={formData.warehouse}
                onChange={(e) => setFormData({ ...formData, warehouse: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">规格 *</label>
              <Input
                value={formData.spec}
                onChange={(e) => setFormData({ ...formData, spec: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">如：600ml×15</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">发票名称 *</label>
              <Input
                value={formData.invoice_name}
                onChange={(e) => setFormData({ ...formData, invoice_name: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">根据品牌映射自动填充，请检查是否正确</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit}>
              {editingProduct ? "更新" : "添加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>批量导入商品</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">粘贴导入内容（每行一条，Tab分隔）</label>
              <Textarea
                placeholder="格式示例：&#10;SKU	商品名称	仓库"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                rows={10}
                className="font-mono"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              每行以 Tab 分隔，取前 3 列：SKU、商品名称、仓库。规格和发票名称自动匹配。重复 SKU 将被覆盖更新。
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