"use client";

import React, { useState, useEffect, useCallback } from "react";
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
import { Search, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { exportInvoice } from "@/lib/invoiceExporter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CANTEEN_NAMES = [
  "开投大厦食堂",
  "顺泽大厦食堂",
  "经控五楼食堂",
  "经控四楼食堂",
  "经控十三楼",
  "铁山食堂",
  "小珠山食堂",
  "开投数字产业园食堂",
  "捷能高新园区食堂",
  "捷能即墨园区食堂",
];

function getCurrentMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  return `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}`;
}

export function CanteenInvoiceModal({ open, onOpenChange, products }) {
  const [pasteData, setPasteData] = useState("");
  const [previewItems, setPreviewItems] = useState([]);
  const [matchErrors, setMatchErrors] = useState([]);
  const [canteenName, setCanteenName] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [contractNo, setContractNo] = useState("");

  const fetchLatestContractNo = useCallback(async () => {
    try {
      const res = await fetch(
        "/api/canteen-invoice-history?latestContractNo=true",
      );
      const data = await res.json();
      if (data.success && data.contractNo) {
        const match = data.contractNo.match(/(\d+)$/);
        if (match) {
          setContractNo(String(parseInt(match[1]) + 1));
        }
      }
    } catch {
      // 静默失败，使用默认值
    }
  }, []);

  useEffect(() => {
    if (open) fetchLatestContractNo();
  }, [open, fetchLatestContractNo]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTargetIndex, setSearchTargetIndex] = useState(null);
  const [selectedResultIds, setSelectedResultIds] = useState(new Set());
  const [customerInfo] = useState({
    customerName: "青岛开投餐饮酒店管理有限公司",
    taxId: "91370211MABQPQYQ7A",
    bankName: "北京银行股份有限公司青岛西海岸新区支行",
    bankAccount: "20000059793200094551530",
    address: "山东省青岛市黄岛区车轮山路388号1栋2办公2116户",
    phone: "0532-86986696",
  });
  const { toast } = useToast();

  const parsePastedData = useCallback((text) => {
    const lines = text
      .trim()
      .split("\n")
      .filter((line) => line.trim());
    if (lines.length === 0) return [];

    const items = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const parts = line.split(/\t|  +/).filter((p) => p.trim());

      if (parts.length < 5) continue;

      const name = parts[0]?.trim();
      const unit = parts[1]?.trim();
      const quantity = parseFloat(parts[2]?.replace(/[^\d.]/g, "")) || 0;
      const amount = parseFloat(parts[4]?.replace(/[^\d.]/g, "")) || 0;
      // 严格按照粘贴的金额 ÷ 数量计算单价，忽略粘贴的单价列
      const unitPrice =
        amount > 0 && quantity > 0
          ? amount / quantity
          : parseFloat(parts[3]?.replace(/[^\d.]/g, "")) || 0;

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

  // 检查 input 的所有字符是否按序出现在 sequence 中（子序列匹配，处理缩写）
  function isSubsequence(input, sequence) {
    let si = 0;
    for (let i = 0; i < sequence.length && si < input.length; i++) {
      if (input[si] === sequence[i]) si++;
    }
    return si === input.length;
  }

  const getMatchScore = useCallback((product, inputName) => {
    const dbName = product.product_name.toLowerCase();
    const lastStarIndex = dbName.lastIndexOf("*");
    const productTail =
      lastStarIndex >= 0 ? dbName.substring(lastStarIndex + 1) : dbName;

    if (productTail === inputName) return 100;
    if (dbName === inputName) return 90;
    if (dbName.replace(/^\*/, "") === inputName) return 90;
    if (productTail.startsWith(inputName)) return 80;
    if (productTail.endsWith(inputName)) return 70;
    if (inputName.includes(productTail)) return 60;
    if (productTail.includes(inputName)) return 50;
    if (isSubsequence(inputName, productTail)) return 55; // 输入是尾部的子序列（如"光明酸奶"→"光明原味风味发酵乳酸奶"）
    if (isSubsequence(productTail, inputName)) return 45; // 尾部是输入的子序列（如"去皮五花肉"是"去皮下五花肉"的子序列）
    if (dbName.includes(inputName)) return 10;
    return 0;
  }, []);

  const matchProducts = useCallback(
    (items) => {
      const unmatchedItems = [];
      const matchedItems = [];

      for (const item of items) {
        const productName = item.inputName.toLowerCase();

        let bestMatch = null;
        let bestScore = 0;
        for (const p of products) {
          const score = getMatchScore(p, productName);
          if (score > bestScore) {
            bestScore = score;
            bestMatch = p;
          }
        }
        const matchedProduct = bestMatch;

        if (matchedProduct) {
          let taxRate = matchedProduct.tax_rate || 0;
          if (taxRate > 1) {
            taxRate = taxRate / 100;
          }
          const remainQty =
            matchedProduct.group_remaining != null
              ? matchedProduct.group_remaining
              : matchedProduct.remaining_quantity != null
                ? matchedProduct.remaining_quantity
                : matchedProduct.quantity;
          matchedItems.push({
            name: matchedProduct.product_name,
            originalInput: item.inputName,
            spec: matchedProduct.spec || "",
            unit: matchedProduct.unit || item.unit,
            quantity: item.quantity,
            price: item.unitPrice,
            taxRate: taxRate,
            matchedProductName: matchedProduct.product_name,
            inputAmount: item.amount,
            isUnmatched: false,
            remainingQty: remainQty,
            purchaseQty: matchedProduct.quantity,
            overInvoicing: item.quantity > remainQty,
          });
        } else {
          unmatchedItems.push({
            name: item.inputName,
            originalInput: item.inputName,
            spec: "",
            unit: item.unit,
            quantity: item.quantity,
            price: item.unitPrice,
            taxRate: 0.13,
            matchedProductName: null,
            inputAmount: item.amount,
            isUnmatched: true,
            remainingQty: 0,
            purchaseQty: 0,
            overInvoicing: false,
          });
        }
      }

      // 按物料名分组排序，相同物料相邻显示
      matchedItems.sort((a, b) => a.name.localeCompare(b.name));

      // 相同物料逐行递减剩余数量
      const remainingByProduct = {};
      for (const item of matchedItems) {
        const key = item.name;
        if (remainingByProduct[key] === undefined) {
          remainingByProduct[key] = item.remainingQty;
        }
        item.remainingQty = remainingByProduct[key];
        remainingByProduct[key] = Math.max(
          0,
          remainingByProduct[key] - item.quantity,
        );
        item.overInvoicing = item.quantity > item.remainingQty;
      }

      const allItems = [...unmatchedItems, ...matchedItems];
      const errors = unmatchedItems.map((item) => item.name);

      return { matchedItems: allItems, errors };
    },
    [products, getMatchScore],
  );

  const handleParse = useCallback(() => {
    const items = parsePastedData(pasteData);
    if (items.length === 0) {
      toast({
        title: "未解析到有效数据",
        description:
          "请确保数据格式为：品名、单位、数量、单价、金额（制表符或空格分隔）",
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

    const now = new Date();
    const applyDate = now.toISOString().split("T")[0];

    const basicInfo = {
      companyName: "青岛青云通公共服务有限公司",
      contractNo: `JK-GQ-250041-${contractNo || "32"}`,
      applyDate,
      department: "青云通",
      applicant: "刘雅超",
    };

    const monthNum = parseInt(selectedMonth.split("-")[1]);
    const exportLabel = canteenName
      ? `${canteenName}${monthNum}月`
      : `${monthNum}月`;

    try {
      await exportInvoice(
        basicInfo,
        customerInfo,
        previewItems,
        exportLabel,
        true,
        "专票",
        exportLabel,
      );

      const totalAmount = previewItems.reduce(
        (sum, item) => sum + (item.inputAmount || item.quantity * item.price),
        0,
      );

      const itemsForHistory = previewItems.map((item) => {
        const amount =
          (item.inputAmount || item.quantity * item.price) / (1 + item.taxRate);
        const tax = amount * item.taxRate;
        const total = amount + tax;
        return {
          name: item.name,
          spec: item.spec,
          unit: item.unit,
          quantity: item.quantity,
          price: item.price,
          taxRate: item.taxRate,
          amount,
          tax,
          total,
        };
      });

      await fetch("/api/canteen-invoice-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          canteenName: exportLabel,
          customerInfo,
          items: itemsForHistory,
          totalAmount,
          contractNo: `JK-GQ-250041-${contractNo || "32"}`,
        }),
      });

      toast({ title: "发票导出成功" });
      onOpenChange(false);
      setPasteData("");
      setPreviewItems([]);
      setMatchErrors([]);
      setCanteenName("");
      setContractNo("");
      setSelectedMonth(getCurrentMonth());
    } catch (error) {
      console.error("导出发票失败:", error);
      toast({ title: "导出发票失败", variant: "destructive" });
    }
  }, [
    previewItems,
    customerInfo,
    canteenName,
    contractNo,
    selectedMonth,
    toast,
    onOpenChange,
  ]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setPasteData("");
    setPreviewItems([]);
    setMatchErrors([]);
    setCanteenName("");
    setContractNo("");
    setSelectedMonth(getCurrentMonth());
  }, [onOpenChange]);

  const handleSearchProduct = useCallback(async (name, index) => {
    setSearchQuery(name);
    setSearchTargetIndex(index);
    setSearching(true);
    setSearchModalOpen(true);
    setSelectedResultIds(new Set());
    try {
      const params = new URLSearchParams({ search: name });
      const res = await fetch(`/api/canteen-purchase-orders?${params}`);
      const data = await res.json();
      setSearchResults(data.success ? data.data : []);
    } catch (error) {
      setSearchResults([]);
    }
    setSearching(false);
  }, []);

  const handleReSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const params = new URLSearchParams({ search: searchQuery.trim() });
      const res = await fetch(`/api/canteen-purchase-orders?${params}`);
      const data = await res.json();
      setSearchResults(data.success ? data.data : []);
    } catch (error) {
      setSearchResults([]);
    }
    setSearching(false);
  }, [searchQuery]);

  const toggleSelectResult = useCallback((idx) => {
    setSelectedResultIds((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedResultIds((prev) => {
      if (prev.size === searchResults.length) return new Set();
      return new Set(searchResults.map((_, i) => i));
    });
  }, [searchResults]);

  const handleAddSelected = useCallback(() => {
    if (searchTargetIndex === null || selectedResultIds.size === 0) return;
    const newItems = [...previewItems];
    const originItem = newItems[searchTargetIndex];
    const oldName = originItem.name;
    const newRows = [];
    for (const idx of selectedResultIds) {
      const result = searchResults[idx];
      if (!result) continue;
      const remainQty =
        result.remaining_quantity != null
          ? result.remaining_quantity
          : result.quantity;
      newRows.push({
        name: result.product_name,
        originalInput: originItem.originalInput,
        spec: result.spec || "",
        unit: result.unit || originItem.unit,
        quantity: remainQty,
        price: result.unit_price || originItem.price,
        taxRate:
          result.tax_rate != null
            ? result.tax_rate > 1
              ? result.tax_rate / 100
              : result.tax_rate
            : originItem.taxRate,
        matchedProductName: result.product_name,
        inputAmount: 0,
        isUnmatched: false,
        remainingQty: remainQty,
        purchaseQty: result.quantity,
        overInvoicing: false,
      });
    }
    newItems.splice(searchTargetIndex, 1, ...newRows);
    setPreviewItems(newItems);
    setMatchErrors((prev) => {
      const idx = prev.indexOf(oldName);
      if (idx === -1) return prev;
      const next = [...prev];
      next.splice(idx, 1);
      return next;
    });
    setSelectedResultIds(new Set());
  }, [searchTargetIndex, selectedResultIds, searchResults, previewItems]);

  const handleSelectSearchResult = useCallback(
    (selectedProduct) => {
      if (searchTargetIndex !== null && selectedProduct) {
        const newItems = [...previewItems];
        const item = { ...newItems[searchTargetIndex] };
        const oldName = item.name;
        const unitRemainQty =
          selectedProduct.remaining_quantity != null
            ? selectedProduct.remaining_quantity
            : selectedProduct.quantity;
        const groupRemainQty =
          selectedProduct.group_remaining != null
            ? selectedProduct.group_remaining
            : unitRemainQty;
        item.name = selectedProduct.product_name;
        item.spec = selectedProduct.spec || "";
        item.unit = selectedProduct.unit || item.unit;
        item.price =
          item.quantity > 0
            ? item.inputAmount / item.quantity
            : selectedProduct.unit_price || item.price;
        item.taxRate =
          selectedProduct.tax_rate != null
            ? selectedProduct.tax_rate > 1
              ? selectedProduct.tax_rate / 100
              : selectedProduct.tax_rate
            : item.taxRate;
        item.remainingQty = groupRemainQty;
        item.purchaseQty = selectedProduct.quantity;
        item.overInvoicing = item.quantity > groupRemainQty;
        item.isUnmatched = false;
        newItems[searchTargetIndex] = item;
        setPreviewItems(newItems);
        setMatchErrors((prev) => {
          const idx = prev.indexOf(oldName);
          if (idx === -1) return prev;
          const next = [...prev];
          next.splice(idx, 1);
          return next;
        });
      }
      setSearchModalOpen(false);
      setSelectedResultIds(new Set());
    },
    [searchTargetIndex, previewItems],
  );

  const formatAmount = (amount) => {
    return new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency: "CNY",
    }).format(amount || 0);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>食堂采购单开票</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">食堂名称</label>
                <Select value={canteenName} onValueChange={setCanteenName}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择食堂" />
                  </SelectTrigger>
                  <SelectContent>
                    {CANTEEN_NAMES.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">月份</label>
                <Input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">合同号</label>
                <Input
                  value={contractNo}
                  onChange={(e) => setContractNo(e.target.value)}
                  placeholder="32"
                />
                <p className="text-xs text-muted-foreground">
                  JK-GQ-250041-{contractNo || "32"}
                </p>
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
                示例格式：鸡翅根 20斤/箱 5 132 660.00
              </p>
            </div>

            <Button onClick={handleParse} className="w-full">
              解析并匹配
            </Button>

            {matchErrors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700 font-medium">
                  以下品名未匹配到数据库（已标红），请手动编辑发票名称：
                </p>
                <p className="text-sm text-red-600 mt-1">
                  {matchErrors.join("、")}
                </p>
              </div>
            )}

            {previewItems.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  匹配结果（已匹配{" "}
                  {previewItems.filter((i) => !i.isUnmatched).length} 条，未匹配{" "}
                  {previewItems.filter((i) => i.isUnmatched).length} 条）
                </p>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-muted">
                        <th className="border px-2 py-1 text-center w-10">
                          序号
                        </th>
                        <th className="border px-2 py-1 text-left">
                          粘贴数据 → 匹配数据
                        </th>
                        <th className="border px-2 py-1 text-center">单位</th>
                        <th className="border px-2 py-1 text-right">
                          开票数量
                        </th>
                        <th className="border px-2 py-1 text-right">
                          剩余数量
                        </th>
                        <th className="border px-2 py-1 text-right">单价</th>
                        <th className="border px-2 py-1 text-right">金额</th>
                        <th className="border px-2 py-1 text-right">税率</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewItems.map((item, index) => (
                        <tr
                          key={index}
                          className={item.isUnmatched ? "bg-red-50" : ""}
                        >
                          <td className="border px-2 py-1 text-center text-muted-foreground text-xs">
                            {index + 1}
                          </td>
                          <td className="border px-1 py-1">
                            <div className="flex items-center gap-1">
                              {!item.isUnmatched && (
                                <span className="text-muted-foreground text-xs whitespace-nowrap shrink-0">
                                  {item.originalInput} →
                                </span>
                              )}
                              <Input
                                value={item.name}
                                onChange={(e) => {
                                  const newItems = [...previewItems];
                                  newItems[index] = {
                                    ...newItems[index],
                                    name: e.target.value,
                                  };
                                  setPreviewItems(newItems);
                                }}
                                className={`h-7 text-sm border-0 shadow-none focus-visible:ring-1 ${item.isUnmatched ? "bg-red-50 text-red-600 border-red-200" : ""}`}
                              />
                              {item.isUnmatched || item.overInvoicing ? (
                                <button
                                  onClick={() =>
                                    handleSearchProduct(item.name, index)
                                  }
                                  className="shrink-0 p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground cursor-pointer"
                                  title="查询食堂采购单"
                                >
                                  <Search className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  onClick={() =>
                                    handleSearchProduct(item.name, index)
                                  }
                                  className="shrink-0 p-1 hover:bg-muted rounded text-muted-foreground/50 hover:text-foreground cursor-pointer opacity-50 hover:opacity-100"
                                  title="点击查询其他采购单"
                                >
                                  <Search className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="border px-2 py-1 text-center">
                            {item.unit}
                          </td>
                          <td
                            className={`border px-2 py-1 text-right ${item.overInvoicing ? "text-destructive font-bold" : ""}`}
                          >
                            <Input
                              type="number"
                              step="1"
                              min="0"
                              value={item.quantity}
                              onChange={(e) => {
                                const newItems = [...previewItems];
                                const qty = parseFloat(e.target.value) || 0;
                                const currentAmount =
                                  newItems[index].inputAmount || 0;
                                newItems[index] = {
                                  ...newItems[index],
                                  quantity: qty,
                                  price: qty > 0 ? currentAmount / qty : 0,
                                };
                                // 重新计算同物料后序行的剩余数量
                                const productName = newItems[index].name;
                                let baseRemaining = null;
                                for (let i = 0; i < newItems.length; i++) {
                                  if (
                                    newItems[i].name !== productName ||
                                    newItems[i].isUnmatched
                                  )
                                    continue;
                                  if (baseRemaining === null) {
                                    baseRemaining = newItems[i].remainingQty;
                                  } else {
                                    const prevQty =
                                      newItems[i - 1].quantity || 0;
                                    baseRemaining = Math.max(
                                      0,
                                      baseRemaining - prevQty,
                                    );
                                  }
                                  newItems[i] = {
                                    ...newItems[i],
                                    remainingQty: baseRemaining,
                                    overInvoicing:
                                      newItems[i].quantity > baseRemaining,
                                  };
                                }
                                setPreviewItems(newItems);
                              }}
                              className={`h-7 text-sm text-right border-0 shadow-none focus-visible:ring-1 w-16 ${
                                item.overInvoicing
                                  ? "text-destructive font-bold"
                                  : ""
                              }`}
                            />
                            {item.overInvoicing && (
                              <span className="ml-1 text-xs">⚠</span>
                            )}
                          </td>
                          <td className="border px-2 py-1 text-right">
                            {item.isUnmatched ? "-" : item.remainingQty}
                          </td>
                          <td className="border px-2 py-1 text-right">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.price}
                              onChange={(e) => {
                                const newItems = [...previewItems];
                                const newPrice =
                                  parseFloat(e.target.value) || 0;
                                newItems[index] = {
                                  ...newItems[index],
                                  price: newPrice,
                                  inputAmount:
                                    newPrice * (newItems[index].quantity || 0),
                                };
                                setPreviewItems(newItems);
                              }}
                              className="h-7 text-sm text-right border-0 shadow-none focus-visible:ring-1 w-20 ml-auto"
                            />
                          </td>
                          <td className="border px-2 py-1 text-right font-mono">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.inputAmount || 0}
                              onChange={(e) => {
                                const newItems = [...previewItems];
                                const newAmount =
                                  parseFloat(e.target.value) || 0;
                                const qty = newItems[index].quantity || 1;
                                newItems[index] = {
                                  ...newItems[index],
                                  inputAmount: newAmount,
                                  price: newAmount / qty,
                                };
                                setPreviewItems(newItems);
                              }}
                              className="h-7 text-sm text-right border-0 shadow-none focus-visible:ring-1 w-20 ml-auto font-mono"
                            />
                          </td>
                          <td className="border px-2 py-1 text-right">
                            {(item.taxRate * 100).toFixed(0)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-4 text-sm text-muted-foreground items-center">
                  <span>共 {previewItems.length} 条</span>
                  <span>
                    合计金额：{" "}
                    {formatAmount(
                      previewItems.reduce(
                        (sum, item) =>
                          sum +
                          (item.inputAmount || item.quantity * item.price),
                        0,
                      ),
                    )}
                  </span>
                  {previewItems.filter((i) => i.overInvoicing).length > 0 && (
                    <span className="text-destructive font-medium">
                      ⚠ {previewItems.filter((i) => i.overInvoicing).length}{" "}
                      条开票数量超过剩余数量
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              取消
            </Button>
            <Button
              onClick={handleExport}
              disabled={previewItems.length === 0}
              className="px-8"
            >
              导出发票
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={searchModalOpen} onOpenChange={setSearchModalOpen}>
        <DialogContent className="max-w-3xl max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>查询食堂采购单</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="输入品名搜索..."
                className="flex-1 h-8"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleReSearch();
                }}
              />
              <Button
                onClick={handleReSearch}
                disabled={searching}
                size="sm"
                className="h-8"
              >
                <Search className="w-3.5 h-3.5 mr-1" />
                搜索
              </Button>
            </div>
            {searching ? (
              <p className="text-muted-foreground text-center py-4">
                查询中...
              </p>
            ) : searchResults.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                未找到匹配结果
              </p>
            ) : (
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted">
                      <th className="border px-2 py-1 text-center w-8">
                        <input
                          type="checkbox"
                          checked={
                            selectedResultIds.size === searchResults.length &&
                            searchResults.length > 0
                          }
                          onChange={toggleSelectAll}
                          className="cursor-pointer"
                        />
                      </th>
                      <th className="border px-2 py-1 text-left">品名</th>
                      <th className="border px-2 py-1 text-center">规格</th>
                      <th className="border px-2 py-1 text-center">单位</th>
                      <th className="border px-2 py-1 text-center">供应商</th>
                      <th className="border px-2 py-1 text-right">采购数量</th>
                      <th className="border px-2 py-1 text-right">剩余数量</th>
                      <th className="border px-2 py-1 text-center">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults.map((result, idx) => (
                      <tr
                        key={idx}
                        className={`hover:bg-muted/50 ${selectedResultIds.has(idx) ? "bg-primary/5" : ""}`}
                      >
                        <td className="border px-2 py-1 text-center">
                          <input
                            type="checkbox"
                            checked={selectedResultIds.has(idx)}
                            onChange={() => toggleSelectResult(idx)}
                            className="cursor-pointer"
                          />
                        </td>
                        <td className="border px-2 py-1">
                          {result.product_name}
                        </td>
                        <td className="border px-2 py-1 text-center">
                          {result.spec || ""}
                        </td>
                        <td className="border px-2 py-1 text-center">
                          {result.unit || ""}
                        </td>
                        <td className="border px-2 py-1 text-center">
                          {result.supplier_name || ""}
                        </td>
                        <td className="border px-2 py-1 text-right">
                          {result.quantity}
                        </td>
                        <td
                          className={`border px-2 py-1 text-right ${(result.remaining_quantity ?? result.quantity) <= 0 ? "text-destructive" : ""}`}
                        >
                          {result.remaining_quantity != null
                            ? result.remaining_quantity
                            : result.quantity}
                        </td>
                        <td className="border px-2 py-1 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              handleSelectSearchResult(result);
                              setSelectedResultIds(new Set());
                            }}
                            className="h-7 text-xs"
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            选择
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <DialogFooter className="flex justify-between items-center">
            <div className="flex gap-2">
              {selectedResultIds.size > 0 && (
                <Button onClick={handleAddSelected} size="sm">
                  添加选中 ({selectedResultIds.size})
                </Button>
              )}
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setSearchModalOpen(false);
                setSelectedResultIds(new Set());
              }}
            >
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
