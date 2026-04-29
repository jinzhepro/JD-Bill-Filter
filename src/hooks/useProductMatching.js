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
      } catch {
        // 静默失败
      }
    };
    fetchProducts();
  }, []);

  const getProductDisplayName = useMemo(() => {
    return (sku) => {
      if (!sku) return null;
      const product = products.find(p => p.sku === String(sku).trim());
      if (product && product.product_name) {
        const cleanName = product.product_name.replace(/\s+/g, '');
        return `${cleanName}_${sku}`;
      }
      return null;
    };
  }, [products]);

  const unmatchedSkus = useMemo(() => {
    if (!processedData || products.length === 0) return [];
    const skuSet = new Set();
    processedData.forEach(row => {
      const sku = row["商品编号"] || row["SKU"];
      if (sku) {
        const product = products.find(p => p.sku === String(sku).trim());
        if (!product) {
          skuSet.add(String(sku).trim());
        }
      }
    });
    return Array.from(skuSet);
  }, [processedData, products]);

  return { products, unmatchedSkus, getProductDisplayName };
}
