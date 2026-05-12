"use client";
import { CanteenLayout } from "@/components/CanteenLayout";
import { CanteenSupplierManager } from "@/components/CanteenSupplierManager";

export default function CanteenSuppliersPage() {
  return (
    <CanteenLayout>
      <div className="space-y-4">
        <CanteenSupplierManager />
      </div>
    </CanteenLayout>
  );
}