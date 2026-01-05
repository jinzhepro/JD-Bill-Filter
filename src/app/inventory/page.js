"use client";

import React from "react";
import { InventoryProvider } from "@/context/InventoryContext";
import { InventoryManager } from "@/components/InventoryManager";
import { ErrorModal } from "@/components/ui/modal";
import { useInventory } from "@/context/InventoryContext";
import { MainLayout } from "@/components/MainLayout";
import { RouteGuard } from "@/components/RouteGuard";

function InventoryContent() {
  const { error, clearError } = useInventory();

  return (
    <>
      {/* 库存管理组件 */}
      <InventoryManager />

      {/* 错误模态框 */}
      <ErrorModal
        isOpen={!!error}
        onClose={() => {
          clearError();
        }}
        message={error || ""}
      />
    </>
  );
}

function InventoryWithGuard() {
  return (
    <RouteGuard>
      <MainLayout>
        <InventoryContent />
      </MainLayout>
    </RouteGuard>
  );
}

export default function InventoryPage() {
  return (
    <InventoryProvider>
      <InventoryWithGuard />
    </InventoryProvider>
  );
}
