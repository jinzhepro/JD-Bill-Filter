"use client";

import React, { useCallback } from "react";
import { useSettlement } from "@/context/SettlementContext";
import { validateFileSize, readFile } from "@/lib/excelHandler";
import {
  validateSettlementDataStructure,
  processSettlementData,
} from "@/lib/settlementProcessor";
import FileUploader from "./FileUploader";
import { useErrorHandler } from "./ErrorBoundary";
import { useToast } from "@/hooks/use-toast";

/**
 * 处理单个文件的读取和验证
 * @param {Object} fileWithPath - 文件和路径信息
 * @param {number} index - 文件索引
 * @param {number} totalFiles - 总文件数
 * @param {Function} addLog - 日志添加函数
 * @returns {Object} 包含文件数据和错误信息的对象
 */
async function processSingleFile(fileWithPath, index, totalFiles, addLog) {
  const { file, path } = fileWithPath;

  addLog(`处理第 ${index + 1}/${totalFiles} 个文件: ${path}`, "info");

  if (!validateFileSize(file)) {
    const errorMsg = `文件过大（超过50MB），已跳过: ${path}`;
    addLog(errorMsg, "warning");
    return { error: errorMsg };
  }

  try {
    const fileExtensionMatch = file.name.match(/\.(xlsx|xls|csv)$/i);
    if (!fileExtensionMatch) {
      throw new Error(`不支持的文件格式: ${file.name}`);
    }

    const fileType = fileExtensionMatch[1].toLowerCase();

    addLog(`正在读取文件: ${path}`, "info");
    const data = await readFile(file, fileType);
    addLog(`文件读取完成: ${path}，共 ${data?.length || 0} 行`, "info");

    if (!data || data.length === 0) {
      addLog(`文件数据为空，跳过: ${path}`, "warning");
      return { data: null };
    }

    addLog(`正在验证数据结构: ${path}`, "info");
    validateSettlementDataStructure(data);
    addLog(`数据结构验证通过: ${path}`, "info");

    addLog(`已添加 ${data.length} 行数据到处理队列`, "info");
    return { data };
  } catch (error) {
    const errorMsg = `${path}: ${error.message}`;
    addLog(`文件处理失败: ${errorMsg}`, "error");
    return { error: errorMsg };
  }
}

/**
 * 处理所有文件的读取和验证
 * @param {Array} filesWithPath - 文件列表
 * @param {Function} addLog - 日志添加函数
 * @returns {Object} 包含所有有效数据和错误信息的对象
 */
async function processAllFiles(filesWithPath, addLog) {
  const allData = [];
  const errors = [];

  for (let i = 0; i < filesWithPath.length; i++) {
    const result = await processSingleFile(filesWithPath[i], i, filesWithPath.length, addLog);

    if (result.data) {
      allData.push(...result.data);
    } else if (result.error) {
      errors.push(result.error);
    }
  }

  return { allData, errors };
}

export default function SettlementFolderUpload() {
  const {
    addLog,
    setError,
    clearError,
    setProcessing,
    setOriginalData,
    setProcessedData,
  } = useSettlement();

  const { handleError } = useErrorHandler();
  const { toast } = useToast();

  // 处理文件
  const handleFiles = useCallback(
    async (filesWithPath) => {
      if (!filesWithPath || filesWithPath.length === 0) {
        handleError(new Error("没有文件需要处理"), "文件上传");
        return;
      }

      try {
        setProcessing(true);
        clearError();

        addLog(`开始处理 ${filesWithPath.length} 个文件...`, "info");

        const { allData, errors } = await processAllFiles(filesWithPath, addLog);

        addLog(`文件处理完成，共读取 ${allData.length} 行有效数据`, "info");

        if (allData.length === 0) {
          const errorMsg =
            errors.length > 0
              ? errors.join("\n")
              : "没有找到有效的文件数据";

          toast({
            variant: "destructive",
            title: "文件处理失败",
            description: errorMsg.length > 100 ? errorMsg.substring(0, 100) + "..." : errorMsg,
          });
          return;
        }

        // 如果有部分文件处理失败，给出警告
        if (errors.length > 0) {
          addLog(`警告: ${errors.length} 个文件处理失败，但继续处理剩余数据`, "warning");
        }

        addLog(`设置原始数据: ${allData.length} 行`, "info");
        setOriginalData(allData);

        try {
          addLog("开始处理结算单数据...");
          const processedData = await processSettlementData(allData);
          addLog(`结算单处理完成，合并为 ${processedData.length} 条记录`, "success");

          setProcessedData(processedData);
          addLog("上传完成", "success");
        } catch (error) {
          handleError(error, "结算单数据处理");
          throw error;
        }
      } catch (error) {
        handleError(error, "文件上传处理");
        throw error;
      } finally {
        setProcessing(false);
      }
    },
    [
      addLog,
      clearError,
      setProcessing,
      setOriginalData,
      setProcessedData,
      handleError,
    ]
  );

  return (
    <FileUploader
      title="上传结算单文件"
      description="拖拽文件到此处，或点击选择文件（支持 .xlsx, .xls, .csv）"
      buttonText="选择文件"
      onFilesSelected={handleFiles}
      supportFolder={false}
      multiple={false}
      tips={[
        "自动合并相同商品编号的货款和数量（仅限费用名称为货款的记录）",
        "每次只能上传一个文件",
        "合并后可直接导出结果",
      ]}
    />
  );
}