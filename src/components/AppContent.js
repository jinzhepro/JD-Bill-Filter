"use client";

import React, { useEffect } from "react";
import { useOrder } from "@/context/OrderContext";
import FolderUpload from "./FolderUpload";
import ResultDisplay from "./ResultDisplay";
import { ErrorModal } from "./ui/modal";

export function AppContent() {
  const { error, clearError, resetOrder, originalData } = useOrder();

  useEffect(() => {
    resetOrder();
    clearError();
  }, [resetOrder, clearError]);

  return (
    <div className="space-y-4">
      {/* 文件上传组件 */}
      {!originalData || originalData.length === 0 ? (
        <FolderUpload />
      ) : (
        <ResultDisplay />
      )}

      {/* 错误模态框 */}
      <ErrorModal
        isOpen={!!error}
        onClose={() => {
          clearError();
          if (error?.includes("文件")) {
            resetOrder();
          }
        }}
        message={error || ""}
      />
    </div>
  );
}
