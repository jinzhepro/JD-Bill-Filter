"use client";

import React, { useState } from "react";
import Decimal from "decimal.js";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Copy } from "lucide-react";

const parseCustomerText = (text) => {
  const lines = text.split(/[\n\r]+/).map(l => l.trim()).filter(Boolean);
  const result = { customerInfo: {}, orderNumbers: [], orderAmounts: [], totalAmount: "0.00", invoiceType: "专票" };
  
  let totalAmount = new Decimal(0);
  for (const line of lines) {
    const orderMatches = line.matchAll(/(\d{12})[\s\t]+(\d+(?:\.\d+)?)/g);
    for (const match of orderMatches) {
      result.orderNumbers.push(match[1]);
      result.orderAmounts.push({ orderNumber: match[1], amount: match[2] });
      totalAmount = totalAmount.plus(match[2]);
    }
  }
  result.totalAmount = totalAmount.toFixed(2);
  
  for (let i = 0; i < lines.length; i++) {
    const taxIdMatch = lines[i].match(/[A-Z0-9]{18}/i);
    if (taxIdMatch) {
      result.customerInfo.taxId = taxIdMatch[0].toUpperCase();
      if (i > 0) {
        const parts = lines[i - 1].split(/[；;：:,，\s]+/).filter(Boolean);
        const longestPart = parts.reduce((a, b) => a.length >= b.length ? a : b, "");
        if (longestPart && !/^\d+$/.test(longestPart.replace(/\s/g, ""))) {
          result.customerInfo.customerName = longestPart;
        }
      }
      break;
    }
  }
  
  for (const line of lines) {
    const invoiceTypeMatch = line.match(/开票类型[：:]\s*(.*)/);
    if (invoiceTypeMatch) {
      const typeText = invoiceTypeMatch[1];
      if (/普票/.test(typeText)) {
        result.invoiceType = "普票";
      } else if (/专票/.test(typeText)) {
        result.invoiceType = "专票";
      }
      break;
    }
  }
  
  return result;
};

export function CustomerImportModal({ open, onOpenChange, onImport, onInvoiceTypeChange }) {
  const [pasteText, setPasteText] = useState("");
  const [parsedResult, setParsedResult] = useState(null);
  const { toast } = useToast();

  const handleParse = () => {
    if (!pasteText.trim()) {
      toast({ title: "请粘贴开票信息", variant: "destructive" });
      return;
    }

    const parsed = parseCustomerText(pasteText);

    if (Object.keys(parsed.customerInfo).length === 0 && parsed.orderNumbers.length === 0) {
      toast({ title: "无法解析开票信息，请检查格式", variant: "destructive" });
      return;
    }

    setParsedResult(parsed);
  };

  const handleImport = () => {
    if (!parsedResult) return;
    
    if (parsedResult.orderNumbers.length > 0) {
      const text = parsedResult.orderNumbers.join(",");
      navigator.clipboard.writeText(text);
    }
    
    if (Object.keys(parsedResult.customerInfo).length > 0) {
      onImport(parsedResult.customerInfo);
      
      const fields = [];
      if (parsedResult.customerInfo.customerName) fields.push("客户名称");
      if (parsedResult.customerInfo.taxId) fields.push("税号");
      fields.push(`发票类型：${parsedResult.invoiceType}`);
      
      if (onInvoiceTypeChange) {
        onInvoiceTypeChange(parsedResult.invoiceType);
      }
      
      toast({ title: `已导入: ${fields.join("、")}${parsedResult.orderNumbers.length > 0 ? `,订单号已复制` : ""}` });
    } else if (parsedResult.orderNumbers.length > 0) {
      toast({ title: `订单号已复制 (${parsedResult.orderNumbers.length}个)` });
    }
    
    handleClose();
  };

  const handleCopyOrderNumbers = () => {
    if (!parsedResult) return;
    const text = parsedResult.orderNumbers.join(",");
    navigator.clipboard.writeText(text);
    toast({ title: "已复制订单号" });
  };

  const handleClose = () => {
    setPasteText("");
    setParsedResult(null);
    onOpenChange(false);
  };

  const customerInfo = parsedResult?.customerInfo || {};
  const orderNumbers = parsedResult?.orderNumbers || [];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>导入开票信息</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            粘贴开票信息，支持识别：客户名称（公司全称）/纳税人识别号/订单号
          </p>
          <Textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={"抬头：黑龙江速达商贸有限公司\n税号：91230103MA1CM7L37M\n邮箱：1491503293@qq.com\n订单号：\n328220152890\t49.9\n330211482160\t52\n开票类型：数电普票（多个订单可合开，开明细）"}
            rows={8}
          />
        </div>
        
        {parsedResult && (
          <div className="space-y-4 border-t pt-4">
            {Object.keys(customerInfo).length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">识别到的客户信息</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {customerInfo.customerName && (
                    <div className="p-2 bg-muted rounded col-span-2">
                      <span className="text-muted-foreground">客户名称：</span>
                      <span className="font-medium">{customerInfo.customerName}</span>
                    </div>
                  )}
                  {customerInfo.taxId && (
                    <div className="p-2 bg-muted rounded col-span-2">
                      <span className="text-muted-foreground">税号：</span>
                      <span className="font-medium">{customerInfo.taxId}</span>
                    </div>
                  )}
                  <div className="p-2 bg-muted rounded col-span-2">
                    <span className="text-muted-foreground">发票类型：</span>
                    <span className="font-medium">{parsedResult.invoiceType}</span>
                  </div>
                </div>
              </div>
            )}
            
            {orderNumbers.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">识别到的订单号 ({orderNumbers.length}个)</p>
                  <Button variant="outline" size="sm" onClick={handleCopyOrderNumbers}>
                    <Copy className="w-4 h-4 mr-1" />
                    复制全部
                  </Button>
                </div>
                
                <div className="max-h-[400px] overflow-auto space-y-2">
                  {(() => {
                    const groups = [];
                    for (let i = 0; i < orderNumbers.length; i += 20) {
                      groups.push(orderNumbers.slice(i, i + 20));
                    }
                    
                    return groups.map((group, groupIndex) => {
                      const start = groupIndex * 20 + 1;
                      const end = Math.min((groupIndex + 1) * 20, orderNumbers.length);
                      
                      const handleCopyGroup = () => {
                        navigator.clipboard.writeText(group.join(","));
                        toast({ title: `已复制第 ${groupIndex + 1} 组订单号 (${group.length}个)` });
                      };
                      
                      return (
                        <div key={groupIndex} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">
                              第 {groupIndex + 1} 组：{start}-{end}（{group.length}个）
                            </p>
                            <Button variant="ghost" size="sm" onClick={handleCopyGroup}>
                              <Copy className="w-3 h-3 mr-1" />
                              复制本组
                            </Button>
                          </div>
                          <div className="p-2 bg-muted rounded text-xs font-mono break-all">
                            {group.join(",")}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
                
                <div className="p-2 bg-muted rounded text-xs">
                  <div className="flex justify-between font-bold border-t-2 border-border pt-2">
                    <span>合计 ({orderNumbers.length}个订单)</span>
                    <span className="text-red-600">¥{parsedResult.totalAmount}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            取消
          </Button>
          <Button onClick={handleParse}>识别</Button>
          {parsedResult && (
            <Button onClick={handleImport}>确认导入</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}