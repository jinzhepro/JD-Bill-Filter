"use client";

import React, { useEffect } from "react";
import { useApp } from "@/context/AppContext";
import FolderUpload from "./FolderUpload";
import ResultDisplay from "./ResultDisplay";
import { ErrorModal } from "./ui/modal";
import Link from "next/link";

export function AppContent() {
  const { error, clearError, resetOrder, originalData } = useApp();

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
