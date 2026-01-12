"use client";

import React, { useEffect } from "react";
import { useApp } from "@/context/AppContext";
import SettlementFolderUpload from "./SettlementFolderUpload";
import SettlementResultDisplay from "./SettlementResultDisplay";
import { ErrorModal } from "./ui/modal";

export function SettlementContent() {
  const { error, clearError, resetOrder, originalData, mergeMode } = useApp();

  // 页面加载时重置所有状态，避免残留数据
  useEffect(() => {
    resetOrder();
    clearError();
    console.log("[SettlementContent] 页面加载，重置状态");
  }, [resetOrder, clearError]);

  return (
    <div className="space-y-4">
      {/* 文件上传组件 */}
      {(!originalData || originalData.length === 0) && !mergeMode ? (
        <SettlementFolderUpload />
      ) : (
        <SettlementResultDisplay />
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
