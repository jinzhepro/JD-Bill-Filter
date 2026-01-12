"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { processMultipleFilesData } from "@/lib/dataProcessor";
import { downloadExcel } from "@/lib/excelHandler";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";

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
    resetOrder,
  } = useApp();

  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  // 提取文件名中的日期部分
  const extractDateFromFileName = (fileName) => {
    if (!fileName) {
      return "";
    }

    // 优先匹配格式：数字_数字（如 162418297002_20251130），取后面的8位数字
    const underscoreMatch = fileName.match(/_\d{8}/);
    if (underscoreMatch) {
      const datePart = underscoreMatch[0].substring(1); // 去掉下划线
      return datePart;
    }

    // 如果没有下划线格式，匹配任何8位数字
    const dateMatch = fileName.match(/(\d{8})/);

    if (dateMatch) {
      return dateMatch[1];
    }

    // 如果都没有找到，返回去除扩展名的文件名
    return fileName.replace(/\.[^/.]+$/, "");
  };

  // 复制列数据功能
  const handleCopyColumn = async (columnName) => {
    try {
      const dataToCopy = mergedData
        .map((row) => row[columnName])
        .filter((value) => value !== null && value !== undefined);
      const textToCopy = dataToCopy.join("\n");

      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        // 降级方案：使用 textarea
        const textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }

      addLog(
        `已复制列 "${columnName}" 的 ${dataToCopy.length} 条数据到剪贴板`,
        "success"
      );
      toast({
        title: `已复制列 "${columnName}" 的 ${dataToCopy.length} 条数据到剪贴板`,
      });
    } catch (err) {
      console.error("复制失败:", err);
      addLog(`复制列 "${columnName}" 失败`, "error");
      toast({
        variant: "destructive",
        title: `复制列 "${columnName}" 失败`,
      });
    }
  };

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
      toast({
        title: "多文件合并成功",
        description: `生成了 ${mergedResult.length} 条合并记录`,
      });
    } catch (error) {
      console.error("多文件合并失败:", error);
      setError(error.message);
      addLog(`多文件合并失败: ${error.message}`, "error");
      toast({
        variant: "destructive",
        title: "多文件合并失败",
        description: error.message,
      });
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
      // 提取所有文件的日期部分
      const dateParts = uploadedFiles
        .map((file) => extractDateFromFileName(file.name))
        .filter((date) => date);
      let datePart;

      if (dateParts.length === 0) {
        datePart = "data";
      } else if (dateParts.length === 1) {
        datePart = dateParts[0];
      } else {
        // 多个文件时，用分隔符连接日期
        datePart = dateParts.join("_to_");
      }

      const fileName = `合并结果_${datePart}.xlsx`;
      downloadExcel(mergedData, fileName);
      toast({
        title: "合并结果已下载",
        description: fileName,
      });
      addLog(`已下载合并结果文件: ${fileName}`, "success");
    } catch (error) {
      console.error("下载失败:", error);
      addLog("下载合并结果失败", "error");
      toast({
        variant: "destructive",
        title: "下载失败",
        description: error.message,
      });
    }
  }, [mergedData, uploadedFiles, addLog]);

  // 重置合并
  const handleResetMerge = useCallback(() => {
    setMergeMode(false);
    setMergedData([]);
    resetOrder();
    addLog("已重置合并状态，返回主界面", "info");
  }, [setMergeMode, setMergedData, resetOrder, addLog]);

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

      {/* 合并结果展示 */}
      {mergedData && mergedData.length > 0 && (
        <section className="bg-white rounded-xl shadow-lg p-8 animate-fade-in">
          {/* 统计信息 */}
          <div className="mb-6 p-4 bg-green-50 rounded-lg">
            <h3 className="text-sm font-medium text-green-900 mb-2">
              合并统计
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">合并文件数：</span>
                <span className="font-semibold text-gray-900 ml-2">
                  {uploadedFiles?.length || 0}
                </span>
              </div>
              <div>
                <span className="text-gray-600">合并记录数：</span>
                <span className="font-semibold text-gray-900 ml-2">
                  {mergedData.length}
                </span>
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="mb-6 flex gap-3 flex-wrap">
            <Button
              variant="success"
              onClick={handleDownloadMerged}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              下载Excel结果 📊
            </Button>
            <Button onClick={handleMergeProcess}>重新合并</Button>
            <Button variant="destructive" onClick={handleResetMerge}>
              重新开始
            </Button>
          </div>

          {/* 合并结果表格 */}
          <div className="table-container custom-scrollbar">
            <table className="preview-table">
              <thead>
                <tr>
                  {mergedData.length > 0 &&
                    Object.keys(mergedData[0]).map((header, index) => (
                      <th
                        key={index}
                        onClick={() => handleCopyColumn(header)}
                        title={`点击复制 "${header}" 列数据`}
                        className="cursor-pointer hover:bg-blue-50 transition-colors"
                      >
                        {header} 📋
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {mergedData.map((row, rowIndex) => (
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
            <div className="mt-2 text-sm text-gray-500 text-center">
              💡 提示：点击表头可复制该列的所有数据
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
