import { useState, useEffect, useMemo } from "react";

/**
 * 自定义 Hook：处理 SKU 与商品映射的匹配逻辑
 * @param {Array<Object>|null} processedData - 处理后的结算单数据
 * @returns {{ products: Array<Object>, unmatchedSkus: Array<string>, getProductDisplayName: function(string): string|null }}
 */
export function useProductMatching(processedData) {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch("/api/products?pageSize=1000");
        const data = await res.json();
        if (data.success) {
          setProducts(data.data || []);
        }
      } catch (error) {
        console.error("获取商品映射失败:", error);
        return [];
      }
    };
    fetchProducts();
  }, []);

  // 预先构建 SKU → Product 的 Map，避免 O(n²) 查找
  const productMap = useMemo(() => {
    const map = new Map();
    products.forEach((p) => map.set(p.sku, p));
    return map;
  }, [products]);

  const getProductDisplayName = useMemo(() => {
    return (sku) => {
      if (!sku) return null;
      const product = productMap.get(String(sku).trim());
      if (product && product.product_name) {
        const cleanName = product.product_name.replace(/\s+/g, "");
        return `${cleanName}_${sku}`;
      }
      return null;
    };
  }, [productMap]);

  const unmatchedSkus = useMemo(() => {
    if (!processedData || products.length === 0) return [];
    const skuSet = new Set();
    processedData.forEach((row) => {
      const sku = String(row["商品编号"] || row["SKU"] || "").trim();
      if (sku && !productMap.has(sku)) {
        skuSet.add(sku);
      }
    });
    return Array.from(skuSet);
  }, [processedData, productMap, products.length]);

  return { products, unmatchedSkus, getProductDisplayName };
}
