"use client";

import React, { useState, useMemo } from "react";
import { useInvoice } from "@/context/InvoiceContext";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { InvoiceLineItems } from "./InvoiceLineItems";
import { InvoiceImportModal } from "./InvoiceImportModal";
import { exportInvoice } from "@/lib/invoiceExporter";
import { useToast } from "@/hooks/use-toast";
import { FileDown, FileText } from "lucide-react";
import {
  getCurrentMonth,
  calculateRowAmount,
  groupItemsByMonth,
} from "@/lib/utils";
import Decimal from "decimal.js";
import logger from "@/lib/logger";

export function InvoiceForm() {
  const {
    basicInfo,
    customerInfo,
    lineItems,
    invoiceDate,
    invoiceType,
    expectedAmount,
    setBasicInfo,
    setCustomerInfo,
    clearLineItems,
    addLineItems,
    setInvoiceDate,
    setInvoiceType,
    setExpectedAmount,
  } = useInvoice();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const lineItemsTotal = useMemo(() => {
    if (lineItems.length === 0) return null;
    return lineItems.reduce((sum, item) => {
      if (item.total !== undefined) {
        return sum.plus(new Decimal(item.total));
      }
      return sum.plus(
        new Decimal(item.quantity || 0).times(new Decimal(item.price || 0)),
      );
    }, new Decimal(0));
  }, [lineItems]);

  const amountMatch = useMemo(() => {
    if (!expectedAmount || lineItemsTotal === null) return null;
    const expected = new Decimal(expectedAmount);
    return lineItemsTotal.equals(expected);
  }, [expectedAmount, lineItemsTotal]);

  const handleBasicChange = (field, value) => {
    setBasicInfo({ [field]: value });
  };

  const handleCustomerChange = (field, value) => {
    setCustomerInfo({ [field]: value });
  };

  const handleImport = (items) => {
    addLineItems(items);
    toast({ title: `成功导入 ${items.length} 条数据` });
  };

  const validateInvoice = () => {
    if (!basicInfo.companyName || !basicInfo.contractNo) {
      return "请填写公司名称和合同号";
    }
    if (!customerInfo.customerName || !customerInfo.taxId) {
      return "请填写客户名称和纳税人识别号";
    }
    if (lineItems.length === 0) {
      return "请添加开票内容明细";
    }

    const unmatchedIndex = lineItems.findIndex((item) => item.unmatched);
    if (unmatchedIndex !== -1) {
      return `第 ${unmatchedIndex + 1} 行 SKU 未匹配到商品，请在商品管理中完善映射后重新导入`;
    }

    const incompleteIndex = lineItems.findIndex(
      (item) =>
        !item.name ||
        !item.spec ||
        !item.unit ||
        !item.quantity ||
        !item.price ||
        item.quantity <= 0 ||
        item.price <= 0 ||
        item.name === "其他",
    );
    if (incompleteIndex !== -1) {
      const item = lineItems[incompleteIndex];
      const reason = item.name === "其他" ? "商品未匹配品牌规则" : "信息不完整";
      return `第 ${incompleteIndex + 1} 行${reason}，请检查`;
    }
    return null;
  };

  const saveInvoiceHistory = async (
    monthItems,
    invoiceDateForHistory,
    totalAmount,
  ) => {
    const itemsWithCalculations = monthItems.map((item) => ({
      ...item,
      ...calculateRowAmount(item),
    }));

    try {
      const res = await fetch("/api/invoice-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceDate: invoiceDateForHistory,
          customerInfo,
          items: itemsWithCalculations,
          totalAmount,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        logger.error("保存历史失败:", data.error);
      }
    } catch (error) {
      logger.error("保存历史失败:", error);
    }
  };

  const handleExport = async () => {
    const error = validateInvoice();
    if (error) {
      toast({ title: error, variant: "destructive" });
      return;
    }

    setIsExporting(true);

    try {
      const currentMonth = getCurrentMonth();
      const groupedByMonth = groupItemsByMonth(lineItems);
      const months = Object.keys(groupedByMonth).sort((a, b) => {
        if (a === currentMonth) return -1;
        if (b === currentMonth) return 1;
        return 0;
      });

      const exportedMonths = [];

      for (const monthKey of months) {
        const monthItems = groupedByMonth[monthKey];
        const isCurrentMonth = monthKey === currentMonth;

        await exportInvoice(
          basicInfo,
          customerInfo,
          monthItems,
          isCurrentMonth ? currentMonth : null,
          false,
          invoiceType,
        );
        exportedMonths.push(isCurrentMonth ? currentMonth : "其他月");

        const totalAmount = monthItems.reduce(
          (sum, item) =>
            sum +
            (item.total !== undefined
              ? new Decimal(item.total)
              : new Decimal(item.quantity).times(item.price)
            ).toNumber(),
          0,
        );

        const invoiceDateForHistory = isCurrentMonth
          ? `${currentMonth}-01`
          : monthItems[0]?.date || new Date().toISOString().split("T")[0];

        await saveInvoiceHistory(
          monthItems,
          invoiceDateForHistory,
          totalAmount,
        );
      }

      // 导出成功后清空客户信息、开票内容、发票日期等
      setCustomerInfo({
        customerName: "",
        taxId: "",
        bankName: "",
        bankAccount: "",
        address: "",
        phone: "",
      });
      clearLineItems();
      setInvoiceDate("");
      setInvoiceType("专票");
      setExpectedAmount("");

      toast({
        title:
          months.length === 1
            ? "发票导出成功"
            : `导出完成：已生成 ${months.length} 个文件（${exportedMonths.join("、")}）`,
      });
    } catch (error) {
      toast({ title: `导出失败: ${error.message}`, variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleReset = () => {
    clearLineItems();
    toast({ title: "开票内容已清空" });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">公司名称 *</label>
              <Input
                value={basicInfo.companyName}
                onChange={(e) =>
                  handleBasicChange("companyName", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">合同号 *</label>
              <Input
                value={basicInfo.contractNo}
                onChange={(e) =>
                  handleBasicChange("contractNo", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">申请日期 *</label>
              <Input
                type="date"
                value={basicInfo.applyDate}
                onChange={(e) => handleBasicChange("applyDate", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">申请部门</label>
              <Input
                value={basicInfo.department}
                onChange={(e) =>
                  handleBasicChange("department", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">申请人</label>
              <Input
                value={basicInfo.applicant}
                onChange={(e) => handleBasicChange("applicant", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>客户信息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2 md:col-span-4">
              <label className="text-sm font-medium">
                客户名称（公司全称） *
              </label>
              <Input
                value={customerInfo.customerName}
                onChange={(e) =>
                  handleCustomerChange("customerName", e.target.value)
                }
              />
            </div>
            <div className="space-y-2 md:col-span-4">
              <label className="text-sm font-medium">纳税人识别号 *</label>
              <Input
                value={customerInfo.taxId}
                onChange={(e) => handleCustomerChange("taxId", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">开户银行</label>
              <Input
                value={customerInfo.bankName}
                onChange={(e) =>
                  handleCustomerChange("bankName", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">银行账号</label>
              <Input
                value={customerInfo.bankAccount}
                onChange={(e) =>
                  handleCustomerChange("bankAccount", e.target.value)
                }
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">公司地址</label>
              <Input
                value={customerInfo.address}
                onChange={(e) =>
                  handleCustomerChange("address", e.target.value)
                }
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">联系电话</label>
              <Input
                value={customerInfo.phone}
                onChange={(e) => handleCustomerChange("phone", e.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">发票类型</label>
              <div className="p-2 bg-muted rounded text-sm font-medium">
                {invoiceType === "普票" ? "增值税普通发票" : "增值税专用发票"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            开票内容
            {expectedAmount && (
              <span
                className={`text-base font-mono ${amountMatch === true ? "text-green-600" : "text-red-600"}`}
              >
                需要开票金额：¥{expectedAmount}
              </span>
            )}
            {invoiceDate && (
              <span className="text-sm text-muted-foreground font-normal ml-auto">
                发票日期: {invoiceDate}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-end items-center gap-2">
            {lineItems.length > 0 && (
              <Button variant="outline" onClick={handleReset}>
                清空明细
              </Button>
            )}
            <Button variant="outline" onClick={() => setImportModalOpen(true)}>
              <FileText className="w-4 h-4 mr-2" />
              导入
            </Button>
            <Button onClick={handleExport} disabled={isExporting}>
              <FileDown className="w-4 h-4 mr-2" />
              {isExporting ? "导出中..." : "导出发票"}
            </Button>
          </div>
          <InvoiceLineItems />
        </CardContent>
      </Card>

      <InvoiceImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onImport={handleImport}
        onSetInvoiceDate={setInvoiceDate}
      />
    </div>
  );
}
