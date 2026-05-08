"use client";
import { SimpleLayout } from "@/components/SimpleLayout";
import { CanteenPurchaseOrderManager } from "@/components/CanteenPurchaseOrderManager";

export default function CanteenPurchasePage() {
  return (
    <SimpleLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">食堂采购单</h1>
        <p className="text-muted-foreground">管理食堂采购数据，支持导入Excel数据</p>
        <CanteenPurchaseOrderManager />
      </div>
    </SimpleLayout>
  );
}