"use client";

import React, { useState } from "react";
import { useInvoice } from "@/context/InvoiceContext";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { InvoiceLineItems } from "./InvoiceLineItems";
import { exportInvoice } from "@/lib/invoiceExporter";
import { useToast } from "@/hooks/use-toast";
import { FileDown } from "lucide-react";

export function InvoiceForm() {
  const { basicInfo, customerInfo, lineItems, setBasicInfo, setCustomerInfo, reset } = useInvoice();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const handleBasicChange = (field, value) => {
    setBasicInfo({ [field]: value });
  };

  const handleCustomerChange = (field, value) => {
    setCustomerInfo({ [field]: value });
  };

  const handleExport = async () => {
    if (!basicInfo.companyName || !basicInfo.contractNo) {
      toast({ title: "请填写公司名称和合同号", variant: "destructive" });
      return;
    }
    if (!customerInfo.customerName || !customerInfo.taxId) {
      toast({ title: "请填写客户名称和纳税人识别号", variant: "destructive" });
      return;
    }
    if (lineItems.length === 0) {
      toast({ title: "请添加开票内容明细", variant: "destructive" });
      return;
    }

    setIsExporting(true);
    try {
      await exportInvoice(basicInfo, customerInfo, lineItems);
      toast({ title: "发票导出成功" });
    } catch (error) {
      toast({ title: `导出失败: ${error.message}`, variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleReset = () => {
    reset();
    toast({ title: "表单已清空" });
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
              <Input value={basicInfo.companyName} onChange={(e) => handleBasicChange("companyName", e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">合同号 *</label>
              <Input value={basicInfo.contractNo} onChange={(e) => handleBasicChange("contractNo", e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">申请日期 *</label>
              <Input type="date" value={basicInfo.applyDate} onChange={(e) => handleBasicChange("applyDate", e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">申请部门</label>
              <Input value={basicInfo.department} onChange={(e) => handleBasicChange("department", e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">申请人</label>
              <Input value={basicInfo.applicant} onChange={(e) => handleBasicChange("applicant", e.target.value)} />
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
              <label className="text-sm font-medium">客户名称（公司全称） *</label>
              <Input value={customerInfo.customerName} onChange={(e) => handleCustomerChange("customerName", e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-4">
              <label className="text-sm font-medium">纳税人识别号 *</label>
              <Input value={customerInfo.taxId} onChange={(e) => handleCustomerChange("taxId", e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">开户银行</label>
              <Input value={customerInfo.bankName} onChange={(e) => handleCustomerChange("bankName", e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">银行账号</label>
              <Input value={customerInfo.bankAccount} onChange={(e) => handleCustomerChange("bankAccount", e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">公司地址</label>
              <Input value={customerInfo.address} onChange={(e) => handleCustomerChange("address", e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">联系电话</label>
              <Input value={customerInfo.phone} onChange={(e) => handleCustomerChange("phone", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>开票内容</CardTitle>
        </CardHeader>
        <CardContent>
          <InvoiceLineItems />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={handleReset}>
          清空表单
        </Button>
        <Button onClick={handleExport} disabled={isExporting}>
          <FileDown className="w-4 h-4 mr-2" />
          {isExporting ? "导出中..." : "导出发票"}
        </Button>
      </div>
    </div>
  );
}