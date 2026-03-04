"use client";

import React from "react";
import { useSettlement } from "@/context/SettlementContext";
import SettlementFolderUpload from "./SettlementFolderUpload";
import SettlementResultDisplay from "./SettlementResultDisplay";
import { ErrorModal } from "./ui/modal";

export function SettlementContent() {
  const { error, clearError, resetSettlement, originalData, mergeMode } = useSettlement();

  React.useEffect(() => {
    resetSettlement();
    clearError();
  }, [resetSettlement, clearError]);

  return (
    <div className="space-y-4">
      {(!originalData || originalData.length === 0) && !mergeMode ? (
        <SettlementFolderUpload />
      ) : (
        <SettlementResultDisplay />
      )}

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
