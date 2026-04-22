"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Eye, FileDown, Trash2 } from "lucide-react";
import { exportInvoice } from "@/lib/invoiceExporter";

export function InvoiceHistoryManager() {
  const [currentMonthHistory, setCurrentMonthHistory] = useState([]);
  const [otherMonthHistory, setOtherMonthHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  const currentMonth = new Date().toISOString().slice(0, 7);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/invoice-history");
      const data = await res.json();

      if (data.success) {
        const all = data.data || [];
        const current = all.filter(h => h.invoice_date && h.invoice_date.startsWith(currentMonth));
        const other = all.filter(h => h.invoice_date && !h.invoice_date.startsWith(currentMonth));
        setCurrentMonthHistory(current);
        setOtherMonthHistory(other);
      } else {
        toast({ title: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "获取历史数据失败", variant: "destructive" });
    }
    setLoading(false);
  }, [currentMonth, toast]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleViewDetail = (history) => {
    setSelectedHistory(history);
    setDetailModalOpen(true);
  };

  const handleReExport = async (history) => {
    setExporting(true);
    try {
      const basicInfo = {
        companyName: "青岛青云通公共服务有限公司",
        contractNo: "JK-GQ-250117",
        applyDate: history.export_date,
        department: "青云通",
        applicant: "付冰清",
      };

      const customerInfo = {
        customerName: history.customer_name,
        taxId: history.tax_id,
        bankName: history.bank_name || "",
        bankAccount: history.bank_account || "",
        address: history.address || "",
        phone: history.phone || "",
      };

      const lineItems = history.items.map(item => ({
        sku: item.sku || "",
        name: item.name,
        spec: item.spec || "",
        unit: "箱",
        quantity: item.quantity,
        price: item.price,
        taxRate: 0.13,
      }));

      await exportInvoice(basicInfo, customerInfo, lineItems);
      toast({ title: "发票重新导出成功" });
    } catch (error) {
      toast({ title: `导出失败: ${error.message}`, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async (history) => {
    if (!confirm("确定删除此历史记录？")) return;
    
    try {
      const res = await fetch(`/api/invoice-history/${history.id}`, { method: "DELETE" });
      const data = await res.json();
      
      if (data.success) {
        toast({ title: "删除成功" });
        fetchHistory();
      } else {
        toast({ title: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "删除失败", variant: "destructive" });
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return dateStr;
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(amount || 0);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>当前月份 ({currentMonth})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-center py-4">加载中...</p>
          ) : currentMonthHistory.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">暂无数据</p>
          ) : (
            <div className="space-y-2">
              {currentMonthHistory.map((history) => (
                <div key={history.id} className="border border-border rounded-lg p-3 flex justify-between items-center">
                  <div className="flex-1">
                    <div className="font-medium">{history.customer_name}</div>
                    <div className="text-sm text-muted-foreground">
                      发票日期: {formatDate(history.invoice_date)} | {history.items_count} 项 | 总金额: {formatAmount(history.total_amount)}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleViewDetail(history)}>
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleReExport(history)}>
                    <FileDown className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(history)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>其他月份 ({otherMonthHistory.length}条)</CardTitle>
        </CardHeader>
        <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-center py-4">加载中...</p>
            ) : otherMonthHistory.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">暂无数据</p>
            ) : (
              <div className="space-y-2">
                {otherMonthHistory.map((history) => (
                  <div key={history.id} className="border border-border rounded-lg p-3 flex justify-between items-center">
                    <div className="flex-1">
                      <div className="font-medium">{history.customer_name}</div>
                      <div className="text-sm text-muted-foreground">
                        发票日期: {formatDate(history.invoice_date)} | {history.items_count} 项 | 总金额: {formatAmount(history.total_amount)}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleViewDetail(history)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleReExport(history)}>
                      <FileDown className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(history)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
      </Card>

      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>发票详情</DialogTitle>
          </DialogHeader>
          {selectedHistory && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">客户名称</label>
                  <div className="font-medium">{selectedHistory.customer_name}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">纳税人识别号</label>
                  <div className="font-medium">{selectedHistory.tax_id}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">发票日期</label>
                  <div>{formatDate(selectedHistory.invoice_date)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">导出日期</label>
                  <div>{formatDate(selectedHistory.export_date)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">总金额</label>
                  <div className="font-medium">{formatAmount(selectedHistory.total_amount)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">明细数量</label>
                  <div>{selectedHistory.items_count} 项</div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">开票明细</h4>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-muted">
                        <th className="border border-border px-3 py-2 text-left">SKU</th>
                        <th className="border border-border px-3 py-2 text-left">商品名称</th>
                        <th className="border border-border px-3 py-2 text-left">规格</th>
                        <th className="border border-border px-3 py-2 text-right">数量</th>
                        <th className="border border-border px-3 py-2 text-right">单价</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedHistory.items && selectedHistory.items.map((item, index) => (
                        <tr key={index}>
                          <td className="border border-border px-3 py-2">{item.sku || "-"}</td>
                          <td className="border border-border px-3 py-2">{item.name}</td>
                          <td className="border border-border px-3 py-2">{item.spec || "-"}</td>
                          <td className="border border-border px-3 py-2 text-right">{item.quantity}</td>
                          <td className="border border-border px-3 py-2 text-right">{formatAmount(item.price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailModalOpen(false)}>
              关闭
            </Button>
            <Button onClick={() => handleReExport(selectedHistory)} disabled={exporting}>
              <FileDown className="w-4 h-4 mr-2" />
              {exporting ? "导出中..." : "重新导出"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}