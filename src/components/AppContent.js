"use client";

import React, { useEffect } from "react";
import { useApp } from "@/context/AppContext";
import FolderUpload from "./FolderUpload";
import ResultDisplay from "./ResultDisplay";
import MergeProcessor from "./MergeProcessor";
import { ErrorModal } from "./ui/Modal.js";
import Link from "next/link";

export function AppContent() {
  const { error, clearError, reset, originalData, mergeMode } = useApp();

  return (
    <div className="space-y-8">
      {/* 文件上传组件 - 只显示文件夹上传 */}
      {(!originalData || originalData.length === 0) && !mergeMode && (
        <FolderUpload />
      )}

      {/* 合并处理组件 - 只有在合并模式时才显示 */}
      {mergeMode && <MergeProcessor />}

      {/* 结果展示组件 - 只有在有数据且不在合并模式时才显示 */}
      {originalData && originalData.length > 0 && !mergeMode && (
        <ResultDisplay />
      )}

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
