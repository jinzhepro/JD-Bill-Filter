"use client";

import React, { useEffect } from "react";
import { useSettlement } from "@/context/SettlementContext";
import SettlementFolderUpload from "./SettlementFolderUpload";
import SettlementResultDisplay from "./SettlementResultDisplay";
import { ErrorModal } from "./ui/modal";

export function SettlementContent() {
  const { error, clearError, resetSettlement, originalData, mergeMode } = useSettlement();

  useEffect(() => {
    resetSettlement();
    clearError();
  }, [resetSettlement, clearError]);

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
            resetSettlement();
          }
        }}
        message={error || ""}
      />
    </div>
  );
}
