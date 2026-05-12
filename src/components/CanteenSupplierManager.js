"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, Search } from "lucide-react";

export function CanteenSupplierManager() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    contract_no: ""
  });
  const { toast } = useToast();

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search });
      const res = await fetch(`/api/canteen-suppliers?${params}`);
      const data = await res.json();
      
      if (data.success) {
        setSuppliers(data.data);
      } else {
        toast({ title: data.error, variant: "destructive" });
      }
    } catch (error) {
      console.error('操作失败:', error);
      toast({ title: "获取数据失败", variant: "destructive" });
    }
    setLoading(false);
  }, [search, toast]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleSearch = () => {
    fetchSuppliers();
  };

  const handleAdd = () => {
    setEditingSupplier(null);
    setFormData({
      name: "",
      contract_no: ""
    });
    setModalOpen(true);
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contract_no: supplier.contract_no || ""
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("确定删除此供应商？")) return;
    
    try {
      const res = await fetch(`/api/canteen-suppliers?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      
      if (data.success) {
        toast({ title: "删除成功" });
        fetchSuppliers();
      } else {
        toast({ title: data.error, variant: "destructive" });
      }
    } catch (error) {
      console.error('操作失败:', error);
      toast({ title: "删除失败", variant: "destructive" });
    }
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      toast({ title: "供应商名称必填", variant: "destructive" });
      return;
    }

    try {
      const url = "/api/canteen-suppliers";
      const method = editingSupplier ? "PUT" : "POST";
      const body = editingSupplier 
        ? { id: editingSupplier.id, ...formData }
        : formData;
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast({ title: editingSupplier ? "更新成功" : "添加成功" });
        setModalOpen(false);
        fetchSuppliers();
      } else {
        toast({ title: data.error, variant: "destructive" });
      }
    } catch (error) {
      console.error('操作失败:', error);
      toast({ title: "操作失败", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>食堂供应商管理</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="搜索供应商名称或合同号..."
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
                  <th className="border border-border px-3 py-2 text-left">供应商名称</th>
                  <th className="border border-border px-3 py-2 text-left">合同号</th>
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
                ) : suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="border border-border px-3 py-4 text-center text-muted-foreground">
                      暂无数据
                    </td>
                  </tr>
                ) : (
                  suppliers.map((supplier) => (
                    <tr key={supplier.id}>
                      <td className="border border-border px-3 py-2">{supplier.name}</td>
                      <td className="border border-border px-3 py-2">{supplier.contract_no || ''}</td>
                      <td className="border border-border px-3 py-2 text-center">
                        <div className="flex gap-1 justify-center">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(supplier)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(supplier.id)}>
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
            <DialogTitle>{editingSupplier ? "编辑供应商" : "添加供应商"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">供应商名称 *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="请输入供应商名称"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">合同号</label>
              <Input
                value={formData.contract_no}
                onChange={(e) => setFormData({ ...formData, contract_no: e.target.value })}
                placeholder="请输入合同号（选填）"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit}>
              {editingSupplier ? "更新" : "添加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}