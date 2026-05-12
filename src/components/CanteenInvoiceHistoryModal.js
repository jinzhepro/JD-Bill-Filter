"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";

export function CanteenInvoiceHistoryModal({ open, onOpenChange }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0, pageSize: 20 });
  const { toast } = useToast();

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, pageSize: pagination.pageSize });
      const res = await fetch(`/api/canteen-invoice-history?${params}`);
      const data = await res.json();

      if (data.success) {
        setHistory(data.data);
        setPagination(data.pagination);
      } else {
        toast({ title: data.error, variant: "destructive" });
      }
    } catch (error) {
      console.error('获取历史记录失败:', error);
      toast({ title: "获取历史记录失败", variant: "destructive" });
    }
    setLoading(false);
  }, [page, pagination.pageSize, toast]);

  useEffect(() => {
    if (open) {
      fetchHistory();
    }
  }, [open, fetchHistory]);

  const handleDelete = async (id) => {
    if (!confirm("确定删除此开票记录？")) return;

    try {
      const res = await fetch(`/api/canteen-invoice-history/${id}`, { method: "DELETE" });
      const data = await res.json();

      if (data.success) {
        toast({ title: "删除成功" });
        fetchHistory();
      } else {
        toast({ title: data.error, variant: "destructive" });
      }
    } catch (error) {
      console.error('删除失败:', error);
      toast({ title: "删除失败", variant: "destructive" });
    }
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency: "CNY",
    }).format(amount || 0);
  };

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>食堂开票历史记录</DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="text-muted-foreground text-center py-4">加载中...</p>
        ) : history.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">暂无历史记录</p>
        ) : (
          <div className="space-y-4">
            {history.map((record) => (
              <div key={record.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-medium">{record.canteen_name || "未指定食堂"}</p>
                    <p className="text-sm text-muted-foreground">
                      客户：{record.customer_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      导出时间：{formatDateTime(record.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">
                      合计：{formatAmount(record.total_amount)}
                    </p>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(record.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-muted">
                        <th className="border px-2 py-1 text-left">商品名称</th>
                        <th className="border px-2 py-1 text-center">规格</th>
                        <th className="border px-2 py-1 text-center">单位</th>
                        <th className="border px-2 py-1 text-right">数量</th>
                        <th className="border px-2 py-1 text-right">单价</th>
                        <th className="border px-2 py-1 text-right">税率</th>
                        <th className="border px-2 py-1 text-right">金额</th>
                      </tr>
                    </thead>
                    <tbody>
                      {record.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="border px-2 py-1">{item.name}</td>
                          <td className="border px-2 py-1 text-center">{item.spec || ""}</td>
                          <td className="border px-2 py-1 text-center">{item.unit || ""}</td>
                          <td className="border px-2 py-1 text-right">{item.quantity}</td>
                          <td className="border px-2 py-1 text-right">{formatAmount(item.price)}</td>
                          <td className="border px-2 py-1 text-right">
                            {(item.tax_rate * 100).toFixed(0)}%
                          </td>
                          <td className="border px-2 py-1 text-right">{formatAmount(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

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
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}