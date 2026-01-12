"use client";

import React from "react";
import { SupplierProvider } from "@/context/SupplierContext";
import { MainLayout } from "@/components/MainLayout";
import SupplierManager from "@/components/SupplierManager";
import { ErrorModal } from "@/components/ui/modal";
import { useSupplier } from "@/context/SupplierContext";

function SupplierContent() {
  const { error, clearError } = useSupplier();

  return (
    <>
      <div className="space-y-8">
        {/* 功能介绍 */}
        <section className="bg-card rounded-lg shadow p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              供应商转换
            </h2>
            <p className="text-muted-foreground mb-6">
              根据输入的文本自动匹配供应商信息，快速完成供应商ID转换
            </p>
          </div>
        </section>

        {/* 供应商管理组件 */}
        <SupplierManager />
      </div>

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
      <MainLayout>
        <SupplierContent />
      </MainLayout>
    </SupplierProvider>
  );
}
