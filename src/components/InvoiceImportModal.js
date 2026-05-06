"use client";

import React, { useState, useEffect } from "react";
import Decimal from "decimal.js";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export function InvoiceImportModal({ open, onOpenChange, onImport, onSetInvoiceDate }) {
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

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const parseJsonData = (jsonText) => {
    try {
      const data = JSON.parse(jsonText);
      if (!data.content || !Array.isArray(data.content)) {
        return null;
      }

      const items = [];
      const unmatchedSkus = [];
      let firstDate = "";

      for (const order of data.content) {
        if (!order.billDetailDoList || !Array.isArray(order.billDetailDoList)) {
          continue;
        }

        const paymentRecord = order.billDetailDoList.find(detail => detail.feeCode === 30);
        
        if (paymentRecord) {
          const sku = paymentRecord.skuId;
          const quantity = paymentRecord.num || 1;
          const amount = paymentRecord.bal || paymentRecord.settleBal || 0;
          const finishTime = paymentRecord.finishTime;
          
          if (!firstDate && finishTime) {
            firstDate = formatTimestamp(finishTime);
          }

          if (sku && quantity > 0 && amount > 0) {
            const product = products.find(p => p.sku === sku);
            
            if (product) {
              const price = new Decimal(amount).div(new Decimal(quantity)).toFixed(2);
              items.push({
                sku: sku,
                orderId: order.orderId,
                name: product.invoice_name || "其他",
                spec: product.spec || "",
                unit: "箱",
                quantity,
                price: parseFloat(price),
                taxRate: 0.13,
                date: finishTime ? formatTimestamp(finishTime) : new Date().toISOString().split("T")[0],
              });
            } else {
              unmatchedSkus.push(sku);
            }
          }
        }
      }

      return { items, unmatchedSkus, firstDate };
    } catch {
      return null;
    }
  };

  const handleImport = () => {
    if (!pasteText.trim()) {
      toast({ title: "请粘贴数据", variant: "destructive" });
      return;
    }

    if (products.length === 0) {
      toast({ title: "商品数据未加载，请稍后重试", variant: "destructive" });
      return;
    }

    const result = parseJsonData(pasteText);

    if (!result || result.items.length === 0) {
      toast({ title: "未能解析任何有效数据，请检查JSON格式", variant: "destructive" });
      return;
    }

    if (result.unmatchedSkus.length > 0) {
      toast({ 
        title: `以下 SKU 未找到商品：${result.unmatchedSkus.join(", ")}`, 
        variant: "destructive" 
      });
      return;
    }

    if (result.firstDate && onSetInvoiceDate) {
      onSetInvoiceDate(result.firstDate);
    }

    onImport(result.items);
    toast({ title: `成功导入 ${result.items.length} 条数据` });
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
            粘贴结算单JSON数据
          </p>
          <Textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={"粘贴结算单JSON数据..."}
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