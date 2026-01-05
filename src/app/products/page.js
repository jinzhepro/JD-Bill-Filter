"use client";

import React from "react";
import { ProductProvider } from "@/context/ProductContext";
import { ProductManager } from "@/components/ProductManager";
import { ErrorModal } from "@/components/ui/modal";
import { useProduct } from "@/context/ProductContext";
import { MainLayout } from "@/components/MainLayout";
import { RouteGuard } from "@/components/RouteGuard";

function ProductContent() {
  const { error, clearError } = useProduct();

  return (
    <>
      {/* 商品管理组件 */}
      <ProductManager />

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

function ProductWithGuard() {
  return (
    <RouteGuard>
      <MainLayout>
        <ProductContent />
      </MainLayout>
    </RouteGuard>
  );
}

export default function ProductPage() {
  return (
    <ProductProvider>
      <ProductWithGuard />
    </ProductProvider>
  );
}
