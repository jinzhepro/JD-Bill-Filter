"use client";

import React, { useCallback } from "react";
import { useApp } from "@/context/AppContext";
import {
  validateFileType,
  validateFileSize,
  readFile,
} from "@/lib/excelHandler";
import { validateDataStructure, processOrderData } from "@/lib/dataProcessor";
import FileUploader from "./FileUploader";
import { useErrorHandler } from "./ErrorBoundary";

export default function FolderUpload() {
  const {
    addLog,
    setError,
    clearError,
    setProcessing,
    setOriginalData,
    setProcessedData,
  } = useApp();

  const { handleError } = useErrorHandler();

  // 递归遍历文件夹结构，获取所有支持的文件
  const traverseFileTree = useCallback(async (item, path = "") => {
    return new Promise((resolve) => {
      if (item.isFile) {
        item.file((file) => {
          const fileName = file.name.toLowerCase();
          const isValidExtension =
            fileName.endsWith(".xlsx") ||
            fileName.endsWith(".xls") ||
            fileName.endsWith(".csv");

          if (isValidExtension) {
            resolve([{ file, path: path + file.name }]);
          } else {
            resolve([]);
          }
        });
      } else if (item.isDirectory) {
        const dirReader = item.createReader();
        dirReader.readEntries(async (entries) => {
          const allFiles = [];
          for (const entry of entries) {
            const files = await traverseFileTree(entry, path + item.name + "/");
            allFiles.push(...files);
          }
          resolve(allFiles);
        });
      } else {
        resolve([]);
      }
    });
  }, []);

  // 处理文件夹中的文件
  const handleFolderFiles = useCallback(
    async (filesWithPath) => {
      if (!filesWithPath || filesWithPath.length === 0) return;

      try {
        setProcessing(true);
        clearError();

        const allData = [];
        const processedFiles = new Set();
        const errorFiles = [];

        addLog(`开始处理 ${filesWithPath.length} 个文件...`, "info");

        for (const { file, path } of filesWithPath) {
          const fileKey = `${file.name}-${file.size}`;
          if (processedFiles.has(fileKey)) {
            addLog(`文件 "${path}" 已处理过，跳过`, "info");
            continue;
          }
          processedFiles.add(fileKey);

          if (!validateFileSize(file)) {
            addLog(`文件 "${path}" 大小超过50MB限制，已跳过`, "warning");
            continue;
          }

          addLog(`正在处理文件: ${path}`, "info");

          try {
            const fileExtensionMatch = file.name.match(/\.(xlsx|xls|csv)$/i);
            if (!fileExtensionMatch) {
              throw new Error(`不支持的文件格式: ${file.name}`);
            }

            const fileType = fileExtensionMatch[1].toLowerCase();
            const data = await readFile(file, fileType);

            if (!data || data.length === 0) {
              addLog(`文件 "${path}" 数据为空，跳过`, "warning");
              continue;
            }

            validateDataStructure(data);
            addLog(`文件 "${path}" 数据结构验证通过`, "info");

            allData.push(...data);
            addLog(`文件 "${path}" 成功读取 ${data.length} 行数据`, "info");
          } catch (error) {
            const errorMsg = `文件 "${path}" 处理失败: ${error.message}`;
            addLog(errorMsg, "error");
            errorFiles.push({ path, error: error.message });
            // 继续处理其他文件，不中断整个流程
          }
        }

        if (allData.length === 0) {
          const errorDetail = errorFiles.length > 0
            ? `\n错误详情:\n${errorFiles.map(f => `- ${f.path}: ${f.error}`).join('\n')}`
            : '';
          setError(
            `没有找到有效的文件数据。请确保文件夹中包含有效的 .xlsx, .xls 或 .csv 格式的文件。${errorDetail}`
          );
          return;
        }

        // 如果有部分文件处理失败，给出警告
        if (errorFiles.length > 0) {
          addLog(
            `警告: ${errorFiles.length} 个文件处理失败，但继续处理剩余 ${filesWithPath.length - errorFiles.length} 个文件`,
            "warning"
          );
        }

        setOriginalData(allData);
        addLog(`总共读取 ${allData.length} 行数据`, "info");

        try {
          addLog("开始处理订单数据...", "info");
          const processedData = processOrderData(allData);
          setProcessedData(processedData);
          addLog(`成功处理 ${processedData.length} 条订单记录`, "success");
          addLog("文件夹上传完成", "success");
        } catch (error) {
          handleError(error, "订单数据处理");
          throw error;
        }
      } catch (error) {
        handleError(error, "文件夹处理");
        throw error;
      } finally {
        setProcessing(false);
      }
    },
    [
      addLog,
      setError,
      clearError,
      setProcessing,
      setOriginalData,
      setProcessedData,
      handleError,
    ]
  );

  // 处理拖拽的文件夹
  const handleDrop = useCallback(
    async (event) => {
      const items = event.dataTransfer.items;
      if (!items || items.length === 0) {
        handleError(new Error("没有拖拽任何文件或文件夹"), "拖拽上传");
        return;
      }

      try {
        setProcessing(true);
        clearError();

        const allFiles = [];
        const errorCount = { directories: 0, files: 0 };

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.kind === "file") {
            try {
              const entry = item.webkitGetAsEntry();
              if (!entry) {
                errorCount.files++;
                addLog(`无法获取文件条目: ${item.name}`, "warning");
                continue;
              }

              if (entry.isDirectory) {
                const files = await traverseFileTree(entry);
                allFiles.push(...files);
                addLog(
                  `从文件夹 "${entry.name}" 中找到 ${files.length} 个文件`,
                  "info"
                );
              } else if (entry.isFile) {
                const file = await new Promise((resolve, reject) => {
                  entry.file(resolve, reject);
                }).catch((err) => {
                  errorCount.files++;
                  addLog(`读取文件失败: ${entry.name} - ${err.message}`, "error");
                  return null;
                });

                if (!file) continue;

                const fileName = file.name.toLowerCase();
                const isValidExtension =
                  fileName.endsWith(".xlsx") ||
                  fileName.endsWith(".xls") ||
                  fileName.endsWith(".csv");

                if (isValidExtension) {
                  allFiles.push({ file, path: file.name });
                  addLog(`找到有效文件: ${file.name}`, "info");
                } else {
                  addLog(`跳过不支持的文件格式: ${file.name}`, "info");
                }
              }
            } catch (error) {
              errorCount.directories++;
              addLog(`处理文件条目失败: ${error.message}`, "error");
            }
          }
        }

        if (allFiles.length === 0) {
          const errorMsg = `没有找到有效的文件或文件夹。`;
          if (errorCount.directories > 0 || errorCount.files > 0) {
            setError(
              `${errorMsg}\n处理失败: ${errorCount.directories} 个文件夹, ${errorCount.files} 个文件`
            );
          } else {
            setError(errorMsg);
          }
          setProcessing(false);
          return;
        }

        addLog(`总共找到 ${allFiles.length} 个有效文件，开始处理...`, "info");
        await handleFolderFiles(allFiles);
      } catch (error) {
        handleError(error, "拖拽文件夹处理");
        setProcessing(false);
      }
    },
    [
      traverseFileTree,
      handleFolderFiles,
      addLog,
      setError,
      clearError,
      setProcessing,
      handleError,
    ]
  );

  return (
    <FileUploader
      title="上传文件夹"
      description="拖拽一个或多个文件夹到此处，或点击选择文件夹（将自动递归处理所有支持的文件）"
      buttonText="选择文件夹"
      onFilesSelected={handleFolderFiles}
      supportFolder={true}
      tips={[
        "支持上传一个或多个文件夹，系统会递归处理所有子文件夹",
        "可以同时拖拽多个文件夹到上传区域",
        "自动识别并处理 Excel (.xlsx, .xls) 和 CSV 文件",
        "自动跳过不支持的文件格式和重复文件",
        "显示文件的完整路径，便于识别文件来源",
        "自动合并所有文件数据并直接处理，无需手动合并",
      ]}
    />
  );
}