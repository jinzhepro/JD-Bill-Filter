"use client";

import React, { useState, useMemo } from "react";
import { useInvoice } from "@/context/InvoiceContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, FileText } from "lucide-react";
import Decimal from "decimal.js";
import { InvoiceImportModal } from "./InvoiceImportModal";

export function InvoiceLineItems() {
  const { lineItems, addLineItem, updateLineItem, removeLineItem, setInvoiceDate } = useInvoice();
  const [importModalOpen, setImportModalOpen] = useState(false);

  const getCurrentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  const handleAddItem = () => {
    addLineItem({
      name: "",
      spec: "",
      unit: "箱",
      quantity: 0,
      price: 0,
      taxRate: 0.13,
      date: new Date().toISOString().split("T")[0],
    });
  };

  const handleImport = (items) => {
    items.forEach((item) => addLineItem(item));
  };

  const handleChange = (index, field, value) => {
    let parsedValue = value;
    if (field === "quantity" || field === "price" || field === "taxRate") {
      parsedValue = parseFloat(value) || 0;
    }
    updateLineItem(index, { [field]: parsedValue });
  };

  const calculateRow = (item) => {
    const quantity = new Decimal(item.quantity || 0);
    const price = new Decimal(item.price || 0);
    const taxRate = new Decimal(item.taxRate || 0.13);
    const amount = quantity.times(price).div(new Decimal(1).plus(taxRate));
    const tax = amount.times(taxRate);
    const total = amount.plus(tax);
    return {
      amount: amount.toFixed(2),
      tax: tax.toFixed(2),
      total: total.toFixed(2),
    };
  };

  const calculateTotals = () => {
    const totalQuantity = lineItems.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
    const totals = lineItems.reduce((sum, item) => {
      const row = calculateRow(item);
      return {
        amount: sum.amount + parseFloat(row.amount),
        tax: sum.tax + parseFloat(row.tax),
        total: sum.total + parseFloat(row.total),
      };
    }, { amount: 0, tax: 0, total: 0 });
    return {
      quantity: totalQuantity.toFixed(2),
      amount: totals.amount.toFixed(2),
      tax: totals.tax.toFixed(2),
      total: totals.total.toFixed(2),
    };
  };

  const groupedByMonth = useMemo(() => {
    const currentMonth = getCurrentMonth();
    return lineItems.reduce((acc, item, index) => {
      const month = item.date ? item.date.substring(0, 7) : currentMonth;
      if (!acc[month]) acc[month] = [];
      acc[month].push({ ...item, originalIndex: index });
      return acc;
    }, {});
  }, [lineItems]);

  const sortedMonths = useMemo(() => {
    const currentMonth = getCurrentMonth();
    return Object.keys(groupedByMonth).sort((a, b) => {
      if (a === currentMonth) return -1;
      if (b === currentMonth) return 1;
      return a.localeCompare(b);
    });
  }, [groupedByMonth]);

  const totals = calculateTotals();

  const renderMonthTable = (month, items) => {
    const currentMonth = getCurrentMonth();
    const isCurrentMonth = month === currentMonth;
    const monthLabel = isCurrentMonth ? `${month}（本月）` : `${month}（其他月）`;
    
    const monthTotals = items.reduce((sum, item) => {
      const row = calculateRow(item);
      return {
        quantity: sum.quantity + (parseFloat(item.quantity) || 0),
        amount: sum.amount + parseFloat(row.amount),
        tax: sum.tax + parseFloat(row.tax),
        total: sum.total + parseFloat(row.total),
      };
    }, { quantity: 0, amount: 0, tax: 0, total: 0 });

    return (
      <div key={month} className="space-y-2">
        <div className="flex justify-between items-center px-2 py-1 bg-muted/50 rounded">
          <span className="font-medium text-sm">{monthLabel}</span>
          <span className="text-sm text-muted-foreground">
            {items.length} 条 | 合计: ¥{monthTotals.total.toFixed(2)}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted">
                <th className="border border-border px-2 py-2 text-center w-8"></th>
                <th className="border border-border px-2 py-2 text-center">商品名称</th>
                <th className="border border-border px-2 py-2 text-center">规格</th>
                <th className="border border-border px-2 py-2 text-center">单位</th>
                <th className="border border-border px-2 py-2 text-center">数量</th>
                <th className="border border-border px-2 py-2 text-center">单价(含税)</th>
                <th className="border border-border px-2 py-2 text-center">金额(不含税)</th>
                <th className="border border-border px-2 py-2 text-center">税率</th>
                <th className="border border-border px-2 py-2 text-center">税额</th>
                <th className="border border-border px-2 py-2 text-center">合计金额</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const row = calculateRow(item);
                return (
                  <tr key={item.originalIndex}>
                    <td className="border border-border px-1 py-1 text-center">
                      <Button variant="ghost" size="sm" onClick={() => removeLineItem(item.originalIndex)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </td>
                    <td className="border border-border px-1 py-1">
                      <Input className="h-8 border-0" value={item.name} onChange={(e) => handleChange(item.originalIndex, "name", e.target.value)} />
                    </td>
                    <td className="border border-border px-1 py-1">
                      <Input className="h-8 border-0" value={item.spec} onChange={(e) => handleChange(item.originalIndex, "spec", e.target.value)} />
                    </td>
                    <td className="border border-border px-1 py-1">
                      <Input className="h-8 border-0" value={item.unit} onChange={(e) => handleChange(item.originalIndex, "unit", e.target.value)} />
                    </td>
                    <td className="border border-border px-1 py-1">
                      <Input className="h-8 border-0 text-right" type="number" value={item.quantity} onChange={(e) => handleChange(item.originalIndex, "quantity", e.target.value)} />
                    </td>
                    <td className="border border-border px-1 py-1">
                      <Input className="h-8 border-0 text-right" type="number" value={item.price} onChange={(e) => handleChange(item.originalIndex, "price", e.target.value)} />
                    </td>
                    <td className="border border-border px-1 py-2 text-right">{row.amount}</td>
                    <td className="border border-border px-1 py-1">
                      <Input className="h-8 border-0 text-right" type="number" step="0.01" value={item.taxRate} onChange={(e) => handleChange(item.originalIndex, "taxRate", e.target.value)} />
                    </td>
                    <td className="border border-border px-1 py-2 text-right">{row.tax}</td>
                    <td className="border border-border px-1 py-2 text-right">{row.total}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="font-medium">开票内容明细</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportModalOpen(true)}>
            <FileText className="w-4 h-4 mr-1" />
            导入
          </Button>
          <Button variant="outline" size="sm" onClick={handleAddItem}>
            <Plus className="w-4 h-4 mr-1" />
            添加行
          </Button>
        </div>
      </div>

      <InvoiceImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onImport={handleImport}
        onSetInvoiceDate={setInvoiceDate}
      />

      {lineItems.length === 0 ? (
        <p className="text-muted-foreground text-center py-4">暂无数据</p>
      ) : (
        <>
          {sortedMonths.map((month) => renderMonthTable(month, groupedByMonth[month]))}
          
          <div className="overflow-x-auto border-t-2 border-border">
            <table className="w-full border-collapse">
              <tbody>
                <tr className="bg-muted font-medium">
                  <td className="border border-border px-2 py-2 w-8"></td>
                  <td className="border border-border px-2 py-2 text-center" colSpan={3}>总计（{sortedMonths.length} 个月份）</td>
                  <td className="border border-border px-2 py-2 text-right">{totals.quantity}</td>
                  <td className="border border-border px-2 py-2"></td>
                  <td className="border border-border px-2 py-2 text-right">{totals.amount}</td>
                  <td className="border border-border px-2 py-2"></td>
                  <td className="border border-border px-2 py-2 text-right">{totals.tax}</td>
                  <td className="border border-border px-2 py-2 text-right">{totals.total}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}