"use client";

import React, { useEffect } from "react";
import { useApp } from "@/context/AppContext";
import ProductMergeUpload from "./ProductMergeUpload";
import ProductMergeResultDisplay from "./ProductMergeResultDisplay";
import { ErrorModal } from "./ui/modal";

export function ProductMergeContent() {
  const { error, clearError, resetOrder, originalData } = useApp();

  // 页面加载时重置所有状态，避免残留数据
  useEffect(() => {
    resetOrder();
    clearError();
    console.log("[ProductMergeContent] 页面加载，重置状态");
  }, [resetOrder, clearError]);

  return (
    <div className="space-y-4">
      {/* 文件上传组件 */}
      {!originalData || originalData.length === 0 ? (
        <ProductMergeUpload />
      ) : (
        <ProductMergeResultDisplay />
      )}

      {/* 错误模态框 */}
      <ErrorModal
        isOpen={!!error}
        onClose={() => {
          clearError();
          if (error?.includes("文件") || error?.includes("文件夹")) {
            resetOrder();
          }
        }}
        message={error || ""}
      />
    </div>
  );
}