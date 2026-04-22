"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, Search, ChevronLeft, ChevronRight } from "lucide-react";

export function BrandManager() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0, pageSize: 20 });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [formData, setFormData] = useState({
    brand_keywords: "",
    invoice_name: ""
  });
  const { toast } = useToast();

  const fetchBrands = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search, page, pageSize: pagination.pageSize });
      const res = await fetch(`/api/brand-mappings?${params}`);
      const data = await res.json();
      
      if (data.success) {
        setBrands(data.data);
        setPagination(data.pagination);
      } else {
        toast({ title: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "获取数据失败", variant: "destructive" });
    }
    setLoading(false);
  }, [search, page, pagination.pageSize, toast]);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  const handleSearch = () => {
    setPage(1);
    fetchBrands();
  };

  const handleAdd = () => {
    setEditingBrand(null);
    setFormData({
      brand_keywords: "",
      invoice_name: ""
    });
    setModalOpen(true);
  };

  const handleEdit = (brand) => {
    setEditingBrand(brand);
    setFormData({
      brand_keywords: brand.brand_keywords,
      invoice_name: brand.invoice_name
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("确定删除此品牌映射？")) return;
    
    try {
      const res = await fetch(`/api/brand-mappings/${id}`, { method: "DELETE" });
      const data = await res.json();
      
      if (data.success) {
        toast({ title: "删除成功" });
        fetchBrands();
      } else {
        toast({ title: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "删除失败", variant: "destructive" });
    }
  };

  const handleSubmit = async () => {
    if (!formData.brand_keywords || !formData.invoice_name) {
      toast({ title: "品牌关键词、发票名称必填", variant: "destructive" });
      return;
    }

    try {
      const url = editingBrand ? `/api/brand-mappings/${editingBrand.id}` : "/api/brand-mappings";
      const method = editingBrand ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast({ title: editingBrand ? "更新成功" : "添加成功" });
        setModalOpen(false);
        fetchBrands();
      } else {
        toast({ title: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "操作失败", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>品牌关键词 → 发票名称映射</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="搜索关键词或发票名称..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
            <Button variant="outline" onClick={handleSearch}>
              <Search className="w-4 h-4 mr-1" />
              搜索
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
                  <th className="border border-border px-3 py-2 text-left">品牌关键词</th>
                  <th className="border border-border px-3 py-2 text-left">发票名称</th>
                  <th className="border border-border px-3 py-2 text-center w-20">操作</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={3} className="border border-border px-3 py-4 text-center text-muted-foreground">
                      加载中...
                    </td>
                  </tr>
                ) : brands.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="border border-border px-3 py-4 text-center text-muted-foreground">
                      暂无数据
                    </td>
                  </tr>
                ) : (
                  brands.map((brand) => (
                    <tr key={brand.id}>
                      <td className="border border-border px-3 py-2">{brand.brand_keywords}</td>
                      <td className="border border-border px-3 py-2">{brand.invoice_name}</td>
                      <td className="border border-border px-3 py-2 text-center">
                        <div className="flex gap-1 justify-center">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(brand)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(brand.id)}>
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

          {pagination.totalPages > 1 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                共 {pagination.total} 条，第 {page}/{pagination.totalPages} 页
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingBrand ? "编辑品牌映射" : "添加品牌映射"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">品牌关键词 *</label>
              <Input
                value={formData.brand_keywords}
                onChange={(e) => setFormData({ ...formData, brand_keywords: e.target.value })}
                placeholder="多个关键词用逗号分隔，如：可口可乐,雪碧,美汁源"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">发票名称 *</label>
              <Input
                value={formData.invoice_name}
                onChange={(e) => setFormData({ ...formData, invoice_name: e.target.value })}
                placeholder="如：*软饮料*可口可乐"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit}>
              {editingBrand ? "更新" : "添加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}