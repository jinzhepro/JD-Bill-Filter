"use client";

import { SimpleLayout } from "@/components/SimpleLayout";
import { BrandManager } from "@/components/BrandManager";

export default function BrandsPage() {
  return (
    <SimpleLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">品牌映射管理</h1>
        <p className="text-muted-foreground">管理品牌关键词与发票名称的映射关系</p>
        <BrandManager />
      </div>
    </SimpleLayout>
  );
}