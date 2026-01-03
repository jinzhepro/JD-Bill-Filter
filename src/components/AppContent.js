"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import FileUpload from "./FileUpload";
import MultiFileUpload from "./MultiFileUpload";
import ResultDisplay from "./ResultDisplay";
import MergeProcessor from "./MergeProcessor";
import { InventoryManager } from "./InventoryManager";
import { ErrorModal } from "./ui/Modal";
import { getInventoryFromStorage } from "@/lib/inventoryStorage";

export function AppContent() {
  const {
    error,
    clearError,
    reset,
    originalData,
    mergeMode,
    inventoryMode,
    setInventoryMode,
    setInventoryItems,
  } = useApp();
  const [uploadMode, setUploadMode] = useState("single"); // "single" 或 "multiple"

  // 初始化时从localStorage加载库存数据
  useEffect(() => {
    const storedItems = getInventoryFromStorage();
    if (storedItems.length > 0) {
      setInventoryItems(storedItems);
    }
  }, [setInventoryItems]);

  return (
    <div className="space-y-8">
      {/* 功能模块选择 */}
      {(!originalData || originalData.length === 0) &&
        !mergeMode &&
        !inventoryMode && (
          <section className="bg-white rounded-xl shadow-lg p-6 animate-fade-in">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                选择功能模块
              </h2>
              <div className="flex justify-center gap-4 flex-wrap">
                <button
                  onClick={() => setUploadMode("single")}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    uploadMode === "single"
                      ? "bg-primary-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  单文件上传
                </button>
                <button
                  onClick={() => setUploadMode("multiple")}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    uploadMode === "multiple"
                      ? "bg-primary-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  多文件合并
                </button>
                <button
                  onClick={() => setInventoryMode(true)}
                  className="px-6 py-3 rounded-lg font-medium transition-colors bg-green-600 text-white hover:bg-green-700"
                >
                  库存管理
                </button>
              </div>
              <p className="mt-4 text-sm text-gray-600">
                {uploadMode === "single"
                  ? "上传单个文件进行处理"
                  : uploadMode === "multiple"
                  ? "上传多个文件并合并相同SKU和单价的记录"
                  : "管理物料库存，包括物料名称、规格、数量、采购批号等信息"}
              </p>
            </div>
          </section>
        )}

      {/* 文件上传组件 - 根据模式显示不同的上传组件 */}
      {(!originalData || originalData.length === 0) &&
        !mergeMode &&
        !inventoryMode && (
          <>{uploadMode === "single" ? <FileUpload /> : <MultiFileUpload />}</>
        )}

      {/* 合并处理组件 - 只有在合并模式时才显示 */}
      {mergeMode && <MergeProcessor />}

      {/* 库存管理组件 - 只有在库存管理模式时才显示 */}
      {inventoryMode && <InventoryManager />}

      {/* 结果展示组件 - 只有在有数据且不在合并模式时才显示 */}
      {originalData &&
        originalData.length > 0 &&
        !mergeMode &&
        !inventoryMode && <ResultDisplay />}

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
