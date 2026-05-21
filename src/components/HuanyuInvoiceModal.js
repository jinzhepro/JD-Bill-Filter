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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { exportInvoice } from "@/lib/invoiceExporter";

const HUANYU_CUSTOMERS = [
  "山东省兴邦人力资源集团有限公司",
  "连云港翱翔人力资源有限公司",
  "寰宇东方国际集装箱（青岛）有限公司",
];

const CUSTOMER_INFO_MAP = {
  "山东省兴邦人力资源集团有限公司": {
    taxId: "91370211334209496N",
    bankName: "",
    bankAccount: "",
    address: "",
    phone: "",
    contractNo: "JK-GQ-250120",
  },
  "连云港翱翔人力资源有限公司": {
    taxId: "91320722MA1X1CPM6D",
    bankName: "",
    bankAccount: "",
    address: "",
    phone: "",
    contractNo: "JK-GQ-250139",
  },
  "寰宇东方国际集装箱（青岛）有限公司": {
    taxId: "91370211743979264K",
    bankName: "",
    bankAccount: "",
    address: "",
    phone: "",
    contractNo: "JK-GQ-250105",
  },
};

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function HuanyuInvoiceModal({ open, onOpenChange, products }) {
  const [pasteData, setPasteData] = useState("");
  const [previewItems, setPreviewItems] = useState([]);
  const [matchErrors, setMatchErrors] = useState([]);
  const [canteenName, setCanteenName] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [selectedCustomers, setSelectedCustomers] = useState(HUANYU_CUSTOMERS);
  const [customerAmounts, setCustomerAmounts] = useState(() => {
    const amounts = {};
    HUANYU_CUSTOMERS.forEach(c => amounts[c] = "");
    return amounts;
  });
  const [allocationPreview, setAllocationPreview] = useState([]);
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
      const unmatchedItems = [];

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
            unit: item.unit,
            quantity: item.quantity,
            price: item.unitPrice,
            taxRate: taxRate,
            matchedProductName: matchedProduct.product_name,
            inputAmount: item.amount,
            isUnmatched: false,
          });
        } else {
          unmatchedItems.push({
            name: item.inputName,
            spec: "",
            unit: item.unit,
            quantity: item.quantity,
            price: item.unitPrice,
            taxRate: 0.13,
            matchedProductName: null,
            inputAmount: item.amount,
            isUnmatched: true,
          });
        }
      }

      const allItems = [...matchedItems, ...unmatchedItems];
      const errors = unmatchedItems.map(item => item.name);

      return { matchedItems: allItems, errors };
    },
    [products]
  );

  const generateAllocationPreview = useCallback((items) => {
    const preview = [];
    
    // 商品结构
    const goodsList = items.map(item => ({
      name: item.name,
      unit: item.unit,
      price: item.price,
      taxRate: item.taxRate,
      totalQty: item.quantity,
      totalAmt: parseFloat((item.quantity * item.price).toFixed(2)),
      allowDecimal: item.unit === "斤",
    }));
    
    // 开票单位结构（筛选有效客户）
    const activeCustomers = selectedCustomers.filter(c => customerAmounts[c] && customerAmounts[c].trim() !== "");
    const companyList = activeCustomers.map(name => ({
      name,
      targetAmt: parseFloat(customerAmounts[name].replace(/[^\d.]/g, "")),
    }));
    
    // 分配结果：companyIndex -> [{商品名称, 数量, 金额}]
    const assignResult = companyList.map(() => []);
    const usedAmt = companyList.map(() => 0);
    
    // 第一步：处理不可拆分商品（整体分配给金额最大的客户）
    const sortedCompanyIndices = companyList
      .map((c, i) => ({ index: i, targetAmt: c.targetAmt }))
      .sort((a, b) => b.targetAmt - a.targetAmt)
      .map(c => c.index);
    
    for (const goods of goodsList) {
      if (!goods.allowDecimal && goods.totalQty > 0) {
        for (const cIndex of sortedCompanyIndices) {
          const needAmt = parseFloat((companyList[cIndex].targetAmt - usedAmt[cIndex]).toFixed(2));
          if (goods.totalAmt <= needAmt + 0.01) {
            assignResult[cIndex].push({
              name: goods.name,
              quantity: goods.totalQty,
              price: goods.price,
              unit: goods.unit,
              amount: goods.totalAmt,
            });
            usedAmt[cIndex] = parseFloat((usedAmt[cIndex] + goods.totalAmt).toFixed(2));
            goods.totalQty = 0;
            goods.totalAmt = 0;
            break;
          }
        }
      }
    }
    
    // 第二步：处理可拆分商品（斤），补差到目标金额
    const splitGoodsList = goodsList.filter(g => g.allowDecimal && g.totalQty > 0);
    
    for (let cIndex = 0; cIndex < companyList.length; cIndex++) {
      let remainAmt = parseFloat((companyList[cIndex].targetAmt - usedAmt[cIndex]).toFixed(2));
      
      for (const goods of splitGoodsList) {
        if (remainAmt < 0.01) break;
        if (goods.totalAmt < 0.01) continue;
        
        const useAmt = Math.min(remainAmt, goods.totalAmt);
        const useQty = useAmt / goods.price;
        const roundedQty = parseFloat(useQty.toFixed(2));
        
        assignResult[cIndex].push({
          name: goods.name,
          quantity: roundedQty,
          price: goods.price,
          unit: goods.unit,
          amount: parseFloat(useAmt.toFixed(2)),
        });
        
        usedAmt[cIndex] = parseFloat((usedAmt[cIndex] + useAmt).toFixed(2));
        remainAmt = parseFloat((remainAmt - useAmt).toFixed(2));
        
        goods.totalQty = parseFloat((goods.totalQty - roundedQty).toFixed(2));
        goods.totalAmt = parseFloat((goods.totalAmt - useAmt).toFixed(2));
      }
    }
    
    // 构建预览结果
    for (let cIndex = 0; cIndex < companyList.length; cIndex++) {
      const actualAmt = assignResult[cIndex].reduce((sum, item) => sum + item.amount, 0);
      preview.push({
        customerName: companyList[cIndex].name,
        targetAmount: companyList[cIndex].targetAmt,
        actualAmount: parseFloat(actualAmt.toFixed(2)),
        items: assignResult[cIndex],
        shortfall: parseFloat((companyList[cIndex].targetAmt - actualAmt).toFixed(2)),
      });
    }
    
    setAllocationPreview(preview);
  }, [selectedCustomers, customerAmounts]);

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

      generateAllocationPreview(matchedItems);
    }

    if (errors.length > 0) {
      toast({
        title: `${errors.length} 条品名未匹配`,
        description: `未匹配：${errors.slice(0, 5).join("、")}${errors.length > 5 ? "..." : ""}`,
        variant: "destructive",
      });
    }
  }, [pasteData, parsePastedData, matchProducts, toast, generateAllocationPreview]);

  const toggleCustomer = (customer) => {
    setSelectedCustomers(prev => {
      const newSelected = prev.includes(customer)
        ? prev.filter(c => c !== customer)
        : [...prev, customer];
      if (previewItems.length > 0) {
        setTimeout(() => generateAllocationPreview(previewItems), 0);
      }
      return newSelected;
    });
  };

  const updateCustomerAmount = (customer, amount) => {
    setCustomerAmounts(prev => ({
      ...prev,
      [customer]: amount,
    }));
    if (previewItems.length > 0) {
      setTimeout(() => generateAllocationPreview(previewItems), 0);
    }
  };

  const getOriginalTotalAmount = useCallback(() => {
    return previewItems.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0
    );
  }, [previewItems]);

  const getCustomerTotalAmount = useCallback(() => {
    return selectedCustomers.reduce(
      (sum, customer) => {
        const amount = customerAmounts[customer];
        if (!amount || amount.trim() === "") return sum;
        const cleaned = amount.replace(/[^\d.]/g, "");
        if (cleaned === "") return sum;
        return sum + parseFloat(cleaned);
      },
      0
    );
  }, [selectedCustomers, customerAmounts]);

  const handleExport = useCallback(async () => {
    if (previewItems.length === 0) {
      toast({ title: "没有可导出的数据", variant: "destructive" });
      return;
    }

    if (selectedCustomers.length === 0) {
      toast({ title: "请至少选择一个客户", variant: "destructive" });
      return;
    }

    const originalTotal = getOriginalTotalAmount();
    const customerTotal = getCustomerTotalAmount();

    if (customerTotal === 0) {
      toast({ title: "请为客户输入金额", variant: "destructive" });
      return;
    }

    const diff = Math.abs(originalTotal - customerTotal);
    if (diff > 0.01) {
      toast({
        title: "金额不匹配",
        description: `物料总金额 ${originalTotal.toFixed(2)} 与客户总金额 ${customerTotal.toFixed(2)} 不相等`,
        variant: "destructive",
      });
      return;
    }

const now = new Date();
    const applyDate = now.toISOString().split("T")[0];

    const monthNum = parseInt(selectedMonth.split("-")[1]);
    const exportLabel = canteenName ? `${canteenName}${monthNum}月` : `${monthNum}月`;

    try {
      // 商品结构
      const goodsList = previewItems.map(item => ({
        name: item.name,
        unit: item.unit,
        price: item.price,
        taxRate: item.taxRate,
        totalQty: item.quantity,
        totalAmt: parseFloat((item.quantity * item.price).toFixed(2)),
        allowDecimal: item.unit === "斤",
      }));
      
      // 开票单位结构
      const activeCustomers = selectedCustomers.filter(c => customerAmounts[c] && customerAmounts[c].trim() !== "");
      const companyList = activeCustomers.map(name => ({
        name,
        targetAmt: parseFloat(customerAmounts[name].replace(/[^\d.]/g, "")),
      }));
      
      // 分配结果
      const assignResult = companyList.map(() => []);
      const usedAmt = companyList.map(() => 0);
      
      // 第一步：处理不可拆分商品
      const sortedCompanyIndices = companyList
        .map((c, i) => ({ index: i, targetAmt: c.targetAmt }))
        .sort((a, b) => b.targetAmt - a.targetAmt)
        .map(c => c.index);
      
      for (const goods of goodsList) {
        if (!goods.allowDecimal && goods.totalQty > 0) {
          for (const cIndex of sortedCompanyIndices) {
            const needAmt = parseFloat((companyList[cIndex].targetAmt - usedAmt[cIndex]).toFixed(2));
            if (goods.totalAmt <= needAmt + 0.01) {
              assignResult[cIndex].push({
              name: goods.name,
              unit: goods.unit,
              quantity: goods.totalQty,
              price: goods.price,
              taxRate: goods.taxRate,
              amount: goods.totalAmt,
              spec: "",
            });
              usedAmt[cIndex] = parseFloat((usedAmt[cIndex] + goods.totalAmt).toFixed(2));
              goods.totalQty = 0;
              goods.totalAmt = 0;
              break;
            }
          }
        }
      }
      
      // 第二步：处理可拆分商品
      const splitGoodsList = goodsList.filter(g => g.allowDecimal && g.totalQty > 0);
      
      for (let cIndex = 0; cIndex < companyList.length; cIndex++) {
        let remainAmt = parseFloat((companyList[cIndex].targetAmt - usedAmt[cIndex]).toFixed(2));
        
        for (const goods of splitGoodsList) {
          if (remainAmt < 0.01) break;
          if (goods.totalAmt < 0.01) continue;
          
const useAmt = Math.min(remainAmt, goods.totalAmt);
        const useQty = useAmt / goods.price;
        const roundedQty = parseFloat(useQty.toFixed(2));
        
        assignResult[cIndex].push({
          name: goods.name,
          unit: goods.unit,
          quantity: roundedQty,
          price: goods.price,
          taxRate: goods.taxRate,
          amount: parseFloat(useAmt.toFixed(2)),
          spec: "",
        });
        
        usedAmt[cIndex] = parseFloat((usedAmt[cIndex] + useAmt).toFixed(2));
        remainAmt = parseFloat((remainAmt - useAmt).toFixed(2));
        
        goods.totalQty = parseFloat((goods.totalQty - roundedQty).toFixed(2));
        goods.totalAmt = parseFloat((goods.totalAmt - useAmt).toFixed(2));
        }
      }
      
      // 导出每家发票
      for (let cIndex = 0; cIndex < companyList.length; cIndex++) {
        const customerName = companyList[cIndex].name;
        const adjustedItems = assignResult[cIndex];
        
        if (adjustedItems.length === 0) continue;

        const basicInfo = {
          companyName: "青岛青云通公共服务有限公司",
          contractNo: CUSTOMER_INFO_MAP[customerName]?.contractNo || "JK-GQ-250041-32",
          applyDate,
          department: "青云通",
          applicant: "刘雅超",
        };

        const totalAmount = adjustedItems.reduce((sum, item) => sum + item.amount, 0);

        const itemsForHistory = adjustedItems.map((item) => {
          const totalAmount = item.amount;
          const amountVal = parseFloat((totalAmount / (1 + item.taxRate)).toFixed(2));
          const taxVal = parseFloat((totalAmount - amountVal).toFixed(2));
          return {
            name: item.name,
            spec: "",
            unit: item.unit,
            quantity: parseFloat(item.quantity.toFixed(2)),
            price: item.price,
            taxRate: item.taxRate,
            amount: amountVal,
            tax: taxVal,
            total: totalAmount,
          };
        });

        const customerInfo = {
          customerName,
          taxId: CUSTOMER_INFO_MAP[customerName]?.taxId || "",
          bankName: CUSTOMER_INFO_MAP[customerName]?.bankName || "",
          bankAccount: CUSTOMER_INFO_MAP[customerName]?.bankAccount || "",
          address: CUSTOMER_INFO_MAP[customerName]?.address || "",
          phone: CUSTOMER_INFO_MAP[customerName]?.phone || "",
        };

        await exportInvoice(basicInfo, customerInfo, adjustedItems, `${exportLabel}-${customerName}`, true);

        await fetch("/api/canteen-invoice-history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            canteenName: `${exportLabel}-${customerName}`,
            customerInfo,
            items: itemsForHistory,
            totalAmount: parseFloat(totalAmount.toFixed(2)),
            contractNo: basicInfo.contractNo,
          }),
        });
      }

      toast({ title: `成功导出 ${selectedCustomers.filter(c => customerAmounts[c] && customerAmounts[c].trim() !== "").length} 份发票` });
      onOpenChange(false);
      setPasteData("");
      setPreviewItems([]);
      setMatchErrors([]);
      setCanteenName("");
      setSelectedMonth(getCurrentMonth());
      setSelectedCustomers(HUANYU_CUSTOMERS);
      const amounts = {};
      HUANYU_CUSTOMERS.forEach(c => amounts[c] = "");
      setCustomerAmounts(amounts);
      setAllocationPreview([]);
    } catch (error) {
      console.error("导出发票失败:", error);
      toast({ title: "导出发票失败", variant: "destructive" });
    }
  }, [previewItems, selectedCustomers, customerAmounts, canteenName, selectedMonth, toast, onOpenChange, getOriginalTotalAmount, getCustomerTotalAmount]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setPasteData("");
    setPreviewItems([]);
    setMatchErrors([]);
    setCanteenName("");
    setSelectedMonth(getCurrentMonth());
    setSelectedCustomers(HUANYU_CUSTOMERS);
    const amounts = {};
    HUANYU_CUSTOMERS.forEach(c => amounts[c] = "");
    setCustomerAmounts(amounts);
    setAllocationPreview([]);
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
          <DialogTitle>寰宇开票</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">食堂名称</label>
              <Input
                value={canteenName}
                onChange={(e) => setCanteenName(e.target.value)}
                placeholder="输入食堂名称"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">月份</label>
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">客户选择与金额</label>
            <div className="space-y-2 border rounded-lg p-3">
              {HUANYU_CUSTOMERS.map((customer) => (
                <div key={customer} className="flex items-center gap-3">
                  <Checkbox
                    id={customer}
                    checked={selectedCustomers.includes(customer)}
                    onCheckedChange={() => toggleCustomer(customer)}
                  />
                  <label htmlFor={customer} className="text-sm cursor-pointer flex-1">
                    {customer}
                  </label>
                  {selectedCustomers.includes(customer) && (
                    <Input
                      type="number"
                      value={customerAmounts[customer]}
                      onChange={(e) => updateCustomerAmount(customer, e.target.value)}
                      placeholder="金额"
                      className="w-32 h-8 text-sm"
                    />
                  )}
                </div>
              ))}
            </div>
            {previewItems.length > 0 && selectedCustomers.some(c => customerAmounts[c] && customerAmounts[c].trim() !== "") && (
              <div className="flex gap-4 text-sm">
                <span className="text-muted-foreground">
                  物料总金额：{formatAmount(getOriginalTotalAmount())}
                </span>
                <span className="text-muted-foreground">
                  客户总金额：{formatAmount(getCustomerTotalAmount())}
                </span>
                {Math.abs(getOriginalTotalAmount() - getCustomerTotalAmount()) < 0.01 && (
                  <span className="text-green-600">✓ 金额匹配</span>
                )}
                {Math.abs(getOriginalTotalAmount() - getCustomerTotalAmount()) >= 0.01 && getCustomerTotalAmount() > 0 && (
                  <span className="text-red-600">金额不匹配</span>
                )}
              </div>
            )}
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

          {allocationPreview.length > 0 && (
            <div className="space-y-3 border rounded-lg p-3 bg-blue-50">
              <p className="text-sm font-medium text-blue-700">分配预览</p>
              {allocationPreview.map((alloc, idx) => (
                <div key={idx} className="border rounded p-2 bg-white">
                  <p className="text-sm font-medium">{alloc.customerName}</p>
                  <p className="text-xs text-muted-foreground">
                    目标金额：{formatAmount(alloc.targetAmount)} | 实际分配：{formatAmount(alloc.actualAmount)}
                  </p>
                  {alloc.shortfall > 0 && (
                    <p className="text-xs text-red-600">缺少：{formatAmount(alloc.shortfall)}</p>
                  )}
                  <div className="mt-1 text-xs">
                    {alloc.items.slice(0, 3).map((item, i) => (
                      <span key={i} className="text-muted-foreground">
                        {item.name}({formatAmount(item.amount)})
                        {i < alloc.items.slice(0, 3).length - 1 ? "、" : ""}
                      </span>
                    ))}
                    {alloc.items.length > 3 && <span className="text-muted-foreground">等{alloc.items.length}项</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {matchErrors.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-sm text-orange-700 font-medium">
                以下品名未匹配到数据库，已添加到列表末尾（橙色背景），请手动编辑发票名称：
              </p>
              <p className="text-sm text-orange-600 mt-1">{matchErrors.join("、")}</p>
            </div>
          )}

          {previewItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                匹配结果（已匹配 {previewItems.filter(i => !i.isUnmatched).length} 条，未匹配 {previewItems.filter(i => i.isUnmatched).length} 条）
              </p>
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
                      <tr key={index} className={item.isUnmatched ? "bg-orange-50" : ""}>
                        <td className="border px-1 py-1">
                          <Input
                            value={item.name}
                            onChange={(e) => {
                              const newItems = [...previewItems];
                              newItems[index] = { ...newItems[index], name: e.target.value };
                              setPreviewItems(newItems);
                            }}
                            className={`h-7 text-sm border-0 shadow-none focus-visible:ring-1 ${item.isUnmatched ? "bg-orange-50" : ""}`}
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