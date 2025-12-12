"use client";

import React from "react";
import { useApp } from "@/context/AppContext";
import FileUpload from "./FileUpload";
import ResultDisplay from "./ResultDisplay";
import { ErrorModal } from "./ui/Modal";

export function AppContent() {
  const { error, clearError, reset, originalData } = useApp();

  return (
    <div className="space-y-8">
      {/* 文件上传组件 - 只有在没有数据时才显示 */}
      {(!originalData || originalData.length === 0) && <FileUpload />}

      {/* 结果展示组件 - 只有在有数据时才显示 */}
      {originalData && originalData.length > 0 && <ResultDisplay />}

      {/* 错误模态框 */}
      <ErrorModal
        isOpen={!!error}
        onClose={() => {
          clearError();
          if (error?.includes("文件")) {
            reset();
          }
        }}
        message={error || ""}
      />
    </div>
  );
}
