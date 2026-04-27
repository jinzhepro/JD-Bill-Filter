"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const parseCustomerText = (text) => {
  const lines = text.split(/[\n\r]+/).map(l => l.trim()).filter(Boolean);
  const result = {};
  
  for (const line of lines) {
    if (line.includes("：")) {
      const [key, ...valueParts] = line.split("：");
      const value = valueParts.join("：").trim();
      const keyLower = key.toLowerCase();
      
      if (keyLower.includes("抬头") || keyLower.includes("购方名称") || keyLower.includes("签约主体") || keyLower.includes("客户名称")) {
        result.customerName = value;
      } else if (keyLower.includes("税号") || keyLower.includes("识别号")) {
        result.taxId = value;
      } else if (keyLower.includes("银行") && !keyLower.includes("账号")) {
        result.bankName = value;
      } else if (keyLower.includes("账号")) {
        result.bankAccount = value;
      } else if (keyLower.includes("地址") || keyLower.includes("住址")) {
        result.address = value;
      } else if (keyLower.includes("电话")) {
        result.phone = value;
      }
    } else if (line.includes(":")) {
      const colonIndex = line.indexOf(":");
      const key = line.substring(0, colonIndex);
      const value = line.substring(colonIndex + 1).trim();
      const keyLower = key.toLowerCase();
      
      if (keyLower.includes("抬头") || keyLower.includes("购方名称") || keyLower.includes("签约主体") || keyLower.includes("客户名称")) {
        result.customerName = value;
      } else if (keyLower.includes("税号") || keyLower.includes("识别号")) {
        result.taxId = value;
      } else if (keyLower.includes("银行") && !keyLower.includes("账号")) {
        result.bankName = value;
      } else if (keyLower.includes("账号")) {
        result.bankAccount = value;
      } else if (keyLower.includes("地址") || keyLower.includes("住址")) {
        result.address = value;
      } else if (keyLower.includes("电话")) {
        result.phone = value;
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