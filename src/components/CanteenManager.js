"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, Search, ChevronLeft, ChevronRight } from "lucide-react";

export function CanteenManager() {
  const [canteens, setCanteens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0, pageSize: 50 });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCanteen, setEditingCanteen] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    location: ""
  });
  const { toast } = useToast();

  const fetchCanteens = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search, page, pageSize: pagination.pageSize });
      const res = await fetch(`/api/canteens?${params}`);
      const data = await res.json();
      
      if (data.success) {
        setCanteens(data.data);
        setPagination(data.pagination);
      } else {
        toast({ title: data.error, variant: "destructive" });
      }
    } catch (error) {
      console.error('操作失败:', error);
      toast({ title: "获取数据失败", variant: "destructive" });
    }
    setLoading(false);
  }, [search, page, pagination.pageSize, toast]);

  useEffect(() => {
    fetchCanteens();
  }, [fetchCanteens]);

  const handleSearch = () => {
    setPage(1);
    fetchCanteens();
  };

  const handleAdd = () => {
    setEditingCanteen(null);
    setFormData({
      name: "",
      location: ""
    });
    setModalOpen(true);
  };

  const handleEdit = (canteen) => {
    setEditingCanteen(canteen);
    setFormData({
      name: canteen.name,
      location: canteen.location || ""
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("确定删除此食堂？")) return;
    
    try {
      const res = await fetch(`/api/canteens/${id}`, { method: "DELETE" });
      const data = await res.json();
      
      if (data.success) {
        toast({ title: "删除成功" });
        fetchCanteens();
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
      toast({ title: "食堂名称必填", variant: "destructive" });
      return;
    }

    try {
      const url = editingCanteen ? `/api/canteens/${editingCanteen.id}` : "/api/canteens";
      const method = editingCanteen ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast({ title: editingCanteen ? "更新成功" : "添加成功" });
        setModalOpen(false);
        fetchCanteens();
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
          <CardTitle>食堂列表</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="搜索食堂名称或位置..."
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
              添加食堂
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted">
                  <th className="border border-border px-3 py-2 text-left">食堂名称</th>
                  <th className="border border-border px-3 py-2 text-left">位置</th>
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
                ) : canteens.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="border border-border px-3 py-4 text-center text-muted-foreground">
                      暂无数据
                    </td>
                  </tr>
                ) : (
                  canteens.map((canteen) => (
                    <tr key={canteen.id}>
                      <td className="border border-border px-3 py-2">{canteen.name}</td>
                      <td className="border border-border px-3 py-2">{canteen.location || '-'}</td>
                      <td className="border border-border px-3 py-2 text-center">
                        <div className="flex gap-1 justify-center">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(canteen)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(canteen.id)}>
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
            <DialogTitle>{editingCanteen ? "编辑食堂" : "添加食堂"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">食堂名称 *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="请输入食堂名称"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">位置</label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="请输入位置（可选）"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit}>
              {editingCanteen ? "更新" : "添加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}