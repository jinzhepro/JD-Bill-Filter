"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const parseCustomerText = (text) => {
  const lines = text.split(/[\n\r]+/).map(l => l.trim()).filter(Boolean);
  const result = {};
  
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
      // 尝试匹配 "关键词 值" 格式
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
          result[field] = value;
          break;
        }
      }
    }
  }
  
  if (Object.keys(result).length === 0) {
    const nonEmptyLines = lines.filter(l => l.length > 0);
    if (nonEmptyLines.length >= 1) {
      const firstLine = nonEmptyLines[0];
      if (!/^\d+$/.test(firstLine.replace(/\s/g, ""))) {
        result.customerName = firstLine;
      }
    }
    if (nonEmptyLines.length >= 2) {
      const secondLine = nonEmptyLines[1];
      if (/^[A-Z0-9]{15,25}$/i.test(secondLine.replace(/\s/g, ""))) {
        result.taxId = secondLine.replace(/\s/g, "");
      }
    }
  }
  
  return result;
};

export function CustomerImportModal({ open, onOpenChange, onImport }) {
  const [pasteText, setPasteText] = useState("");
  const { toast } = useToast();

  const handleImport = () => {
    if (!pasteText.trim()) {
      toast({ title: "请粘贴客户信息", variant: "destructive" });
      return;
    }

    const parsed = parseCustomerText(pasteText);

    if (Object.keys(parsed).length === 0) {
      toast({ title: "无法解析客户信息，请检查格式", variant: "destructive" });
      return;
    }

    onImport(parsed);
    
    const fields = [];
    if (parsed.customerName) fields.push("客户名称");
    if (parsed.taxId) fields.push("税号");
    if (parsed.bankName) fields.push("开户银行");
    if (parsed.bankAccount) fields.push("银行账号");
    if (parsed.address) fields.push("地址");
    if (parsed.phone) fields.push("电话");
    
    toast({ title: `已解析: ${fields.join("、")}` });
    setPasteText("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>导入客户信息</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            粘贴客户信息，支持格式：抬头/税号/银行/账号/地址/电话
          </p>
          <Textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={"抬头：天津红桥妙祥源商贸有限公司\n税号：91120106MAK34JBE49\n开户银行：中国工商银行\n银行账号：1234567890\n地址：天津市红桥区\n电话：022-12345678"}
            rows={8}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleImport}>导入</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}