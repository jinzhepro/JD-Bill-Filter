"use client";

import { CanteenLayout } from "@/components/CanteenLayout";
import { CanteenInvoiceModal } from "@/components/CanteenInvoiceModal";
import { HuanyuInvoiceModal } from "@/components/HuanyuInvoiceModal";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FileSpreadsheet, Trash2, ChevronLeft, ChevronRight, Copy, ChevronDown, ChevronUp, Download } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { exportInvoice } from "@/lib/invoiceExporter";

export default function CanteenInvoicePage() {
  const [products, setProducts] = useState([]);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [huanyuModalOpen, setHuanyuModalOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0, pageSize: 20 });
  const [expandedRecords, setExpandedRecords] = useState({});
  const { toast } = useToast();

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/canteen-purchase-orders");
      const data = await res.json();
      if (data.success) {
        setProducts(data.data);
      } else {
        toast({ title: data.error, variant: "destructive" });
      }
    } catch (error) {
      console.error("获取数据失败:", error);
      toast({ title: "获取数据失败", variant: "destructive" });
    }
  }, [toast]);

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
      console.error("获取历史记录失败:", error);
      toast({ title: "获取历史记录失败", variant: "destructive" });
    }
    setLoading(false);
  }, [page, pagination.pageSize, toast]);

  useEffect(() => {
    fetchProducts();
    fetchHistory();
  }, [fetchProducts, fetchHistory]);

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
      console.error("删除失败:", error);
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
      timeZone: "Asia/Shanghai",
    });
  };

  const copyColumn = async (items, columnKey, columnName) => {
    const values = items.map(item => {
      if (columnKey === 'tax_rate') {
        return item[columnKey] ? `${(item[columnKey] * 100).toFixed(0)}` : '0';
      }
      if (columnKey === 'price' || columnKey === 'total') {
        return item[columnKey] || 0;
      }
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
    <th className={`border px-2 py-1 ${className}`}>
      <div className="flex items-center gap-1 justify-center">
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

  const toggleExpand = (id) => {
    setExpandedRecords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleReExport = async (record) => {
    try {
      const basicInfo = {
        companyName: "青岛青云通公共服务有限公司",
        contractNo: record.contract_no || "JK-GQ-250041-32",
        applyDate: new Date().toISOString().split("T")[0],
        department: "青云通",
        applicant: "刘雅超",
      };

      const customerInfo = {
        customerName: record.customer_name,
        taxId: record.tax_id,
        bankName: record.bank_name,
        bankAccount: record.bank_account,
        address: record.address,
        phone: record.phone,
      };

      const items = record.items.map(item => ({
        name: item.name,
        spec: item.spec,
        unit: item.unit,
        quantity: item.quantity,
        price: item.price,
        taxRate: item.tax_rate,
      }));

      const remark = record.canteen_name?.includes("-") ? "" : record.canteen_name;
      await exportInvoice(basicInfo, customerInfo, items, record.canteen_name, true, "专票", remark);
      toast({ title: "发票重新导出成功" });
    } catch (error) {
      console.error('导出失败:', error);
      toast({ title: "导出失败", variant: "destructive" });
    }
  };

  return (
    <CanteenLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                开发票
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setHuanyuModalOpen(true)} variant="outline">
                  寰宇开票
                </Button>
                <Button onClick={() => setInvoiceModalOpen(true)}>
                  开始开票
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              粘贴品名数据，自动匹配食堂采购单中的商品，导出发票申请表
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              开票记录
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-center py-4">加载中...</p>
            ) : history.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">暂无历史记录</p>
            ) : (
              <div className="space-y-4">
                {history.map((record) => (
                  <div key={record.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleExpand(record.id)}>
                          {expandedRecords[record.id] ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                          <p className="font-medium">{record.canteen_name || "未指定食堂"}</p>
                        </div>
                        <p className="text-sm text-muted-foreground ml-6">
                          客户：{record.customer_name} | 导出时间：{formatDateTime(record.created_at)}
                        </p>
                        <p className="text-sm font-medium ml-6">
                          合计：{formatAmount(record.total_amount)} ({record.items.length}条)
                        </p>
                        {record.contract_no && (
                          <p className="text-sm text-muted-foreground ml-6 flex items-center gap-1">
                            合同号：{record.contract_no}
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(record.contract_no);
                                toast({ title: "合同号已复制" });
                              }}
                              className="cursor-pointer p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                              title="复制合同号"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleReExport(record)} title="再次导出">
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(record.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    {expandedRecords[record.id] && (
                      <div className="overflow-x-auto mt-3">
                        <table className="w-full border-collapse text-sm">
                          <thead>
                            <tr className="bg-muted">
                              <th className="border px-2 py-1 text-center w-10">序号</th>
                              <ThWithCopy items={record.items} columnKey="name" columnName="商品名称" className="text-left" />
                              <ThWithCopy items={record.items} columnKey="unit" columnName="单位" className="text-center" />
                              <ThWithCopy items={record.items} columnKey="quantity" columnName="数量" className="text-right" />
                              <ThWithCopy items={record.items} columnKey="price" columnName="单价" className="text-right" />
                              <ThWithCopy items={record.items} columnKey="tax_rate" columnName="税率" className="text-right" />
                              <ThWithCopy items={record.items} columnKey="total" columnName="金额" className="text-right" />
                            </tr>
                          </thead>
                          <tbody>
                            {record.items.map((item, idx) => (
                              <tr key={idx}>
                                <td className="border px-2 py-1 text-center text-muted-foreground text-xs">{idx + 1}</td>
                                <td className="border px-2 py-1">{item.name}</td>
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
                    )}
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
          </CardContent>
        </Card>

        <CanteenInvoiceModal
          open={invoiceModalOpen}
          onOpenChange={(open) => {
            setInvoiceModalOpen(open);
            if (!open) fetchHistory();
          }}
          products={products}
        />

        <HuanyuInvoiceModal
          open={huanyuModalOpen}
          onOpenChange={(open) => {
            setHuanyuModalOpen(open);
            if (!open) fetchHistory();
          }}
          products={products}
        />
      </div>
    </CanteenLayout>
  );
}