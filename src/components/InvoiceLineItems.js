"use client";

import React, { useMemo } from "react";
import { useInvoice } from "@/context/InvoiceContext";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import Decimal from "decimal.js";

export function InvoiceLineItems() {
  const { lineItems, removeLineItem } = useInvoice();

  const getCurrentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
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
      const itemMonth = item.date ? item.date.substring(0, 7) : currentMonth;
      const monthKey = itemMonth === currentMonth ? currentMonth : "其他月";
      if (!acc[monthKey]) acc[monthKey] = [];
      acc[monthKey].push({ ...item, originalIndex: index });
      return acc;
    }, {});
  }, [lineItems]);

  const sortedMonths = useMemo(() => {
    const currentMonth = getCurrentMonth();
    const keys = Object.keys(groupedByMonth);
    if (keys.includes(currentMonth)) {
      return [currentMonth, ...keys.filter(k => k !== currentMonth)];
    }
    return keys;
  }, [groupedByMonth]);

  const totals = calculateTotals();

  const renderMonthTable = (month, items, showTotal = false) => {
    const currentMonth = getCurrentMonth();
    const isCurrentMonth = month === currentMonth;
    const monthLabel = isCurrentMonth ? `${month}（本月）` : "其他月";
    
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
                    <td className="border border-border px-2 py-2">{item.name}</td>
                    <td className="border border-border px-2 py-2">{item.spec}</td>
                    <td className="border border-border px-2 py-2 text-center">{item.unit}</td>
                    <td className="border border-border px-2 py-2 text-right">{item.quantity}</td>
                    <td className="border border-border px-2 py-2 text-right">{item.price.toFixed(2)}</td>
                    <td className="border border-border px-2 py-2 text-right">{row.amount}</td>
                    <td className="border border-border px-2 py-2 text-right">{(item.taxRate * 100).toFixed(0)}%</td>
                    <td className="border border-border px-2 py-2 text-right">{row.tax}</td>
                    <td className="border border-border px-2 py-2 text-right">{row.total}</td>
                  </tr>
                );
              })}
              {showTotal && (
                <tr className="bg-muted font-medium border-t-2 border-border">
                  <td className="border border-border px-2 py-2"></td>
                  <td className="border border-border px-2 py-2 text-center" colSpan={3}>总计（{sortedMonths.length} 个月份）</td>
                  <td className="border border-border px-2 py-2 text-right">{totals.quantity}</td>
                  <td className="border border-border px-2 py-2"></td>
                  <td className="border border-border px-2 py-2 text-right">{totals.amount}</td>
                  <td className="border border-border px-2 py-2"></td>
                  <td className="border border-border px-2 py-2 text-right">{totals.tax}</td>
                  <td className="border border-border px-2 py-2 text-right">{totals.total}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {lineItems.length === 0 ? (
        <p className="text-muted-foreground text-center py-4">暂无数据</p>
      ) : (
        <>
          {sortedMonths.map((month, idx) => renderMonthTable(month, groupedByMonth[month], idx === sortedMonths.length - 1))}
        </>
      )}
    </div>
  );
}