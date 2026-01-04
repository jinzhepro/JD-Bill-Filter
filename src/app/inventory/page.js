"use client";

import React from "react";
import { InventoryProvider } from "@/context/InventoryContext";
import { InventoryManager } from "@/components/InventoryManager";
import { ErrorModal } from "@/components/ui/Modal";
import { useInventory } from "@/context/InventoryContext";
import Link from "next/link";

function InventoryContent() {
  const { error, clearError } = useInventory();

  return (
    <div className="space-y-8">
      {/* 返回主页按钮 */}
      <div className="flex justify-between items-center">
        <Link
          href="/"
          className="bg-gray-200 text-gray-700 hover:bg-gray-300 px-4 py-2 rounded-lg font-medium transition-colors"
        >
          ← 返回主页
        </Link>
        <h1 className="text-2xl font-bold text-white">库存管理系统</h1>
        <div></div>
      </div>

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
    </div>
  );
}

export default function InventoryPage() {
  return (
    <InventoryProvider>
      <div className="container">
        <header className="header text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-3">
            京东万商库存管理系统
          </h1>
          <p className="subtitle text-xl text-white opacity-90">
            管理物料库存，包括物料名称、规格、数量、采购批号等信息
          </p>
        </header>

        <main className="main-content flex-1">
          <InventoryContent />
        </main>

        <footer className="footer text-center mt-10 text-white opacity-80">
          <p>京东万商库存管理系统 v3.0</p>
        </footer>
      </div>
    </InventoryProvider>
  );
}
