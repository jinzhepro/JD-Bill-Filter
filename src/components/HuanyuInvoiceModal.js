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
import { Search, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { exportInvoice } from "@/lib/invoiceExporter";
import { HUANYU_COMPANY_INFO, CANTEEN_COMPANY_INFO } from "@/lib/constants";
import Decimal from "decimal.js";
import { cleanAmountString } from "@/lib/utils";
import logger from "@/lib/logger";

const HUANYU_CUSTOMERS = [
  "山东省兴邦人力资源集团有限公司",
  "连云港翱翔人力资源有限公司",
  "寰宇东方国际集装箱（青岛）有限公司",
];

const CUSTOMER_INFO_MAP = {
  山东省兴邦人力资源集团有限公司: {
    taxId: "91370211334209496N",
    bankName: "",
    bankAccount: "",
    address: "",
    phone: "",
    contractNo: "JK-GQ-250120",
  },
  连云港翱翔人力资源有限公司: {
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
  const year = now.getFullYear();
  const month = now.getMonth();
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  return `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}`;
}

export function HuanyuInvoiceModal({ open, onOpenChange, products }) {
  const [pasteData, setPasteData] = useState("");
  const [previewItems, setPreviewItems] = useState([]);
  const [matchErrors, setMatchErrors] = useState([]);

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [searchResults, setSearchResults] = useState([]);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTargetIndex, setSearchTargetIndex] = useState(null);
  const [selectedResultIds, setSelectedResultIds] = useState(new Set());
  const [selectedCustomers, setSelectedCustomers] = useState(HUANYU_CUSTOMERS);
  const [customerAmounts, setCustomerAmounts] = useState(() => {
    const amounts = {};
    HUANYU_CUSTOMERS.forEach((c) => (amounts[c] = ""));
    return amounts;
  });
  const [allocationPreview, setAllocationPreview] = useState([]);
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
    if (isSubsequence(inputName, productTail)) return 55;
    if (isSubsequence(productTail, inputName)) return 45;
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
            unit: item.unit,
            quantity: item.quantity,
            price: item.unitPrice,
            taxRate: taxRate,
            matchedProductName: matchedProduct.product_name,
            inputAmount: item.amount,
            isUnmatched: false,
            remainingQty: remainQty,
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

  const generateAllocationPreview = useCallback(
    (items) => {
      const preview = [];

      // 商品结构（使用 Decimal 确保精度）
      const goodsList = items.map((item) => {
        const qty = new Decimal(item.quantity || 0);
        const price = new Decimal(cleanAmountString(item.price));
        return {
          name: item.name,
          unit: item.unit,
          price: item.price,
          taxRate: item.taxRate,
          totalQty: item.quantity,
          totalAmtD: qty.times(price),
          totalAmt: parseFloat(qty.times(price).toFixed(2)),
          allowDecimal: item.unit === "斤",
        };
      });

      // 开票单位结构（筛选有效客户）
      const activeCustomers = selectedCustomers.filter(
        (c) => customerAmounts[c] && customerAmounts[c].trim() !== "",
      );
      const companyList = activeCustomers.map((name) => ({
        name,
        targetAmtD: new Decimal(cleanAmountString(customerAmounts[name])),
        targetAmt: parseFloat(cleanAmountString(customerAmounts[name])),
      }));

      // 分配结果：companyIndex -> [{商品名称, 数量, 金额}]
      const assignResult = companyList.map(() => []);
      const usedAmtD = companyList.map(() => new Decimal(0));

      // 第一步：处理不可拆分商品（整体分配给金额最大的客户）
      const sortedCompanyIndices = companyList
        .map((c, i) => ({ index: i, targetAmt: c.targetAmt }))
        .sort((a, b) => b.targetAmt - a.targetAmt)
        .map((c) => c.index);

      for (const goods of goodsList) {
        if (!goods.allowDecimal && goods.totalQty > 0) {
          for (const cIndex of sortedCompanyIndices) {
            const needAmt = companyList[cIndex].targetAmtD.minus(
              usedAmtD[cIndex],
            );
            if (goods.totalAmtD.lte(needAmt.plus(0.01))) {
              assignResult[cIndex].push({
                name: goods.name,
                quantity: goods.totalQty,
                price: goods.price,
                unit: goods.unit,
                amount: goods.totalAmt,
              });
              usedAmtD[cIndex] = usedAmtD[cIndex].plus(goods.totalAmtD);
              goods.totalQty = 0;
              goods.totalAmt = 0;
              goods.totalAmtD = new Decimal(0);
              break;
            }
          }
        }
      }

      // 第二步：处理可拆分商品（斤），补差到目标金额
      const splitGoodsList = goodsList.filter(
        (g) => g.allowDecimal && g.totalQty > 0,
      );

      for (let cIndex = 0; cIndex < companyList.length; cIndex++) {
        let remainAmt = companyList[cIndex].targetAmtD.minus(usedAmtD[cIndex]);

        for (const goods of splitGoodsList) {
          if (remainAmt.lt(0.01)) break;
          if (goods.totalAmtD.lt(0.01)) continue;

          const useAmt = Decimal.min(remainAmt, goods.totalAmtD);
          const useQty = useAmt.div(
            new Decimal(cleanAmountString(goods.price)),
          );
          const roundedQty = parseFloat(useQty.toFixed(2));

          assignResult[cIndex].push({
            name: goods.name,
            quantity: roundedQty,
            price: goods.price,
            unit: goods.unit,
            amount: parseFloat(useAmt.toFixed(2)),
          });

          usedAmtD[cIndex] = usedAmtD[cIndex].plus(useAmt);
          remainAmt = remainAmt.minus(useAmt);

          goods.totalQty = parseFloat(
            new Decimal(goods.totalQty || 0)
              .minus(new Decimal(roundedQty || 0))
              .toFixed(2),
          );
          goods.totalAmtD = goods.totalAmtD.minus(useAmt);
          goods.totalAmt = parseFloat(goods.totalAmtD.toFixed(2));
        }
      }

      // 构建预览结果
      for (let cIndex = 0; cIndex < companyList.length; cIndex++) {
        const actualAmtD = assignResult[cIndex].reduce(
          (sum, item) => sum.plus(new Decimal(cleanAmountString(item.amount))),
          new Decimal(0),
        );
        preview.push({
          customerName: companyList[cIndex].name,
          targetAmount: companyList[cIndex].targetAmt,
          actualAmount: parseFloat(actualAmtD.toFixed(2)),
          items: assignResult[cIndex],
          shortfall: parseFloat(
            companyList[cIndex].targetAmtD.minus(actualAmtD).toFixed(2),
          ),
        });
      }

      setAllocationPreview(preview);
    },
    [selectedCustomers, customerAmounts],
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

      generateAllocationPreview(matchedItems);
    }

    if (errors.length > 0) {
      toast({
        title: `${errors.length} 条品名未匹配`,
        description: `未匹配：${errors.slice(0, 5).join("、")}${errors.length > 5 ? "..." : ""}`,
        variant: "destructive",
      });
    }
  }, [
    pasteData,
    parsePastedData,
    matchProducts,
    toast,
    generateAllocationPreview,
  ]);

  const toggleCustomer = (customer) => {
    setSelectedCustomers((prev) => {
      const newSelected = prev.includes(customer)
        ? prev.filter((c) => c !== customer)
        : [...prev, customer];
      if (previewItems.length > 0) {
        setTimeout(() => generateAllocationPreview(previewItems), 0);
      }
      return newSelected;
    });
  };

  const updateCustomerAmount = (customer, amount) => {
    setCustomerAmounts((prev) => ({
      ...prev,
      [customer]: amount,
    }));
    if (previewItems.length > 0) {
      setTimeout(() => generateAllocationPreview(previewItems), 0);
    }
  };

  const getOriginalTotalAmount = useCallback(() => {
    return previewItems
      .reduce((sum, item) => {
        const qty = new Decimal(item.quantity || 0);
        const price = new Decimal(cleanAmountString(item.price));
        return sum.plus(qty.times(price));
      }, new Decimal(0))
      .toNumber();
  }, [previewItems]);

  const getCustomerTotalAmount = useCallback(() => {
    return selectedCustomers
      .reduce((sum, customer) => {
        const amount = customerAmounts[customer];
        if (!amount || amount.trim() === "") return sum;
        const cleaned = cleanAmountString(amount);
        if (cleaned === "0") return sum;
        return sum.plus(new Decimal(cleaned));
      }, new Decimal(0))
      .toNumber();
  }, [selectedCustomers, customerAmounts]);

  const amountDiffers = useCallback(() => {
    const original = new Decimal(getOriginalTotalAmount());
    const customer = new Decimal(getCustomerTotalAmount());
    return !original.minus(customer).abs().lt(0.01);
  }, [getOriginalTotalAmount, getCustomerTotalAmount]);

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

    if (amountDiffers()) {
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
    const exportLabel = `${monthNum}月`;

    try {
      // 商品结构（使用 Decimal 确保精度）
      const goodsList = previewItems.map((item) => {
        const qty = new Decimal(item.quantity || 0);
        const price = new Decimal(cleanAmountString(item.price));
        const totalAmt = qty.times(price);
        return {
          name: item.name,
          unit: item.unit,
          price: item.price,
          taxRate: item.taxRate,
          totalQty: item.quantity,
          totalAmtD: totalAmt,
          totalAmt: totalAmt.toNumber(),
          allowDecimal: item.unit === "斤",
        };
      });

      // 开票单位结构（使用 Decimal 确保精度）
      const activeCustomers = selectedCustomers.filter(
        (c) => customerAmounts[c] && customerAmounts[c].trim() !== "",
      );
      const companyList = activeCustomers.map((name) => ({
        name,
        targetAmtD: new Decimal(cleanAmountString(customerAmounts[name])),
        targetAmt: parseFloat(cleanAmountString(customerAmounts[name])),
      }));

      // 分配结果
      const assignResult = companyList.map(() => []);
      const usedAmtD = companyList.map(() => new Decimal(0));

      // 第一步：处理不可拆分商品
      const sortedCompanyIndices = companyList
        .map((c, i) => ({ index: i, targetAmt: c.targetAmt }))
        .sort((a, b) => b.targetAmt - a.targetAmt)
        .map((c) => c.index);

      for (const goods of goodsList) {
        if (!goods.allowDecimal && goods.totalQty > 0) {
          for (const cIndex of sortedCompanyIndices) {
            const needAmt = companyList[cIndex].targetAmtD.minus(
              usedAmtD[cIndex],
            );
            if (goods.totalAmtD.lte(needAmt.plus(0.01))) {
              assignResult[cIndex].push({
                name: goods.name,
                unit: goods.unit,
                quantity: goods.totalQty,
                price: goods.price,
                taxRate: goods.taxRate,
                amount: goods.totalAmt,
                spec: "",
              });
              usedAmtD[cIndex] = usedAmtD[cIndex].plus(goods.totalAmtD);
              goods.totalQty = 0;
              goods.totalAmt = 0;
              goods.totalAmtD = new Decimal(0);
              break;
            }
          }
        }
      }

      // 第二步：处理可拆分商品
      const splitGoodsList = goodsList.filter(
        (g) => g.allowDecimal && g.totalQty > 0,
      );

      for (let cIndex = 0; cIndex < companyList.length; cIndex++) {
        let remainAmt = companyList[cIndex].targetAmtD.minus(usedAmtD[cIndex]);

        for (const goods of splitGoodsList) {
          if (remainAmt.lt(0.01)) break;
          if (goods.totalAmtD.lt(0.01)) continue;

          const useAmt = Decimal.min(remainAmt, goods.totalAmtD);
          const useQty = useAmt.div(
            new Decimal(cleanAmountString(goods.price)),
          );
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

          usedAmtD[cIndex] = usedAmtD[cIndex].plus(useAmt);
          remainAmt = remainAmt.minus(useAmt);

          goods.totalQty = parseFloat(
            new Decimal(goods.totalQty || 0)
              .minus(new Decimal(roundedQty || 0))
              .toFixed(2),
          );
          goods.totalAmtD = goods.totalAmtD.minus(useAmt);
          goods.totalAmt = parseFloat(goods.totalAmtD.toFixed(2));
        }
      }

      // 导出每家发票
      for (let cIndex = 0; cIndex < companyList.length; cIndex++) {
        const customerName = companyList[cIndex].name;
        const adjustedItems = assignResult[cIndex];

        if (adjustedItems.length === 0) continue;

        const basicInfo = {
          ...HUANYU_COMPANY_INFO,
          contractNo:
            CUSTOMER_INFO_MAP[customerName]?.contractNo ||
            CANTEEN_COMPANY_INFO.contractNo,
          applyDate,
        };

        const totalAmountD = adjustedItems.reduce(
          (sum, item) => sum.plus(new Decimal(cleanAmountString(item.amount))),
          new Decimal(0),
        );

        const itemsForHistory = adjustedItems.map((item) => {
          const totalD = new Decimal(cleanAmountString(item.amount));
          const rate = new Decimal(item.taxRate || 0);
          const amountVal = totalD.div(new Decimal(1).plus(rate));
          const taxVal = totalD.minus(amountVal);
          return {
            name: item.name,
            spec: "",
            unit: item.unit,
            quantity: parseFloat(new Decimal(item.quantity || 0).toFixed(2)),
            price: item.price,
            taxRate: item.taxRate,
            amount: parseFloat(amountVal.toFixed(2)),
            tax: parseFloat(taxVal.toFixed(2)),
            total: parseFloat(totalD.toFixed(2)),
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

        await exportInvoice(
          basicInfo,
          customerInfo,
          adjustedItems,
          exportLabel,
          true,
        );

        await fetch("/api/canteen-invoice-history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            canteenName: `${exportLabel}-${customerName}`,
            customerInfo,
            items: itemsForHistory,
            totalAmount: parseFloat(totalAmountD.toFixed(2)),
            contractNo: basicInfo.contractNo,
          }),
        });
      }

      toast({
        title: `成功导出 ${selectedCustomers.filter((c) => customerAmounts[c] && customerAmounts[c].trim() !== "").length} 份发票`,
      });
      onOpenChange(false);
      setPasteData("");
      setPreviewItems([]);
      setMatchErrors([]);
      setSelectedMonth(getCurrentMonth());
      setSelectedCustomers(HUANYU_CUSTOMERS);
      const amounts = {};
      HUANYU_CUSTOMERS.forEach((c) => (amounts[c] = ""));
      setCustomerAmounts(amounts);
      setAllocationPreview([]);
    } catch (error) {
      logger.error("导出发票失败:", error);
      toast({ title: "导出发票失败", variant: "destructive" });
    }
  }, [
    previewItems,
    selectedCustomers,
    customerAmounts,
    selectedMonth,
    toast,
    onOpenChange,
    amountDiffers,
    getOriginalTotalAmount,
    getCustomerTotalAmount,
  ]);

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
    } catch {
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
    } catch {
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
        result.group_remaining != null
          ? result.group_remaining
          : result.remaining_quantity != null
            ? result.remaining_quantity
            : result.quantity;
      newRows.push({
        name: result.product_name,
        originalInput: originItem.originalInput,
        spec: result.spec || "",
        unit: result.unit || originItem.unit,
        quantity: result.quantity,
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
        overInvoicing: result.quantity > remainQty,
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
    setSearchModalOpen(false);
  }, [searchTargetIndex, selectedResultIds, searchResults, previewItems]);

  const handleSelectSearchResult = useCallback(
    (selectedProduct) => {
      if (searchTargetIndex !== null && selectedProduct) {
        const newItems = [...previewItems];
        const item = { ...newItems[searchTargetIndex] };
        const oldName = item.name;
        const remainQty =
          selectedProduct.group_remaining != null
            ? selectedProduct.group_remaining
            : selectedProduct.remaining_quantity != null
              ? selectedProduct.remaining_quantity
              : selectedProduct.quantity;
        item.name = selectedProduct.product_name;
        item.isUnmatched = false;
        item.remainingQty = remainQty;
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

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setPasteData("");
    setPreviewItems([]);
    setMatchErrors([]);
    setSelectedMonth(getCurrentMonth());
    setSelectedCustomers(HUANYU_CUSTOMERS);
    const amounts = {};
    HUANYU_CUSTOMERS.forEach((c) => (amounts[c] = ""));
    setCustomerAmounts(amounts);
    setAllocationPreview([]);
    setSelectedResultIds(new Set());
  }, [onOpenChange]);

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
            <DialogTitle>寰宇开票</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">月份</label>
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
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
                    <label
                      htmlFor={customer}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {customer}
                    </label>
                    {selectedCustomers.includes(customer) && (
                      <Input
                        type="number"
                        value={customerAmounts[customer]}
                        onChange={(e) =>
                          updateCustomerAmount(customer, e.target.value)
                        }
                        placeholder="金额"
                        className="w-32 h-8 text-sm"
                      />
                    )}
                  </div>
                ))}
              </div>
              {previewItems.length > 0 &&
                selectedCustomers.some(
                  (c) => customerAmounts[c] && customerAmounts[c].trim() !== "",
                ) && (
                  <div className="flex gap-4 text-sm">
                    <span className="text-muted-foreground">
                      物料总金额：{formatAmount(getOriginalTotalAmount())}
                    </span>
                    <span className="text-muted-foreground">
                      客户总金额：{formatAmount(getCustomerTotalAmount())}
                    </span>
                    {Math.abs(
                      getOriginalTotalAmount() - getCustomerTotalAmount(),
                    ) < 0.01 && (
                      <span className="text-green-600">✓ 金额匹配</span>
                    )}
                    {Math.abs(
                      getOriginalTotalAmount() - getCustomerTotalAmount(),
                    ) >= 0.01 &&
                      getCustomerTotalAmount() > 0 && (
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
                示例格式：鸡翅根 20斤/箱 5 132 660.00
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
                      目标金额：{formatAmount(alloc.targetAmount)} | 实际分配：
                      {formatAmount(alloc.actualAmount)}
                    </p>
                    {alloc.shortfall > 0 && (
                      <p className="text-xs text-red-600">
                        缺少：{formatAmount(alloc.shortfall)}
                      </p>
                    )}
                    <div className="mt-1 text-xs">
                      {alloc.items.slice(0, 3).map((item, i) => (
                        <span key={i} className="text-muted-foreground">
                          {item.name}({formatAmount(item.amount)})
                          {i < alloc.items.slice(0, 3).length - 1 ? "、" : ""}
                        </span>
                      ))}
                      {alloc.items.length > 3 && (
                        <span className="text-muted-foreground">
                          等{alloc.items.length}项
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

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
                                  price:
                                    qty > 0
                                      ? parseFloat(
                                          (currentAmount / qty).toFixed(2),
                                        )
                                      : 0,
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
                            {item.isUnmatched
                              ? "-"
                              : (item.remainingQty ?? "-")}
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
                                  inputAmount: parseFloat(
                                    (
                                      newPrice * (newItems[index].quantity || 0)
                                    ).toFixed(2),
                                  ),
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
                                  price: parseFloat(
                                    (newAmount / qty).toFixed(2),
                                  ),
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

                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>共 {previewItems.length} 条</span>
                  <span>
                    合计金额：
                    {formatAmount(
                      previewItems.reduce(
                        (sum, item) => sum + item.quantity * item.price,
                        0,
                      ),
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
