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

export default function FolderUpload() {
  const {
    addLog,
    setError,
    clearError,
    setProcessing,
    setOriginalData,
    setProcessedData,
  } = useApp();

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
            const fileType = file.name
              .match(/\.(xlsx|xls|csv)$/i)[1]
              .toLowerCase();
            const data = await readFile(file, fileType);

            validateDataStructure(data);
            addLog(`文件 "${path}" 数据结构验证通过`, "info");

            allData.push(...data);
            addLog(`文件 "${path}" 成功读取 ${data.length} 行数据`, "info");
          } catch (error) {
            addLog(`文件 "${path}" 处理失败: ${error.message}`, "error");
          }
        }

        if (allData.length === 0) {
          setError(
            "没有找到有效的文件数据。请确保文件夹中包含有效的 .xlsx, .xls 或 .csv 格式的文件。"
          );
          return;
        }

        setOriginalData(allData);
        addLog(`总共读取 ${allData.length} 行数据`, "info");

        addLog("开始处理订单数据...", "info");
        const processedData = processOrderData(allData);
        setProcessedData(processedData);
        addLog(`成功处理 ${processedData.length} 条订单记录`, "success");
        addLog("文件夹上传完成", "success");
      } catch (error) {
        console.error("文件夹处理失败:", error);
        setError(error.message);
        addLog(`文件夹处理失败: ${error.message}`, "error");
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
    ]
  );

  // 处理拖拽的文件夹
  const handleDrop = useCallback(
    async (event) => {
      const items = event.dataTransfer.items;
      if (!items || items.length === 0) return;

      try {
        setProcessing(true);
        clearError();

        const allFiles = [];

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.kind === "file") {
            const entry = item.webkitGetAsEntry();
            if (entry) {
              if (entry.isDirectory) {
                const files = await traverseFileTree(entry);
                allFiles.push(...files);
                addLog(
                  `从文件夹 "${entry.name}" 中找到 ${files.length} 个文件`,
                  "info"
                );
              } else if (entry.isFile) {
                const file = await new Promise((resolve) => {
                  entry.file(resolve);
                });

                const fileName = file.name.toLowerCase();
                const isValidExtension =
                  fileName.endsWith(".xlsx") ||
                  fileName.endsWith(".xls") ||
                  fileName.endsWith(".csv");

                if (isValidExtension) {
                  allFiles.push({ file, path: file.name });
                  addLog(`找到有效文件: ${file.name}`, "info");
                }
              }
            }
          }
        }

        if (allFiles.length === 0) {
          setError("没有找到有效的文件或文件夹");
          setProcessing(false);
          return;
        }

        addLog(`总共找到 ${allFiles.length} 个有效文件，开始处理...`, "info");
        await handleFolderFiles(allFiles);
      } catch (error) {
        console.error("拖拽文件夹处理失败:", error);
        setError(error.message);
        addLog(`拖拽文件夹处理失败: ${error.message}`, "error");
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