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
  const result = { customerInfo: {}, orderNumbers: [], orderAmounts: [], totalAmount: "0.00" };
  
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
  
  return result;
};

export function CustomerImportModal({ open, onOpenChange, onImport }) {
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
                </div>
              </div>
            )}
            
            {orderNumbers.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">识别到的订单号 ({orderNumbers.length}个)</p>
                  <Button variant="outline" size="sm" onClick={handleCopyOrderNumbers}>
                    <Copy className="w-4 h-4 mr-1" />
                    复制订单号
                  </Button>
                </div>
                <div className="p-2 bg-muted rounded text-xs font-mono max-h-48 overflow-auto">
                   <table className="w-full">
                     <thead>
                       <tr>
                         <th className="py-1 px-2 text-center w-8 text-xs text-muted-foreground">#</th>
                         <th className="py-1 px-2 text-xs text-muted-foreground">订单号</th>
                         <th className="py-1 px-2 text-xs text-muted-foreground text-right">金额</th>
                       </tr>
                     </thead>
                     <tbody>
                       {parsedResult.orderAmounts.map((item, index) => (
                         <tr key={index} className="border-b border-border last:border-0">
                           <td className="py-1 px-2 text-center text-xs text-muted-foreground">{index + 1}</td>
                           <td className="py-1 px-2">{item.orderNumber}</td>
                           <td className="py-1 px-2 text-right">{item.amount}</td>
                         </tr>
                       ))}
                       <tr className="font-bold border-t-2 border-border">
                         <td></td>
                         <td className="py-1 px-2">合计 ({orderNumbers.length}个订单)</td>
                         <td className="py-1 px-2 text-right text-red-600">¥{parsedResult.totalAmount}</td>
                       </tr>
                     </tbody>
                  </table>
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