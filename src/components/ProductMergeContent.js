"use client";

import React, { useEffect } from "react";
import { useProductMerge } from "@/context/ProductMergeContext";
import ProductMergeUpload from "./ProductMergeUpload";
import ProductMergeResultDisplay from "./ProductMergeResultDisplay";
import { ErrorModal } from "./ui/modal";

export function ProductMergeContent() {
  const { error, clearError, resetProductMerge, originalData } = useProductMerge();

  useEffect(() => {
    resetProductMerge();
    clearError();
  }, [resetProductMerge, clearError]);

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
            resetProductMerge();
          }
        }}
        message={error || ""}
      />
    </div>
  );
}