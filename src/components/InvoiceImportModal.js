"use client";

import React, { useState, useEffect } from "react";
import Decimal from "decimal.js";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export function InvoiceImportModal({ open, onOpenChange, onImport }) {
  const [pasteText, setPasteText] = useState("");
  const [products, setProducts] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch("/api/products?pageSize=1000");
        const data = await res.json();
        if (data.success) {
          setProducts(data.data);
        }
      } catch {}
    };
    fetchProducts();
  }, []);

  const handleImport = () => {
    if (!pasteText.trim()) {
      toast({ title: "请粘贴数据", variant: "destructive" });
      return;
    }

    if (products.length === 0) {
      toast({ title: "商品数据未加载，请稍后重试", variant: "destructive" });
      return;
    }

    const lines = pasteText.trim().split("\n");
    const items = [];
    const unmatchedSkus = [];

    for (const line of lines) {
      const parts = line.split(/\t+/);
      if (parts.length >= 4) {
        const date = parts[0].trim();
        const sku = parts[1].trim();
        const rawQuantity = parts[2].trim().replace(/^~/, "");
        const quantity = parseFloat(rawQuantity) || 0;
        const totalAmount = parseFloat(parts[3]) || 0;
        
        if (sku && quantity > 0 && totalAmount > 0) {
          const product = products.find(p => p.sku === sku);
          
          if (product) {
            const price = new Decimal(totalAmount).div(new Decimal(quantity)).toFixed(2);
            items.push({
              name: product.invoice_name || "其他",
              spec: product.spec || "",
              unit: "箱",
              quantity,
              price: parseFloat(price),
              taxRate: 0.13,
            });
          } else {
            unmatchedSkus.push(sku);
          }
        }
      }
    }

    if (unmatchedSkus.length > 0) {
      toast({ 
        title: `以下 SKU 未找到商品：${unmatchedSkus.join(", ")}`, 
        variant: "destructive" 
      });
      return;
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
            粘贴数据，格式：日期 + 制表符 + SKU + 制表符 + 数量 + 制表符 + 金额
          </p>
          <Textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="2026/4/6	10205802436048	10	549.9"
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