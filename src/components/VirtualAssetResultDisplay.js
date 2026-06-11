"use client";

import React, { useState, useMemo, useEffect } from "react";
import Decimal from "decimal.js";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  ArrowLeft, Download, Search, X, ArrowUp, ArrowDown,
  ChevronsUpDown, Info, FileText, AlertTriangle, Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { calculateVirtualAssetTotals } from "@/lib/virtualAssetProcessor";
import { exportInvoice } from "@/lib/invoiceExporter";
import { DEFAULT_COMPANY_INFO } from "@/lib/constants";
import { cleanAmountString } from "@/lib/utils";

/**
 * 虚拟资产汇总结果展示组件
 */
export default function VirtualAssetResultDisplay({
  processedData,
  summary,
  onReset,
}) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  // 商品映射和SKU匹配
  const [products, setProducts] = useState(null);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [unmatchedSkus, setUnmatchedSkus] = useState([]);
  // 发票名称已加载完毕
  const [namesLoaded, setNamesLoaded] = useState(false);

  // 默认客户信息
  const DEFAULT_CUSTOMER = {
    customerName: "江苏京东信息技术有限公司",
    taxId: "91321311690769465E",
    bankName: "中国工商银行宿迁宿豫支行",
    bankAccount: "1116030409000155272",
    address: "江苏省宿迁市宿豫区洪泽湖东路与清水江路交叉口",
    phone: "0527-88265500",
  };

  // 导出发票状态
  const [isExporting, setIsExporting] = useState(false);

  // 组件挂载或 processedData 变化时，自动拉取商品映射匹配SKU
  useEffect(() => {
    let cancelled = false;

    async function fetchAndMatch() {
      setLoadingProducts(true);
      setNamesLoaded(false);
      setProducts(null);
      setUnmatchedSkus([]);

      try {
        const res = await fetch("/api/products?pageSize=1000");
        const data = await res.json();

        if (cancelled) return;

        if (!data.success) {
          console.error("获取商品映射失败");
          setLoadingProducts(false);
          return;
        }

        const productList = data.data || [];
        setProducts(productList);

        // 查找未匹配SKU或未设置发票名称的商品
        const unmatched = [];
        if (processedData) {
          processedData.forEach((row) => {
            const sku = String(row["商品skuId"] || "").trim();
            if (!sku) return;
            const match = productList.find((p) => p.sku === sku);
            if (!match) {
              unmatched.push(`${sku}（未在商品管理中找到）`);
            } else if (!match.invoice_name) {
              unmatched.push(`${sku}（未设置发票名称）`);
            }
          });
        }
        setUnmatchedSkus(unmatched);
        setNamesLoaded(true);
      } catch (error) {
        console.error("获取商品映射失败:", error);
      } finally {
        if (!cancelled) setLoadingProducts(false);
      }
    }

    fetchAndMatch();

    return () => { cancelled = true; };
  }, [processedData]);

  // 获取商品名称
  const getProductName = (sku) => {
    if (!products || !sku) return null;
    const match = products.find((p) => p.sku === String(sku).trim());
    return match ? match.product_name || null : null;
  };

  // 获取发票名称（仅取 invoice_name 字段，不回退）
  const getInvoiceName = (sku) => {
    if (!products || !sku) return null;
    const match = products.find((p) => p.sku === String(sku).trim());
    return match && match.invoice_name ? match.invoice_name.replace(/\s+/g, "") : null;
  };

  // 获取规格
  const getSpec = (sku) => {
    if (!products || !sku) return "";
    const match = products.find((p) => p.sku === String(sku).trim());
    return match && match.spec ? match.spec : "";
  };

  // 显示名称：有发票名称则显示，否则显示提示
  const getDisplayName = (sku) => {
    const name = getInvoiceName(sku);
    return name || "（未设置发票名称）";
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sortedData = useMemo(() => {
    if (!sortConfig.key || !processedData) return processedData;
    return [...processedData].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal === bVal) return 0;
      const aClean = cleanAmountString(aVal);
      const bClean = cleanAmountString(bVal);
      const isNumeric = /^-?\d+(\.\d+)?$/.test(aClean) && /^-?\d+(\.\d+)?$/.test(bClean);
      if (isNumeric) {
        const cmp = new Decimal(aClean).comparedTo(bClean);
        return sortConfig.direction === "asc" ? cmp : -cmp;
      }
      return sortConfig.direction === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [processedData, sortConfig]);

  const filteredData = useMemo(() => {
    if (!searchQuery || !sortedData) return sortedData;
    const query = searchQuery.toLowerCase().trim();
    if (!query) return sortedData;
    return sortedData.filter((row) =>
      Object.values(row).some((val) => String(val).toLowerCase().includes(query))
    );
  }, [sortedData, searchQuery]);

  const totals = useMemo(
    () => calculateVirtualAssetTotals(processedData),
    [processedData]
  );

  const handleDownloadCSV = () => {
    if (!processedData || processedData.length === 0) return;

    try {
      const headers = ["商品skuId", "商品名称", "数量", "税率", "实际金额"];
      const rows = processedData.map((row) => {
        const sku = row["商品skuId"];
        const rawName = getProductName(sku) || row["虚拟资产名称"];
        const prodName = `${rawName.replace(/\s+/g, "")}_${sku}`;
        const taxRate = getTaxRate(sku);
        return [sku, prodName, 1, `${(taxRate * 100).toFixed(0)}%`, row["实际金额"]]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",");
      });

      const csvContent = "\ufeff" + [headers.join(","), ...rows].join("\n");

      const blob = new Blob([csvContent], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `虚拟资产汇总_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      link.remove();

      toast({
        title: "导出成功",
        description: `已导出 ${processedData.length} 条汇总数据`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "导出失败",
        description: error.message,
      });
    }
  };

  // 根据SKU对应的发票名称确定税率
  const getTaxRate = (sku) => {
    if (!products || !sku) return 0.13;
    const match = products.find((p) => p.sku === String(sku).trim());
    const invName = match?.invoice_name || "";
    if (invName.includes("乳制品") && invName.includes("蒙牛")) return 0.09;
    return 0.13;
  };

  // 直接导出发票
  const handleExportInvoice = async () => {
    setIsExporting(true);

    try {
      const lineItems = processedData.map((row) => {
        const sku = String(row["商品skuId"] || "").trim();
        const invoiceName = getDisplayName(sku);
        const taxRate = getTaxRate(sku);
        const amountInclTax = new Decimal(cleanAmountString(row["实际金额"]));

        return {
          name: invoiceName,
          spec: getSpec(sku),
          unit: "箱",
          quantity: 1,
          price: amountInclTax.toNumber(),
          amount: amountInclTax.toNumber(),
          taxRate,
        };
      });
 
      const now = new Date();
      const applyDate = `${now.getFullYear()}年${String(now.getMonth() + 1).padStart(2, "0")}月${String(now.getDate()).padStart(2, "0")}日`;

      await exportInvoice(
        {
          companyName: DEFAULT_COMPANY_INFO.companyName,
          contractNo: DEFAULT_COMPANY_INFO.contractNo,
          applyDate,
          department: DEFAULT_COMPANY_INFO.department,
          applicant: DEFAULT_COMPANY_INFO.applicant,
        },
        {
          customerName: DEFAULT_CUSTOMER.customerName,
          taxId: DEFAULT_CUSTOMER.taxId,
          bankName: DEFAULT_CUSTOMER.bankName,
          bankAccount: DEFAULT_CUSTOMER.bankAccount,
          address: DEFAULT_CUSTOMER.address,
          phone: DEFAULT_CUSTOMER.phone,
        },
        lineItems,
        now.toISOString().slice(0, 7),
        false
      );

      toast({
        title: "发票导出成功",
        description: `已导出 ${lineItems.length} 条开票明细，税率13%`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "发票导出失败",
        description: error.message,
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (!processedData || processedData.length === 0) return null;

  return (
    <div className="space-y-6">
      {/* 摘要信息 */}
      {summary && (
        <div className="bg-gradient-to-r from-primary/5 to-blue-500/5 rounded-xl border border-primary/10 p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-primary mt-0.5" />
            <div className="text-sm text-muted-foreground space-y-1">
              <p>
                共处理 <strong className="text-foreground">{summary.总文件数}</strong> 个文件，
                {summary.失败文件数 > 0 && (
                  <span className="text-destructive">
                    {summary.失败文件数} 个失败，
                  </span>
                )}
                读取 <strong className="text-foreground">{summary.总行数}</strong> 行数据，
                合并为 <strong className="text-foreground">{summary.合并后SKU数}</strong> 条SKU记录，
                汇总金额 <strong className="text-primary">¥{summary.总金额}</strong>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 返回按钮 + 标题 */}
      <div className="flex justify-between items-center">
        <Button
          onClick={onReset}
          variant="outline"
          className="hover:bg-primary/5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回
        </Button>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          虚拟资产汇总结果
        </h1>
        <div></div>
      </div>

      {/* 未匹配SKU提示 */}
      {namesLoaded && unmatchedSkus.length > 0 && (
        <div className="bg-warning/10 border border-warning/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-warning mb-1">
                以下SKU无发票名称 ({unmatchedSkus.length}个)
              </h4>
              <p className="text-sm text-warning/80">
                {unmatchedSkus.join("、")}
              </p>
              <p className="text-xs text-warning/60 mt-1">
                请在商品管理中设置发票名称后重新上传
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 合计仪表盘 */}
      <section className="bg-muted/20 rounded-xl border border-border shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card rounded-lg border border-border p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">汇总金额</span>
              <div className="w-9 h-9 rounded-full bg-green-500/10 flex items-center justify-center">
                <span className="text-green-600 font-bold text-base">¥</span>
              </div>
            </div>
            <div className="text-2xl font-bold text-green-600 font-mono">
              ¥{Number(totals.实际金额).toLocaleString("zh-CN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">SKU数</span>
              <div className="w-9 h-9 rounded-full bg-blue-500/10 flex items-center justify-center">
                <span className="text-blue-600 font-bold text-base">#</span>
              </div>
            </div>
            <div className="text-2xl font-bold text-blue-600 font-mono">
              {totals.SKU数}
            </div>
          </div>
        </div>
      </section>

      {/* 数据表格 */}
      <section className="bg-card rounded-xl border border-border p-6 shadow-sm">
        <div className="mb-6 flex gap-3 flex-wrap items-center justify-between">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleDownloadCSV}
              className="hover:bg-primary/5 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              导出CSV
            </Button>
            <Button
              variant="default"
              onClick={handleExportInvoice}
              disabled={loadingProducts || isExporting}
              className="shadow-lg shadow-primary/20 hover:shadow-xl transition-all duration-200"
            >
              <FileText className="w-4 h-4 mr-2" />
              {isExporting ? "导出中..." : "导出发票"}
            </Button>
          </div>

          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="搜索SKU、名称..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors"
                title="清除搜索"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {searchQuery && (
          <p className="mb-4 text-sm text-muted-foreground">
            找到 <span className="font-medium text-primary">{filteredData.length}</span> 条结果，
            共 <span className="font-medium">{processedData.length}</span> 条数据
          </p>
        )}

        <div className="border border-border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-gradient-to-r from-muted/95 to-muted/80 backdrop-blur supports-[backdrop-filter]:bg-muted/80 border-b border-border">
              <tr>
                <th className="px-4 py-3.5 text-left font-semibold text-foreground w-12 bg-muted/30">
                  序号
                </th>
                <th className="px-4 py-3.5 text-left font-semibold text-foreground whitespace-nowrap bg-muted/30">
                  <div className="flex items-center gap-2">
                    <span>商品skuId</span>
                    <button
                      onClick={() => handleSort("商品skuId")}
                      className="p-1 rounded hover:bg-muted/50 transition-colors"
                    >
                      {sortConfig.key === "商品skuId" ? (
                        sortConfig.direction === "asc" ? (
                          <ArrowUp className="w-4 h-4 text-primary" />
                        ) : (
                          <ArrowDown className="w-4 h-4 text-primary" />
                        )
                      ) : (
                        <ChevronsUpDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </th>
                <th className="px-4 py-3.5 text-left font-semibold text-foreground whitespace-nowrap bg-muted/30">
                  <div className="flex items-center gap-2">
                    <span>商品名称</span>
                    {loadingProducts && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3.5 text-left font-semibold text-foreground whitespace-nowrap bg-muted/30">
                  <div className="flex items-center gap-2">
                    <span>发票名称</span>
                  </div>
                </th>
                <th className="px-4 py-3.5 text-left font-semibold text-foreground whitespace-nowrap bg-muted/30">
                  <span>数量</span>
                </th>
                <th className="px-4 py-3.5 text-left font-semibold text-foreground whitespace-nowrap bg-muted/30">
                  <span>税率</span>
                </th>
                <th className="px-4 py-3.5 text-left font-semibold text-foreground whitespace-nowrap bg-muted/30">
                  <div className="flex items-center gap-2">
                    <span>实际金额</span>
                    <button
                      onClick={() => handleSort("实际金额")}
                      className="p-1 rounded hover:bg-muted/50 transition-colors"
                    >
                      {sortConfig.key === "实际金额" ? (
                        sortConfig.direction === "asc" ? (
                          <ArrowUp className="w-4 h-4 text-primary" />
                        ) : (
                          <ArrowDown className="w-4 h-4 text-primary" />
                        )
                      ) : (
                        <ChevronsUpDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row, index) => {
                const displayName = getDisplayName(row["商品skuId"]);
                return (
                  <tr
                    key={row["商品skuId"]}
                    className={`transition-all duration-150 hover:shadow-sm ${
                      index % 2 === 0 ? "bg-background" : "bg-muted/30"
                    }`}
                  >
                    <td className="px-4 py-3 text-left border-b border-border/50 text-muted-foreground w-12">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 text-left border-b border-border/50 font-mono">
                      {row["商品skuId"]}
                    </td>
                    <td className="px-4 py-3 text-left border-b border-border/50">
                      {loadingProducts ? (
                        <span className="text-muted-foreground text-xs">加载中...</span>
                      ) : (
                        <span>{(getProductName(row["商品skuId"]) || row["虚拟资产名称"]).replace(/\s+/g, "")}_{row["商品skuId"]}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-left border-b border-border/50">
                      {loadingProducts ? (
                        <span className="text-muted-foreground text-xs">加载中...</span>
                      ) : (
                        <span className={getInvoiceName(row["商品skuId"]) ? "" : "text-muted-foreground"}>
                          {displayName}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-left border-b border-border/50">
                      1
                    </td>
                    <td className="px-4 py-3 text-left border-b border-border/50 font-mono">
                      {(getTaxRate(row["商品skuId"]) * 100).toFixed(0)}%
                    </td>
                    <td className="px-4 py-3 text-left border-b border-border/50 font-mono font-medium text-primary">
                      ¥{Number(row["实际金额"]).toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
