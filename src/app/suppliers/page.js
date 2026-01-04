"use client";

import React, { useEffect } from "react";
import { SupplierProvider } from "@/context/SupplierContext";
import { MainLayout } from "@/components/MainLayout";
import SupplierManager from "@/components/SupplierManager";

export default function SuppliersPage() {
  return (
    <SupplierProvider>
      <MainLayout>
        <div className="space-y-8">
          {/* 功能介绍 */}
          <section className="bg-white rounded-xl shadow-lg p-6 animate-fade-in">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                供应商管理
              </h2>
              <p className="text-gray-600 mb-6">
                管理供应商信息，包括供应商名称和ID的增删改查操作
              </p>
            </div>
          </section>

          {/* 供应商管理组件 */}
          <SupplierManager />
        </div>
      </MainLayout>
    </SupplierProvider>
  );
}
