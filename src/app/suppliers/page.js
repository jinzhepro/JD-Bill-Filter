"use client";

import React from "react";
import { SupplierProvider } from "@/context/SupplierContext";
import { SimpleLayout } from "@/components/SimpleLayout";
import SupplierManager from "@/components/SupplierManager";
import { ErrorModal } from "@/components/ui/modal";
import { useSupplier } from "@/context/SupplierContext";

function SupplierContent() {
  const { error, clearError } = useSupplier();

  return (
    <>
      <SupplierManager />

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

export default function SuppliersPage() {
  return (
    <SupplierProvider>
      <SimpleLayout>
        <SupplierContent />
      </SimpleLayout>
    </SupplierProvider>
  );
}
