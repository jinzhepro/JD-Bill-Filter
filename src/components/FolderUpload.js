"use client";

import React, { useState, useRef, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import {
  validateFileType,
  validateFileSize,
  readFile,
} from "@/lib/excelHandler";
import { validateDataStructure, processOrderData } from "@/lib/dataProcessor";
import Button from "./ui/Button";

export default function FolderUpload() {
  const {
    addLog,
    setError,
    clearError,
    setProcessing,
    setOriginalData,
    setProcessedData,
  } = useApp();

  const [isDragOver, setIsDragOver] = useState(false);
  const folderInputRef = useRef(null);

  // 递归遍历文件夹结构，获取所有支持的文件
  const traverseFileTree = useCallback(async (item, path = "") => {
    return new Promise((resolve) => {
      if (item.isFile) {
        item.file((file) => {
          // 检查文件类型 - 对于文件夹中的文件，MIME类型可能为空，所以主要依赖文件扩展名
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

        const allData = []; // 存储所有文件的数据
        const processedFiles = new Set(); // 用于去重

        addLog(`开始处理 ${filesWithPath.length} 个文件...`, "info");

        // 处理每个文件
        for (const { file, path } of filesWithPath) {
          // 检查文件是否已经处理过（基于文件名和大小）
          const fileKey = `${file.name}-${file.size}`;
          if (processedFiles.has(fileKey)) {
            addLog(`文件 "${path}" 已处理过，跳过`, "info");
            continue;
          }
          processedFiles.add(fileKey);

          // 验证文件大小
          if (!validateFileSize(file)) {
            addLog(`文件 "${path}" 大小超过50MB限制，已跳过`, "warning");
            continue;
          }

          addLog(`正在处理文件: ${path}`, "info");

          try {
            // 读取文件
            const fileType = file.name
              .match(/\.(xlsx|xls|csv)$/i)[1]
              .toLowerCase();
            const data = await readFile(file, fileType);

            // 验证数据结构
            validateDataStructure(data);
            addLog(`文件 "${path}" 数据结构验证通过`, "info");

            // 将数据添加到总数据中
            allData.push(...data);
            addLog(`文件 "${path}" 成功读取 ${data.length} 行数据`, "info");
          } catch (error) {
            addLog(`文件 "${path}" 处理失败: ${error.message}`, "error");
            // 继续处理其他文件
          }
        }

        if (allData.length === 0) {
          setError(
            "没有找到有效的文件数据。请确保文件夹中包含有效的 .xlsx, .xls 或 .csv 格式的文件。"
          );
          return;
        }

        // 设置原始数据
        setOriginalData(allData);
        addLog(`总共读取 ${allData.length} 行数据`, "info");

        // 处理订单数据
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

  // 处理文件夹选择
  const handleFolderSelect = useCallback(
    async (event) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      // 过滤出有效的文件（基于文件扩展名）
      const validFiles = Array.from(files).filter((file) => {
        const fileName = file.name.toLowerCase();
        return (
          fileName.endsWith(".xlsx") ||
          fileName.endsWith(".xls") ||
          fileName.endsWith(".csv")
        );
      });

      if (validFiles.length === 0) {
        setError("选择的文件夹中没有找到有效的文件格式（.xlsx, .xls, .csv）");
        return;
      }

      const filesWithPath = validFiles.map((file) => ({
        file,
        path: file.webkitRelativePath || file.name,
      }));

      addLog(`从文件夹中找到 ${validFiles.length} 个有效文件`, "info");
      await handleFolderFiles(filesWithPath);
    },
    [handleFolderFiles, setError, addLog]
  );

  // 处理拖拽的文件夹
  const handleDrop = useCallback(
    async (event) => {
      event.preventDefault();
      setIsDragOver(false);

      const items = event.dataTransfer.items;
      if (!items || items.length === 0) return;

      try {
        setProcessing(true);
        clearError();

        const allFiles = [];

        // 处理拖拽的项目 - 支持多个文件夹
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.kind === "file") {
            const entry = item.webkitGetAsEntry();
            if (entry) {
              if (entry.isDirectory) {
                // 如果是文件夹，递归遍历
                const files = await traverseFileTree(entry);
                allFiles.push(...files);
                addLog(
                  `从文件夹 "${entry.name}" 中找到 ${files.length} 个文件`,
                  "info"
                );
              } else if (entry.isFile) {
                // 如果是单个文件，检查是否为有效格式
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

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event) => {
    event.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleButtonClick = useCallback(() => {
    folderInputRef.current?.click();
  }, []);

  return (
    <section className="bg-white rounded-xl shadow-lg p-8 animate-fade-in">
      <div className="text-center">
        <div
          className={`
            border-3 border-dashed rounded-xl p-16 transition-all duration-300 cursor-pointer
            ${
              isDragOver
                ? "border-green-500 bg-green-50 transform scale-102"
                : "border-primary-300 bg-primary-50 hover:border-primary-400 hover:bg-primary-100"
            }
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleButtonClick}
        >
          <div className="text-6xl mb-6">📂</div>
          <h3 className="text-2xl font-semibold text-primary-600 mb-4">
            上传文件夹
          </h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            拖拽一个或多个文件夹到此处，或点击选择文件夹（将自动递归处理所有支持的文件）
          </p>
          <Button variant="primary" size="lg" disabled={false} className="px-8">
            选择文件夹
          </Button>
        </div>

        <input
          ref={folderInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          multiple
          webkitdirectory="true"
          directory="true"
          onChange={handleFolderSelect}
          className="hidden"
        />

        <div className="mt-6 text-sm text-gray-500">
          <p>支持的文件格式：.xlsx, .xls, .csv</p>
          <p>最大文件大小：50MB</p>
          <p>支持递归处理文件夹中的所有文件</p>
          <p>支持同时上传多个文件夹</p>
          <p>自动跳过重复和无效文件</p>
        </div>

        {/* 处理说明 */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg text-left">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            文件夹上传说明
          </h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 支持上传一个或多个文件夹，系统会递归处理所有子文件夹</li>
            <li>• 可以同时拖拽多个文件夹到上传区域</li>
            <li>• 自动识别并处理 Excel (.xlsx, .xls) 和 CSV 文件</li>
            <li>• 自动跳过不支持的文件格式和重复文件</li>
            <li>• 显示文件的完整路径，便于识别文件来源</li>
            <li>• 自动合并所有文件数据并直接处理，无需手动合并</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
