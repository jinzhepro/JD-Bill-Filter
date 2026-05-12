"use client";

import React, { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { exportInvoice } from "@/lib/invoiceExporter";

export function CanteenInvoiceModal({ open, onOpenChange, products }) {
  const [pasteData, setPasteData] = useState("");
  const [previewItems, setPreviewItems] = useState([]);
  const [matchErrors, setMatchErrors] = useState([]);
  const [canteenName, setCanteenName] = useState("");
  const [customerInfo, setCustomerInfo] = useState({
    customerName: "青岛开投餐饮酒店管理有限公司",
    taxId: "91370211MABQPQYQ7A",
    bankName: "北京银行股份有限公司青岛西海岸新区支行",
    bankAccount: "20000059793200094551530",
    address: "山东省青岛市黄岛区车轮山路388号1栋2办公2116户",
    phone: "0532-86986696",
  });
  const { toast } = useToast();

  const parsePastedData = useCallback((text) => {
    const lines = text.trim().split("\n").filter((line) => line.trim());
    if (lines.length === 0) return [];

    const items = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const parts = line.split(/\t|  +/).filter((p) => p.trim());
      
      if (parts.length < 5) continue;
      
      const name = parts[0]?.trim();
      const unit = parts[1]?.trim();
      const quantity = parseFloat(parts[2]?.replace(/[^\d.]/g, "")) || 0;
      const unitPrice = parseFloat(parts[3]?.replace(/[^\d.]/g, "")) || 0;
      const amount = parseFloat(parts[4]?.replace(/[^\d.]/g, "")) || 0;

      if (!name || quantity <= 0) continue;

      items.push({
        inputName: name,
        unit,
        quantity,
        unitPrice,
        amount,
      });
    }

    return items;
  }, []);

  const matchProducts = useCallback(
    (items) => {
      const matchedItems = [];
      const errors = [];

      for (const item of items) {
        const productName = item.inputName.toLowerCase();
        
        const matchedProduct = products.find((p) => {
          const dbName = p.product_name.toLowerCase();
          const dbNameWithoutStar = dbName.replace(/^\*/, "");
          return (
            dbNameWithoutStar === productName ||
            dbName.includes(productName) ||
            productName.includes(dbNameWithoutStar)
          );
        });

        if (matchedProduct) {
          let taxRate = matchedProduct.tax_rate || 0;
          if (taxRate > 1) {
            taxRate = taxRate / 100;
          }
          matchedItems.push({
            name: matchedProduct.product_name,
            spec: matchedProduct.spec || "",
            unit: matchedProduct.unit || item.unit,
            quantity: item.quantity,
            price: item.unitPrice,
            taxRate: taxRate,
            matchedProductName: matchedProduct.product_name,
            inputAmount: item.amount,
          });
        } else {
          errors.push(item.inputName);
        }
      }

      return { matchedItems, errors };
    },
    [products]
  );

  const handleParse = useCallback(() => {
    const items = parsePastedData(pasteData);
    if (items.length === 0) {
      toast({
        title: "未解析到有效数据",
        description: "请确保数据格式为：品名、单位、数量、单价、金额（制表符或空格分隔）",
        variant: "destructive",
      });
      return;
    }

    const { matchedItems, errors } = matchProducts(items);
    setPreviewItems(matchedItems);
    setMatchErrors(errors);

    if (matchedItems.length > 0) {
      toast({
        title: `成功匹配 ${matchedItems.length} 条数据`,
      });
    }

    if (errors.length > 0) {
      toast({
        title: `${errors.length} 条品名未匹配`,
        description: `未匹配：${errors.slice(0, 5).join("、")}${errors.length > 5 ? "..." : ""}`,
        variant: "destructive",
      });
    }
  }, [pasteData, parsePastedData, matchProducts, toast]);

  const handleExport = useCallback(async () => {
    if (previewItems.length === 0) {
      toast({ title: "没有可导出的数据", variant: "destructive" });
      return;
    }

    if (!customerInfo.customerName.trim()) {
      toast({ title: "请输入客户名称", variant: "destructive" });
      return;
    }

    const now = new Date();
    const applyDate = now.toISOString().split("T")[0];

    const basicInfo = {
      companyName: "青岛青云通公共服务有限公司",
      contractNo: "JK-GQ-250041-32",
      applyDate,
      department: "青云通",
      applicant: "刘雅超",
    };

    try {
      await exportInvoice(basicInfo, customerInfo, previewItems, canteenName || null);
      toast({ title: "发票导出成功" });
      onOpenChange(false);
      setPasteData("");
      setPreviewItems([]);
      setMatchErrors([]);
      setCanteenName("");
      setCustomerInfo({
        customerName: "青岛开投餐饮酒店管理有限公司",
        taxId: "91370211MABQPQYQ7A",
        bankName: "北京银行股份有限公司青岛西海岸新区支行",
        bankAccount: "20000059793200094551530",
        address: "山东省青岛市黄岛区车轮山路388号1栋2办公2116户",
        phone: "0532-86986696",
      });
    } catch (error) {
      console.error("导出发票失败:", error);
      toast({ title: "导出发票失败", variant: "destructive" });
    }
  }, [previewItems, customerInfo, canteenName, toast, onOpenChange]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setPasteData("");
    setPreviewItems([]);
    setMatchErrors([]);
    setCanteenName("");
    setCustomerInfo({
      customerName: "青岛开投餐饮酒店管理有限公司",
      taxId: "91370211MABQPQYQ7A",
      bankName: "北京银行股份有限公司青岛西海岸新区支行",
      bankAccount: "20000059793200094551530",
      address: "山东省青岛市黄岛区车轮山路388号1栋2办公2116户",
      phone: "0532-86986696",
    });
  }, [onOpenChange]);

  const formatAmount = (amount) => {
    return new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency: "CNY",
    }).format(amount || 0);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>食堂采购单开票</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">食堂名称</label>
            <Input
              value={canteenName}
              onChange={(e) => setCanteenName(e.target.value)}
              placeholder="输入食堂名称（导出时显示在右下角）"
            />
          </div>
          
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">客户名称 *</label>
                <Input
                  value={customerInfo.customerName}
                  onChange={(e) =>
                    setCustomerInfo({ ...customerInfo, customerName: e.target.value })
                  }
                  placeholder="青岛开投餐饮酒店管理有限公司"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">纳税人识别号</label>
                <Input
                  value={customerInfo.taxId}
                  onChange={(e) =>
                    setCustomerInfo({ ...customerInfo, taxId: e.target.value })
                  }
                  placeholder="91370211MABQPQYQ7A"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">开户银行</label>
                <Input
                  value={customerInfo.bankName}
                  onChange={(e) =>
                    setCustomerInfo({ ...customerInfo, bankName: e.target.value })
                  }
                  placeholder="北京银行股份有限公司青岛西海岸新区支行"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">银行账号</label>
                <Input
                  value={customerInfo.bankAccount}
                  onChange={(e) =>
                    setCustomerInfo({ ...customerInfo, bankAccount: e.target.value })
                  }
                  placeholder="20000059793200094551530"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">公司地址</label>
                <Input
                  value={customerInfo.address}
                  onChange={(e) =>
                    setCustomerInfo({ ...customerInfo, address: e.target.value })
                  }
                  placeholder="山东省青岛市黄岛区车轮山路388号1栋2办公2116户"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">联系电话</label>
                <Input
                  value={customerInfo.phone}
                  onChange={(e) =>
                    setCustomerInfo({ ...customerInfo, phone: e.target.value })
                  }
                  placeholder="0532-86986696"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">粘贴数据</label>
            <Textarea
              value={pasteData}
              onChange={(e) => setPasteData(e.target.value)}
              placeholder="粘贴品名数据，格式：品名、单位、数量、单价、金额（制表符或空格分隔）"
              rows={6}
            />
            <p className="text-xs text-muted-foreground">
              示例格式：鸡翅根	20斤/箱	5	132	660.00
            </p>
          </div>

          <Button onClick={handleParse} className="w-full">
            解析并匹配
          </Button>

          {matchErrors.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <p className="text-sm text-destructive font-medium">未匹配品名：</p>
              <p className="text-sm text-destructive">{matchErrors.join("、")}</p>
            </div>
          )}

          {previewItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">匹配结果</p>
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted">
                      <th className="border px-2 py-1 text-left">发票名称</th>
                      <th className="border px-2 py-1 text-center">规格</th>
                      <th className="border px-2 py-1 text-center">单位</th>
                      <th className="border px-2 py-1 text-right">数量</th>
                      <th className="border px-2 py-1 text-right">单价</th>
                      <th className="border px-2 py-1 text-right">税率</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewItems.map((item, index) => (
                      <tr key={index}>
                        <td className="border px-1 py-1">
                          <Input
                            value={item.name}
                            onChange={(e) => {
                              const newItems = [...previewItems];
                              newItems[index] = { ...newItems[index], name: e.target.value };
                              setPreviewItems(newItems);
                            }}
                            className="h-7 text-sm border-0 shadow-none focus-visible:ring-1"
                          />
                        </td>
                        <td className="border px-2 py-1 text-center">{item.spec}</td>
                        <td className="border px-2 py-1 text-center">{item.unit}</td>
                        <td className="border px-2 py-1 text-right">{item.quantity}</td>
                        <td className="border px-2 py-1 text-right">
                          {formatAmount(item.price)}
                        </td>
                        <td className="border px-2 py-1 text-right">
                          {(item.taxRate * 100).toFixed(0)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>共 {previewItems.length} 条</span>
                <span>
                  合计金额：{formatAmount(
                    previewItems.reduce(
                      (sum, item) => sum + item.quantity * item.price,
                      0
                    )
                  )}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            取消
          </Button>
          <Button onClick={handleExport} disabled={previewItems.length === 0}>
            导出发票
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}