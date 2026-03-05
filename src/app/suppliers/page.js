"use client";

import { SupplierProvider, useSupplier } from "@/context/SupplierContext";
import { SimpleLayout } from "@/components/SimpleLayout";
import SupplierManager from "@/components/SupplierManager";
import { ErrorModal } from "@/components/ui/modal";

function SupplierContent() {
  const { error, clearError } = useSupplier();

  return (
    <>
      <SupplierManager />
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
