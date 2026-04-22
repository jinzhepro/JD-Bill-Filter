"use client";

import React, { useState } from "react";
import Decimal from "decimal.js";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const getBrandName = (name) => {
  if (name.includes("雀巢")) return "*软饮料*雀巢";
  if (name.includes("可口可乐") || name.includes("雪碧") || name.includes("美汁源")) return "*软饮料*可口可乐";
  if (name.includes("百事")) return "*软饮料*百事可乐";
  if (name.includes("脉动")) return "*软饮料*脉动";
  if (name.includes("蒙牛")) return "*软饮料*蒙牛";
  if (name.includes("红牛")) return "*软饮料*红牛";
  if (name.includes("大窑")) return "*软饮料*大窑";
  if (name.includes("康师傅")) return "*软饮料*康师傅";
  if (name.includes("崂山")) return "*软饮料*崂山";
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
      const specMatch = name.match(/(\d+(?:ml|L|g|kg|ML))(?:\/[^*]*)?[×*xX]\s*(\d+)/i);
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
        const rawQuantity = parts[0].trim().replace(/^~/, "");
        const quantity = parseFloat(rawQuantity) || 0;
        const totalAmount = parseFloat(parts[1]) || 0;
        const rawName = parts[2].trim();
        
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
            粘贴数据，格式：数量 + 制表符 + 金额 + 制表符 + 商品名称_商品编号
          </p>
          <Textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="2	97.98	【整箱】可口可乐可乐500ml/瓶*24瓶/箱_10206106072064"
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