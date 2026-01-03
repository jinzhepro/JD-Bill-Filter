"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { processMultipleFilesData } from "@/lib/dataProcessor";
import { downloadExcel } from "@/lib/excelHandler";
import Button from "./ui/Button";

export default function MergeProcessor() {
  const {
    uploadedFiles,
    fileDataArray,
    mergeMode,
    setMergeMode,
    setMergedData,
    mergedData,
    addLog,
    setError,
    clearError,
    setProcessing,
    reset,
  } = useApp();

  const [isProcessing, setIsProcessing] = useState(false);

  // 处理多文件合并
  const handleMergeProcess = useCallback(async () => {
    if (!fileDataArray || fileDataArray.length === 0) {
      setError("没有可合并的文件数据");
      return;
    }

    try {
      setIsProcessing(true);
      setProcessing(true);
      clearError();

      addLog("开始处理多文件合并...", "info");

      // 提取所有文件的数据
      const dataArray = fileDataArray.map((item) => item.data);

      // 处理多文件数据合并
      const mergedResult = processMultipleFilesData(dataArray);

      // 设置合并后的数据
      setMergedData(mergedResult);

      addLog(
        `多文件合并完成，生成 ${mergedResult.length} 条合并记录`,
        "success"
      );

      // 计算统计信息
      const totalQuantity = mergedResult.reduce(
        (sum, item) => sum + parseFloat(item.商品数量 || 0),
        0
      );
      const totalAmount = mergedResult.reduce(
        (sum, item) => sum + parseFloat(item.总价 || 0),
        0
      );

      addLog(
        `合并统计：商品总数 ${totalQuantity}，总金额 ¥${totalAmount.toFixed(
          2
        )}`,
        "info"
      );
    } catch (error) {
      console.error("多文件合并失败:", error);
      setError(error.message);
      addLog(`多文件合并失败: ${error.message}`, "error");
    } finally {
      setIsProcessing(false);
      setProcessing(false);
    }
  }, [
    fileDataArray,
    setMergedData,
    addLog,
    setError,
    clearError,
    setProcessing,
  ]);

  // 下载合并结果
  const handleDownloadMerged = useCallback(() => {
    if (!mergedData || mergedData.length === 0) return;

    try {
      const fileName = `多文件合并结果_${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;
      downloadExcel(mergedData, fileName);
      addLog(`合并结果已下载: ${fileName}`, "success");
    } catch (error) {
      console.error("下载合并结果失败:", error);
      setError(`下载失败: ${error.message}`);
    }
  }, [mergedData, addLog, setError]);

  // 重置合并模式
  const handleResetMerge = useCallback(() => {
    setMergeMode(false);
    setMergedData([]);
    reset();
  }, [setMergeMode, setMergedData, reset]);

  // 当进入合并模式时自动开始处理
  useEffect(() => {
    if (
      mergeMode &&
      fileDataArray &&
      fileDataArray.length > 0 &&
      !mergedData.length
    ) {
      handleMergeProcess();
    }
  }, [mergeMode, fileDataArray, mergedData.length, handleMergeProcess]);

  if (!mergeMode) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* 返回按钮和标题 */}
      <div className="flex justify-between items-center">
        <Button
          onClick={handleResetMerge}
          className="bg-gray-200 text-gray-700 hover:bg-gray-300"
        >
          ← 返回主界面
        </Button>
        <h1 className="text-2xl font-bold text-white">多文件合并处理</h1>
        <div></div>
      </div>

      {/* 合并处理状态 */}
      <section className="bg-white rounded-xl shadow-lg p-8 animate-fade-in">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            多文件合并处理
          </h2>

          {isProcessing ? (
            <div className="py-8">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              <p className="mt-4 text-gray-600">
                正在处理多文件合并，请稍候...
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 合并统计信息 */}
              {mergedData && mergedData.length > 0 && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <h3 className="text-sm font-medium text-green-900 mb-2">
                    合并统计
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-green-700">原始文件数:</span>
                      <span className="ml-2 font-medium text-green-900">
                        {uploadedFiles.length}
                      </span>
                    </div>
                    <div>
                      <span className="text-green-700">合并后记录数:</span>
                      <span className="ml-2 font-medium text-green-900">
                        {mergedData.length}
                      </span>
                    </div>
                    <div>
                      <span className="text-green-700">商品总数:</span>
                      <span className="ml-2 font-medium text-green-900">
                        {mergedData.reduce(
                          (sum, item) => sum + parseFloat(item.商品数量 || 0),
                          0
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-green-700">总金额:</span>
                      <span className="ml-2 font-medium text-green-900">
                        ¥
                        {mergedData
                          .reduce(
                            (sum, item) => sum + parseFloat(item.总价 || 0),
                            0
                          )
                          .toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex justify-center gap-4">
                {mergedData && mergedData.length > 0 && (
                  <Button variant="success" onClick={handleDownloadMerged}>
                    下载合并结果
                  </Button>
                )}
                <Button variant="primary" onClick={handleMergeProcess}>
                  重新合并
                </Button>
                <Button variant="danger" onClick={handleResetMerge}>
                  重新开始
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 合并结果展示 */}
      {mergedData && mergedData.length > 0 && (
        <section className="bg-white rounded-xl shadow-lg p-8 animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                合并结果预览
              </h3>
              <p className="text-gray-600">
                显示前 20 条合并记录（共 {mergedData.length} 条）
              </p>
            </div>
          </div>

          {/* 合并结果表格 */}
          <div className="table-container custom-scrollbar">
            <table className="preview-table">
              <thead>
                <tr>
                  {mergedData.length > 0 &&
                    Object.keys(mergedData[0]).map((header, index) => (
                      <th key={index}>{header}</th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {mergedData.slice(0, 20).map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {Object.entries(row).map(([key, value]) => (
                      <td key={key}>
                        {key === "单价" || key === "总价"
                          ? `¥${parseFloat(value).toFixed(2)}`
                          : value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {mergedData.length > 20 && (
            <div className="mt-4 text-center text-sm text-gray-500">
              还有 {mergedData.length - 20} 条记录未显示，请下载完整结果查看
            </div>
          )}
        </section>
      )}
    </div>
  );
}
