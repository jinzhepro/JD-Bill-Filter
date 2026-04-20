"use client";

import React, { useState } from "react";
import Decimal from "decimal.js";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const getBrandName = (name) => {
  if (name.includes("雀巢")) return "*软饮料*雀巢";
  if (name.includes("可口可乐") || name.includes("雪碧")) return "*软饮料*可口可乐";
  if (name.includes("百事")) return "*软饮料*百事可乐";
  if (name.includes("脉动")) return "*软饮料*脉动";
  if (name.includes("蒙牛")) return "*软饮料*蒙牛";
  if (name.includes("红牛")) return "*软饮料*红牛";
  return "其他";
};

export function InvoiceImportModal({ open, onOpenChange, onImport }) {
  const [pasteText, setPasteText] = useState("");
  const { toast } = useToast();

  const handleImport = () => {
    if (!pasteText.trim()) {
      toast({ title: "请粘贴数据", variant: "destructive" });
      return;
    }

    const lines = pasteText.trim().split("\n");
    const items = [];

    const extractSpec = (name) => {
      const specMatch = name.match(/(\d+(?:ml|L|g|kg|ML))\s*[×\*xX]\s*(\d+)/i);
      if (specMatch) {
        const spec = `${specMatch[1]}×${specMatch[2]}`;
        const cleanName = name.replace(specMatch[0], "").replace(/_[\d]+$/, "").trim();
        return { spec, name: cleanName };
      }
      return { spec: "", name: name.replace(/_[\d]+$/, "").trim() };
    };

    for (const line of lines) {
      const parts = line.split(/\t+/);
      if (parts.length >= 3) {
        const rawName = parts[0].trim();
        const quantity = parseFloat(parts[1]) || 0;
        const totalAmount = parseFloat(parts[2]) || 0;
        
        if (rawName && quantity > 0 && totalAmount > 0) {
          const { name: cleanName, spec } = extractSpec(rawName);
          const brandName = getBrandName(cleanName);
          const price = new Decimal(totalAmount).div(new Decimal(quantity)).toFixed(2);
          items.push({
            name: brandName,
            spec,
            unit: "箱",
            quantity,
            price: parseFloat(price),
            taxRate: 0.13,
          });
        }
      }
    }

    if (items.length === 0) {
      toast({ title: "未能解析任何有效数据", variant: "destructive" });
      return;
    }

    onImport(items);
    toast({ title: `成功导入 ${items.length} 条数据` });
    setPasteText("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>导入开票内容</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            粘贴数据，格式：名称 + 制表符 + 数量 + 制表符 + 合计金额
          </p>
          <Textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="【整箱】可口可乐500ml*24瓶/箱_10210154943598	3	145.5"
            rows={10}
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