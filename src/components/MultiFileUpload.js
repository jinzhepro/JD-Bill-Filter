"use client";

import React, { useState, useRef, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import {
  validateFileType,
  validateFileSize,
  readFile,
} from "@/lib/excelHandler";
import { validateDataStructure } from "@/lib/dataProcessor";
import { Button } from "./ui/button.js";

export default function MultiFileUpload() {
  const {
    uploadedFiles,
    addFile,
    removeFile,
    addLog,
    setError,
    clearError,
    setProcessing,
    setMergeMode,
    fileDataArray,
    setFileDataArray,
  } = useApp();

  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = useCallback(
    async (files) => {
      if (!files || files.length === 0) return;

      try {
        setProcessing(true);
        clearError();

        const newFileDataArray = [...fileDataArray];
        const validFiles = [];

        for (let i = 0; i < files.length; i++) {
          const file = files[i];

          // 验证文件类型
          if (!validateFileType(file)) {
            throw new Error(
              `文件 "${file.name}" 不是有效的格式（.xlsx, .xls 或 .csv）`
            );
          }

          // 验证文件大小
          if (!validateFileSize(file)) {
            throw new Error(`文件 "${file.name}" 大小超过50MB限制`);
          }

          // 检查文件是否已经上传
          if (uploadedFiles.some((f) => f.name === file.name)) {
            throw new Error(`文件 "${file.name}" 已经上传过了`);
          }

          validFiles.push(file);
        }

        // 处理每个文件
        for (const file of validFiles) {
          addFile(file);
          addLog(`文件 "${file.name}" 添加成功`, "success");

          // 读取文件
          const fileType = file.name
            .match(/\.(xlsx|xls|csv)$/i)[1]
            .toLowerCase();
          const data = await readFile(file, fileType);

          // 验证数据结构
          validateDataStructure(data);
          addLog(`文件 "${file.name}" 数据结构验证通过`, "info");

          // 将文件数据添加到数组中
          newFileDataArray.push({
            fileName: file.name,
            data: data,
          });

          addLog(`文件 "${file.name}" 成功读取 ${data.length} 行数据`, "info");
        }

        setFileDataArray(newFileDataArray);
        addLog(`成功添加 ${validFiles.length} 个文件`, "success");
      } catch (error) {
        console.error("文件处理失败:", error);
        setError(error.message);
        addLog(`文件处理失败: ${error.message}`, "error");
      } finally {
        setProcessing(false);
      }
    },
    [
      uploadedFiles,
      fileDataArray,
      addFile,
      addLog,
      setError,
      clearError,
      setProcessing,
      setFileDataArray,
    ]
  );

  const handleFileInputChange = useCallback(
    (event) => {
      const files = event?.target?.files;
      if (files && files.length > 0) {
        handleFileSelect(Array.from(files));
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event) => {
    event.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (event) => {
      event.preventDefault();
      setIsDragOver(false);

      const files = event.dataTransfer.files;
      if (files && files.length > 0) {
        handleFileSelect(Array.from(files));
      }
    },
    [handleFileSelect]
  );

  const handleButtonClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleRemoveFile = useCallback(
    (index) => {
      const file = uploadedFiles[index];
      removeFile(index);

      // 同时从文件数据数组中移除对应的数据
      const newFileDataArray = fileDataArray.filter(
        (item) => item.fileName !== file.name
      );
      setFileDataArray(newFileDataArray);

      addLog(`文件 "${file.name}" 已移除`, "info");
    },
    [uploadedFiles, fileDataArray, removeFile, addLog, setFileDataArray]
  );

  const handleMergeFiles = useCallback(() => {
    if (fileDataArray.length === 0) {
      setError("没有可合并的文件");
      return;
    }

    setMergeMode(true);
    addLog("开始合并多个文件...", "info");
  }, [fileDataArray, setMergeMode, addLog, setError]);

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
          <div className="text-6xl mb-6">📁</div>
          <h3 className="text-2xl font-semibold text-primary-600 mb-4">
            上传多个Excel/CSV文件
          </h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            拖拽多个文件到此处或点击选择文件（支持 .xlsx, .xls, .csv 格式）
          </p>
          <Button size="lg" disabled={false} className="px-8">
            选择多个文件
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
        />

        <div className="mt-6 text-sm text-gray-500">
          <p>支持的文件格式：.xlsx, .xls, .csv</p>
          <p>最大文件大小：50MB</p>
          <p>支持同时上传多个文件</p>
        </div>

        {/* 已上传文件列表 */}
        {uploadedFiles.length > 0 && (
          <div className="mt-8">
            <h4 className="text-lg font-medium text-gray-800 mb-4">
              已上传文件 ({uploadedFiles.length})
            </h4>
            <div className="space-y-2">
              {uploadedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">📄</span>
                    <div className="text-left">
                      <p className="font-medium text-gray-800">{file.name}</p>
                      <p className="text-sm text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveFile(index)}
                  >
                    移除
                  </Button>
                </div>
              ))}
            </div>

            {/* 合并按钮 */}
            <div className="mt-6 text-center">
              <Button
                size="lg"
                onClick={handleMergeFiles}
                disabled={uploadedFiles.length < 2}
                className="px-8"
              >
                合并所有文件
              </Button>
              {uploadedFiles.length < 2 && (
                <p className="mt-2 text-sm text-gray-500">
                  至少需要2个文件才能进行合并
                </p>
              )}
            </div>
          </div>
        )}

        {/* 处理说明 */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg text-left">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            多文件合并说明
          </h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 支持同时上传多个 Excel (.xlsx, .xls) 和 CSV 文件</li>
            <li>• 系统会自动合并相同SKU和单价的商品记录</li>
            <li>• 合并后会重新计算商品数量和总价</li>
            <li>• 至少需要2个文件才能进行合并操作</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
