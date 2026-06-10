"use client";

import React, { useState, useEffect } from "react";
import Decimal from "decimal.js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { formatTimestamp, cleanAmountString } from "@/lib/utils";

export function InvoiceImportModal({
  open,
  onOpenChange,
  onImport,
  onSetInvoiceDate,
}) {
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
      } catch {
        return null;
      }
    };
    fetchProducts();
  }, []);

  const parseDate = (dateStr) => {
    const parts = dateStr.split(/[\/\-]/);
    if (parts.length === 3) {
      const year = parts[0];
      const month = parts[1].padStart(2, "0");
      const day = parts[2].padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
    return dateStr;
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

        const paymentRecords = order.billDetailDoList.filter(
          (detail) => detail.feeCode === 30,
        );

        for (const paymentRecord of paymentRecords) {
          const sku = paymentRecord.skuId;
          const quantity = paymentRecord.num || 1;
          const amount = paymentRecord.bal || paymentRecord.settleBal || 0;
          const finishTime = paymentRecord.finishTime;

          if (!firstDate && finishTime) {
            firstDate = formatTimestamp(finishTime);
          }

          if (sku && quantity > 0 && amount > 0) {
            const product = products.find((p) => p.sku === sku);

            const price = new Decimal(amount)
              .div(new Decimal(quantity))
              .toFixed(2);
            const baseItem = {
              sku: sku,
              orderId: order.orderId,
              spec: product?.spec || "",
              unit: "箱",
              quantity,
              price: parseFloat(price),
              taxRate: 0.13,
              date: finishTime
                ? formatTimestamp(finishTime)
                : new Date().toISOString().split("T")[0],
            };

            if (product) {
              items.push({
                ...baseItem,
                name: product.invoice_name || "其他",
              });
            } else {
              items.push({
                ...baseItem,
                name: "",
                unmatched: true,
              });
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

  const parseTabData = (text) => {
    const lines = text.trim().split("\n");
    const items = [];
    const unmatchedSkus = [];
    let firstDate = "";

    for (const line of lines) {
      const parts = line.split(/\t+/);
      if (parts.length >= 4) {
        const date = parts[0].trim();
        const sku = parts[1].trim();
        const rawQuantity = parts[2].trim().replace(/^~/, "");
        const quantity = parseFloat(rawQuantity) || 0;
        const totalAmountStr = cleanAmountString(parts[3]);
        const totalAmount = parseFloat(totalAmountStr) || 0;

        if (!firstDate && date) {
          firstDate = parseDate(date);
        }

        if (sku && quantity > 0 && totalAmount > 0) {
          const product = products.find((p) => p.sku === sku);

          const price = new Decimal(totalAmountStr)
            .div(new Decimal(quantity))
            .toFixed(2);
          const baseItem = {
            sku: sku,
            spec: product?.spec || "",
            unit: "箱",
            quantity,
            price: parseFloat(price),
            taxRate: 0.13,
            date: parseDate(date),
          };

          if (product) {
            items.push({
              ...baseItem,
              name: product.invoice_name || "其他",
            });
          } else {
            items.push({
              ...baseItem,
              name: "",
              unmatched: true,
            });
            unmatchedSkus.push(sku);
          }
        }
      }
    }

    return { items, unmatchedSkus, firstDate };
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

    let result = parseJsonData(pasteText);

    if (!result) {
      result = parseTabData(pasteText);
    }

    if (!result || result.items.length === 0) {
      toast({ title: "未能解析任何有效数据", variant: "destructive" });
      return;
    }

    if (result.firstDate && onSetInvoiceDate) {
      onSetInvoiceDate(result.firstDate);
    }

    onImport(result.items);

    let toastMessage = `成功导入 ${result.items.length} 条数据`;
    if (result.unmatchedSkus.length > 0) {
      const skuList =
        result.unmatchedSkus.length > 3
          ? result.unmatchedSkus.slice(0, 3).join(", ") +
            ` 等 ${result.unmatchedSkus.length} 个`
          : result.unmatchedSkus.join(", ");
      toastMessage += `，${result.unmatchedSkus.length} 个 SKU 未匹配（${skuList}）`;
    }
    toast({ title: toastMessage });
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
            支持 JSON 格式或制表符分隔格式（日期 + SKU + 数量 + 金额）
          </p>
          <Textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={"JSON格式或：\n2026/4/6\t10205802436048\t10\t549.9"}
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
