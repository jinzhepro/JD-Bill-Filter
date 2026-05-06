"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Copy } from "lucide-react";

const parseCustomerText = (text) => {
  const lines = text.split(/[\n\r]+/).map(l => l.trim()).filter(Boolean);
  const result = { customerInfo: {}, orderNumbers: [] };
  
  const keywordMap = {
    "抬头": "customerName",
    "购方名称": "customerName",
    "签约主体": "customerName",
    "客户名称": "customerName",
    "税号": "taxId",
    "识别号": "taxId",
    "银行": "bankName",
    "账号": "bankAccount",
    "地址": "address",
    "住址": "address",
    "电话": "phone"
  };
  
  // 先识别所有订单号（12位数字 + 空格 + 数字）
  for (const line of lines) {
    const orderMatches = line.matchAll(/(\d{12})\s+\d+(\.\d+)?/g);
    for (const match of orderMatches) {
      result.orderNumbers.push(match[1]);
    }
  }
  
  // 再识别客户信息
  for (const line of lines) {
    let key = "";
    let value = "";
    
    if (line.includes("：")) {
      const parts = line.split("：");
      key = parts[0];
      value = parts.slice(1).join("：").trim();
    } else if (line.includes(":")) {
      const colonIndex = line.indexOf(":");
      key = line.substring(0, colonIndex);
      value = line.substring(colonIndex + 1).trim();
    } else {
      const spaceIndex = line.indexOf(" ");
      if (spaceIndex > 0) {
        const possibleKey = line.substring(0, spaceIndex);
        const possibleValue = line.substring(spaceIndex + 1).trim();
        
        for (const keyword of Object.keys(keywordMap)) {
          if (possibleKey.includes(keyword)) {
            key = possibleKey;
            value = possibleValue;
            break;
          }
        }
      }
    }
    
    if (key && value) {
      const keyLower = key.toLowerCase();
      
      for (const [keyword, field] of Object.entries(keywordMap)) {
        if (keyLower.includes(keyword)) {
          const cleanedValue = value.replace(/[，,;；。.\s]+$/, '').trim();
          result.customerInfo[field] = cleanedValue;
          break;
        }
      }
    }
  }
  
  if (Object.keys(result.customerInfo).length === 0) {
    const nonEmptyLines = lines.filter(l => l.length > 0);
    if (nonEmptyLines.length >= 1) {
      const firstLine = nonEmptyLines[0];
      if (!/^\d+$/.test(firstLine.replace(/\s/g, ""))) {
        result.customerInfo.customerName = firstLine;
      }
    }
    if (nonEmptyLines.length >= 2) {
      const secondLine = nonEmptyLines[1];
      if (/^[A-Z0-9]{15,25}$/i.test(secondLine.replace(/\s/g, ""))) {
        result.customerInfo.taxId = secondLine.replace(/\s/g, "");
      }
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
      if (parsedResult.customerInfo.bankName) fields.push("开户银行");
      if (parsedResult.customerInfo.bankAccount) fields.push("银行账号");
      if (parsedResult.customerInfo.address) fields.push("地址");
      if (parsedResult.customerInfo.phone) fields.push("电话");
      
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
            粘贴开票信息，支持识别：抬头/税号/银行/账号/地址/电话/订单号
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
                    <div className="p-2 bg-muted rounded">
                      <span className="text-muted-foreground">客户名称：</span>
                      <span className="font-medium">{customerInfo.customerName}</span>
                    </div>
                  )}
                  {customerInfo.taxId && (
                    <div className="p-2 bg-muted rounded">
                      <span className="text-muted-foreground">税号：</span>
                      <span className="font-medium">{customerInfo.taxId}</span>
                    </div>
                  )}
                  {customerInfo.bankName && (
                    <div className="p-2 bg-muted rounded">
                      <span className="text-muted-foreground">开户银行：</span>
                      <span className="font-medium">{customerInfo.bankName}</span>
                    </div>
                  )}
                  {customerInfo.bankAccount && (
                    <div className="p-2 bg-muted rounded">
                      <span className="text-muted-foreground">银行账号：</span>
                      <span className="font-medium">{customerInfo.bankAccount}</span>
                    </div>
                  )}
                  {customerInfo.address && (
                    <div className="p-2 bg-muted rounded col-span-2">
                      <span className="text-muted-foreground">地址：</span>
                      <span className="font-medium">{customerInfo.address}</span>
                    </div>
                  )}
                  {customerInfo.phone && (
                    <div className="p-2 bg-muted rounded col-span-2">
                      <span className="text-muted-foreground">电话：</span>
                      <span className="font-medium">{customerInfo.phone}</span>
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
                    复制
                  </Button>
                </div>
                <div className="p-2 bg-muted rounded text-xs font-mono max-h-48 overflow-auto whitespace-pre-wrap break-all">
                  {orderNumbers.join(",")}
                </div>
              </div>
            )}
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            取消
          </Button>
          {!parsedResult ? (
            <Button onClick={handleParse}>识别</Button>
          ) : (
            <Button onClick={handleImport}>确认导入</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}