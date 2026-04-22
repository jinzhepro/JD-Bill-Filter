"use client";

import { SimpleLayout } from "@/components/SimpleLayout";
import { PurchaseOrderManager } from "@/components/PurchaseOrderManager";

export default function PurchaseOrdersPage() {
  return (
    <SimpleLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">采购单管理</h1>
        <p className="text-muted-foreground">导入和管理采购单数据</p>
        <PurchaseOrderManager />
      </div>
    </SimpleLayout>
  );
}