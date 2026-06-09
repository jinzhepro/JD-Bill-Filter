"use client";

import React, { useMemo, useState, useCallback } from "react";
import { useInvoice } from "@/context/InvoiceContext";
import { Button } from "@/components/ui/button";
import { Trash2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getCurrentMonth,
  calculateRowAmount,
  groupItemsByMonth,
} from "@/lib/utils";
import Decimal from "decimal.js";

export function InvoiceLineItems() {
  const { lineItems, removeLineItem, updateLineItem } = useInvoice();
  const { toast } = useToast();
  const [rematchingIndex, setRematchingIndex] = useState(null);

  const handleRematch = useCallback(async (index, sku) => {
    setRematchingIndex(index);
    try {
      const res = await fetch("/api/products?pageSize=1000");
      const data = await res.json();
      if (!data.success) {
        toast({ title: "获取商品数据失败", variant: "destructive" });
        return;
      }
      const product = data.data.find((p) => p.sku === sku);
      if (product) {
        updateLineItem(index, {
          name: product.invoice_name || "其他",
          spec: product.spec || "",
          unmatched: false,
        });
        toast({ title: `SKU ${sku} 匹配成功：${product.invoice_name || "其他"}` });
      } else {
        toast({ title: `SKU ${sku} 仍未匹配到商品`, variant: "destructive" });
      }
    } catch {
      toast({ title: "重新匹配失败", variant: "destructive" });
    } finally {
      setRematchingIndex(null);
    }
  }, [updateLineItem, toast]);

  const groupedByMonth = useMemo(
    () => groupItemsByMonth(lineItems),
    [lineItems],
  );

  const sortedMonths = useMemo(() => {
    const currentMonth = getCurrentMonth();
    const keys = Object.keys(groupedByMonth);
    return keys.sort((a, b) => {
      if (a === currentMonth) return -1;
      if (b === currentMonth) return 1;
      return 0;
    });
  }, [groupedByMonth]);

  const totals = useMemo(() => {
    return lineItems.reduce(
      (sum, item) => {
        const row = calculateRowAmount(item);
        return {
          quantity: sum.quantity + new Decimal(item.quantity || 0).toNumber(),
          amount: sum.amount + new Decimal(row.amount || 0).toNumber(),
          tax: sum.tax + new Decimal(row.tax || 0).toNumber(),
          total: sum.total + new Decimal(row.total || 0).toNumber(),
        };
      },
      { quantity: 0, amount: 0, tax: 0, total: 0 },
    );
  }, [lineItems]);

  const renderMonthTable = (month, items, showTotal = false) => {
    const currentMonth = getCurrentMonth();
    const isCurrentMonth = month === currentMonth;
    const monthLabel = isCurrentMonth ? `${month}（本月）` : month;

    const monthTotals = items.reduce(
      (sum, item) => {
        const row = calculateRowAmount(item);
        return {
          quantity: sum.quantity + new Decimal(item.quantity || 0).toNumber(),
          amount: sum.amount + new Decimal(row.amount || 0).toNumber(),
          tax: sum.tax + new Decimal(row.tax || 0).toNumber(),
          total: sum.total + new Decimal(row.total || 0).toNumber(),
        };
      },
      { quantity: 0, amount: 0, tax: 0, total: 0 },
    );

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
                <th className="border border-border px-2 py-2 text-center w-10">
                  序号
                </th>
                <th className="border border-border px-2 py-2 text-center">
                  商品名称
                </th>
                <th className="border border-border px-2 py-2 text-center">
                  规格
                </th>
                <th className="border border-border px-2 py-2 text-center">
                  单位
                </th>
                <th className="border border-border px-2 py-2 text-center">
                  数量
                </th>
                <th className="border border-border px-2 py-2 text-center">
                  金额(含税)
                </th>
                <th className="border border-border px-2 py-2 text-center">
                  金额(不含税)
                </th>
                <th className="border border-border px-2 py-2 text-center">
                  税率
                </th>
                <th className="border border-border px-2 py-2 text-center">
                  税额
                </th>
                <th className="border border-border px-2 py-2 text-center">
                  合计金额
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const row = calculateRowAmount(item);
                const isUnmatched = item.unmatched;
                return (
                  <tr
                    key={item.originalIndex}
                    className={isUnmatched ? "bg-destructive/5" : ""}
                  >
                    <td className="border border-border px-1 py-1 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {isUnmatched && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={rematchingIndex === item.originalIndex}
                            onClick={() =>
                              handleRematch(item.originalIndex, item.sku)
                            }
                          >
                            <RefreshCw
                              className={`w-4 h-4 text-destructive ${rematchingIndex === item.originalIndex ? "animate-spin" : ""}`}
                            />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLineItem(item.originalIndex)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                    <td className="border border-border px-2 py-2 text-center text-muted-foreground">
                      {index + 1}
                    </td>
                    <td
                      className={`border border-border px-2 py-2 ${isUnmatched ? "text-destructive font-bold" : ""}`}
                    >
                      {isUnmatched ? "SKU 未匹配" : item.name}
                    </td>
                    <td className="border border-border px-2 py-2">
                      {item.spec}
                    </td>
                    <td className="border border-border px-2 py-2 text-center">
                      {item.unit}
                    </td>
                    <td className="border border-border px-2 py-2 text-right">
                      {item.quantity}
                    </td>
                    <td className="border border-border px-2 py-2 text-right">
                      {row.total}
                    </td>
                    <td className="border border-border px-2 py-2 text-right">
                      {row.amount}
                    </td>
                    <td className="border border-border px-2 py-2 text-right">
                      {(item.taxRate * 100).toFixed(0)}%
                    </td>
                    <td className="border border-border px-2 py-2 text-right">
                      {row.tax}
                    </td>
                    <td className="border border-border px-2 py-2 text-right">
                      {row.total}
                    </td>
                  </tr>
                );
              })}
              {showTotal && (
                <tr className="bg-muted font-medium border-t-2 border-border">
                  <td className="border border-border px-2 py-2"></td>
                  <td
                    className="border border-border px-2 py-2 text-center"
                    colSpan={3}
                  >
                    总计（{sortedMonths.length} 个月份）
                  </td>
                  <td className="border border-border px-2 py-2 text-right">
                    {totals.quantity.toFixed(2)}
                  </td>
                  <td className="border border-border px-2 py-2"></td>
                  <td className="border border-border px-2 py-2 text-right">
                    {totals.amount.toFixed(2)}
                  </td>
                  <td className="border border-border px-2 py-2"></td>
                  <td className="border border-border px-2 py-2 text-right">
                    {totals.tax.toFixed(2)}
                  </td>
                  <td className="border border-border px-2 py-2 text-right">
                    {totals.total.toFixed(2)}
                  </td>
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
        <p className="text-muted-foreground text-center py-4">
          暂无数据，请点击导入按钮添加
        </p>
      ) : (
        <>
          {sortedMonths.map((month, idx) =>
            renderMonthTable(
              month,
              groupedByMonth[month],
              idx === sortedMonths.length - 1,
            ),
          )}
        </>
      )}
    </div>
  );
}
