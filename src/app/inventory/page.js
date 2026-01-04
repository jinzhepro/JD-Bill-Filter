"use client";

import React from "react";
import { InventoryProvider } from "@/context/InventoryContext";
import { InventoryManager } from "@/components/InventoryManager";
import { ErrorModal } from "@/components/ui/modal";
import { useInventory } from "@/context/InventoryContext";
import { MainLayout } from "@/components/MainLayout";

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

export default function InventoryPage() {
  return (
    <InventoryProvider>
      <MainLayout>
        <InventoryContent />
      </MainLayout>
    </InventoryProvider>
  );
}
