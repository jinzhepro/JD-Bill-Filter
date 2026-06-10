"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_COMPANY_INFO } from "@/lib/constants";
import {
  Eye,
  FileDown,
  Trash2,
  RefreshCw,
  Copy,
  AlertTriangle,
} from "lucide-react";
import { exportInvoice } from "@/lib/invoiceExporter";
import { getCurrentMonth } from "@/lib/utils";

const ThWithCopy = ({ items, columnKey, columnName, onCopy }) => (
  <th className="border border-border px-3 py-2 text-left">
    <div className="flex items-center gap-1">
      <span>{columnName}</span>
      <button
        onClick={() => onCopy(items, columnKey, columnName)}
        className="cursor-pointer p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
        title={`复制${columnName}列`}
      >
        <Copy className="w-3 h-3" />
      </button>
    </div>
  </th>
);

export function InvoiceHistoryManager() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [totalRecordCount, setTotalRecordCount] = useState(0);
  const { toast } = useToast();

  const monthOptions = useMemo(() => {
    const current = getCurrentMonth();
    const [currentYear, currentMonthNum] = current.split("-").map(Number);
    const options = [];
    for (let year = 2024; year <= currentYear; year++) {
      const endMonth = year === currentYear ? currentMonthNum : 12;
      for (let m = 1; m <= endMonth; m++) {
        options.push(`${year}-${String(m).padStart(2, "0")}`);
      }
    }
    return options.reverse();
  }, []);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/invoice-history?month=${selectedMonth}`);
      const data = await res.json();

      if (data.success) {
        setHistory(data.data || []);
      } else {
        toast({ title: data.error, variant: "destructive" });
      }
    } catch (error) {
      console.error("操作失败:", error);
      toast({ title: "获取历史数据失败", variant: "destructive" });
    }
    setLoading(false);
  }, [selectedMonth, toast]);

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
        ...DEFAULT_COMPANY_INFO,
        applyDate: history.export_date,
      };

      const customerInfo = {
        customerName: history.customer_name,
        taxId: history.tax_id,
        bankName: history.bank_name || "",
        bankAccount: history.bank_account || "",
        address: history.address || "",
        phone: history.phone || "",
      };

      const lineItems = history.items.map((item) => ({
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
      console.error("操作失败:", error);
      toast({ title: `导出失败: ${error.message}`, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async (history) => {
    if (!confirm("确定删除此历史记录？")) return;

    try {
      const res = await fetch(`/api/invoice-history/${history.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.success) {
        toast({ title: "删除成功" });
        fetchHistory();
      } else {
        toast({ title: data.error, variant: "destructive" });
      }
    } catch (error) {
      console.error("操作失败:", error);
      toast({ title: "删除失败", variant: "destructive" });
    }
  };

  const handleUpdateNames = async () => {
    setUpdating(true);
    try {
      const res = await fetch("/api/invoice-history/update-names", {
        method: "POST",
      });
      const data = await res.json();

      if (data.success) {
        toast({ title: `成功更新 ${data.updatedCount} 条记录的发票名称` });
        fetchHistory();
      } else {
        toast({ title: data.error, variant: "destructive" });
      }
    } catch (error) {
      console.error("操作失败:", error);
      toast({ title: "更新发票名称失败", variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  const handleOpenClearConfirm = async () => {
    // 查询所有月份记录的总数
    try {
      const res = await fetch("/api/invoice-history/clear-all");
      const data = await res.json();
      if (data.success) {
        setTotalRecordCount(data.totalCount);
      } else {
        setTotalRecordCount(0);
      }
    } catch {
      setTotalRecordCount(0);
    }
    setClearConfirmOpen(true);
  };

  const handleClearAll = async () => {
    setClearingAll(true);
    try {
      const res = await fetch("/api/invoice-history/clear-all", {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.success) {
        toast({ title: `已清空所有发票历史（共 ${data.deletedCount} 条）` });
        setClearConfirmOpen(false);
        fetchHistory();
      } else {
        toast({ title: data.error, variant: "destructive" });
      }
    } catch (error) {
      console.error("操作失败:", error);
      toast({ title: "清空失败", variant: "destructive" });
    } finally {
      setClearingAll(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return dateStr;
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency: "CNY",
    }).format(amount || 0);
  };

  const copyColumn = async (items, columnKey, columnName) => {
    const values = items
      .map((item) => {
        if (columnKey === "price") {
          return ((item.quantity || 0) * (item.price || 0)).toFixed(2);
        } else if (columnKey === "quantity") {
          return item.quantity || 0;
        } else {
          return item[columnKey] || "";
        }
      })
      .join("\n");

    try {
      await navigator.clipboard.writeText(values);
      toast({ title: `${columnName} 已复制` });
    } catch (error) {
      console.error("操作失败:", error);
      toast({ title: "复制失败", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium whitespace-nowrap">
            选择月份
          </label>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((month) => (
                <SelectItem key={month} value={month}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={handleOpenClearConfirm}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            清空所有
          </Button>
          <Button
            variant="outline"
            onClick={handleUpdateNames}
            disabled={updating}
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${updating ? "animate-spin" : ""}`}
            />
            {updating ? "更新中..." : "更新发票名称"}
          </Button>
        </div>
      </div>

      {/* 清空确认对话框 */}
      <Dialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              确认清空所有发票历史
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              此操作将删除 <strong>所有月份</strong> 的发票历史记录（共{" "}
              <strong>{totalRecordCount}</strong> 条），包括对应的开票明细数据。
            </p>
            <p className="text-destructive font-medium mt-2">
              此操作不可撤销，请谨慎操作。
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setClearConfirmOpen(false)}
              disabled={clearingAll}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearAll}
              disabled={clearingAll}
            >
              {clearingAll ? "清空中..." : "确认清空"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>
            {selectedMonth} 发票历史 ({history.length}条)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-center py-4">加载中...</p>
          ) : history.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">暂无数据</p>
          ) : (
            <div className="space-y-2">
              {history.map((h) => (
                <div
                  key={h.id}
                  className="border border-border rounded-lg p-3 flex justify-between items-center"
                >
                  <div className="flex-1">
                    <div className="font-medium">{h.customer_name}</div>
                    <div className="text-sm text-muted-foreground">
                      发票日期: {formatDate(h.invoice_date)} | {h.items_count}{" "}
                      项 | 总金额: {formatAmount(h.total_amount)}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewDetail(h)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReExport(h)}
                  >
                    <FileDown className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(h)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>发票详情</DialogTitle>
          </DialogHeader>
          {selectedHistory && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    客户名称
                  </label>
                  <div className="font-medium">
                    {selectedHistory.customer_name}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    纳税人识别号
                  </label>
                  <div className="font-medium">{selectedHistory.tax_id}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    发票日期
                  </label>
                  <div>{formatDate(selectedHistory.invoice_date)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    导出日期
                  </label>
                  <div>{formatDate(selectedHistory.export_date)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    总金额
                  </label>
                  <div className="font-medium">
                    {formatAmount(selectedHistory.total_amount)}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    明细数量
                  </label>
                  <div>{selectedHistory.items_count} 项</div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">开票明细</h4>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-muted">
                        <th className="border border-border px-3 py-2 text-center w-12">
                          序号
                        </th>
                        <ThWithCopy
                          items={selectedHistory.items}
                          columnKey="nameSku"
                          columnName="商品名称"
                          onCopy={copyColumn}
                        />
                        <ThWithCopy
                          items={selectedHistory.items}
                          columnKey="name"
                          columnName="发票名称"
                          onCopy={copyColumn}
                        />
                        <ThWithCopy
                          items={selectedHistory.items}
                          columnKey="spec"
                          columnName="规格"
                          onCopy={copyColumn}
                        />
                        <ThWithCopy
                          items={selectedHistory.items}
                          columnKey="quantity"
                          columnName="数量"
                          onCopy={copyColumn}
                        />
                        <ThWithCopy
                          items={selectedHistory.items}
                          columnKey="price"
                          columnName="金额(含税)"
                          onCopy={copyColumn}
                        />
                      </tr>
                    </thead>
                    <tbody>
                      {selectedHistory.items &&
                        selectedHistory.items.map((item, index) => (
                          <tr key={index}>
                            <td className="border border-border px-3 py-2 text-center text-muted-foreground">
                              {index + 1}
                            </td>
                            <td className="border border-border px-3 py-2">
                              {item.nameSku || "-"}
                            </td>
                            <td className="border border-border px-3 py-2">
                              {item.name}
                            </td>
                            <td className="border border-border px-3 py-2">
                              {item.spec || "-"}
                            </td>
                            <td className="border border-border px-3 py-2 text-right">
                              {item.quantity}
                            </td>
                            <td className="border border-border px-3 py-2 text-right">
                              {formatAmount(item.quantity * item.price)}
                            </td>
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
            <Button
              onClick={() => handleReExport(selectedHistory)}
              disabled={exporting}
            >
              <FileDown className="w-4 h-4 mr-2" />
              {exporting ? "导出中..." : "重新导出"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
