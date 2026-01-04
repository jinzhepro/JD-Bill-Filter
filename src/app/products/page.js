"use client";

import React from "react";
import { ProductProvider } from "@/context/ProductContext";
import { ProductManager } from "@/components/ProductManager";
import { ErrorModal } from "@/components/ui/Modal";
import { useProduct } from "@/context/ProductContext";
import Link from "next/link";

function ProductContent() {
  const { error, clearError } = useProduct();

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
        <h1 className="text-2xl font-bold text-white">商品管理系统</h1>
        <div></div>
      </div>

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
    </div>
  );
}

export default function ProductPage() {
  return (
    <ProductProvider>
      <div className="container">
        <header className="header text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-3">
            京东万商商品管理系统
          </h1>
          <p className="subtitle text-xl text-white opacity-90">
            管理商品信息，包括商品名称、SKU、分类、品牌等信息
          </p>
        </header>

        <main className="main-content flex-1">
          <ProductContent />
        </main>

        <footer className="footer text-center mt-10 text-white opacity-80">
          <p>京东万商商品管理系统 v3.0</p>
        </footer>
      </div>
    </ProductProvider>
  );
}
