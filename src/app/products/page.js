"use client";

import { SimpleLayout } from "@/components/SimpleLayout";
import { ProductManager } from "@/components/ProductManager";

export default function ProductsPage() {
  return (
    <SimpleLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">商品管理</h1>
        <p className="text-muted-foreground">管理商品名称与SKU映射关系</p>
        <ProductManager />
      </div>
    </SimpleLayout>
  );
}