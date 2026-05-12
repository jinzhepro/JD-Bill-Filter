"use client";
import { CanteenLayout } from "@/components/CanteenLayout";
import { CanteenPurchaseOrderManager } from "@/components/CanteenPurchaseOrderManager";

export default function CanteenPurchasePage() {
  return (
    <CanteenLayout>
      <div className="space-y-4">
        <CanteenPurchaseOrderManager />
      </div>
    </CanteenLayout>
  );
}