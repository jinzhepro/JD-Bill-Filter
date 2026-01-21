"use client";

import React, { useState, useRef, useCallback } from "react";
import { Button } from "./ui/button";
import { isValidFileExtension } from "@/lib/fileValidation";

/**
 * 通用文件上传组件
 * 支持拖拽上传、文件夹上传、单文件上传
 */
export default function FileUploader({
  title = "上传文件",
  description = "拖拽文件到此处，或点击选择文件",
  buttonText = "选择文件",
  onFilesSelected,
  accept = ".xlsx,.xls,.csv",
  multiple = true,
  supportFolder = false,
  showTips = true,
  tips = [],
  disabled = false,
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const inputRef = useRef(null);

  const isValidFileExtensionMemo = useCallback((fileName) => {
    try {
      isValidFileExtension(fileName);
      return true;
    } catch {
      return false;
    }
  }, []);

  // 处理文件选择
  const handleFileSelect = useCallback(
    async (event) => {
      try {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const validFiles = Array.from(files).filter((file) =>
          isValidFileExtensionMemo(file.name)
        );

        if (validFiles.length === 0) {
          console.error(
            `没有找到有效的文件格式。支持的格式: .xlsx, .xls, .csv`
          );
          return;
        }

        const filesWithPath = validFiles.map((file) => ({
          file,
          path: file.webkitRelativePath || file.name,
        }));

        setSelectedFiles(filesWithPath);

        if (onFilesSelected) {
          onFilesSelected(filesWithPath);
        }
      } catch (error) {
        console.error("文件选择失败:", error);
      }
    },
    [isValidFileExtensionMemo, onFilesSelected]
  );

  // 处理拖拽上传
  const handleDrop = useCallback(
    async (event) => {
      event.preventDefault();
      setIsDragOver(false);

      try {
        const files = event.dataTransfer.files;
        if (!files || files.length === 0) {
          console.warn("拖拽区域为空");
          return;
        }

        const validFiles = Array.from(files).filter((file) =>
          isValidFileExtensionMemo(file.name)
        );

        if (validFiles.length === 0) {
          console.warn(
            `没有找到有效的文件。请确保拖拽的是 .xlsx, .xls 或 .csv 文件`
          );
          return;
        }

        const filesWithPath = validFiles.map((file) => ({
          file,
          path: file.name,
        }));

        setSelectedFiles(filesWithPath);

        if (onFilesSelected) {
          onFilesSelected(filesWithPath);
        }
      } catch (error) {
        console.error("拖拽文件处理失败:", error);
      }
    },
    [isValidFileExtensionMemo, onFilesSelected]
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
    inputRef.current?.click();
  }, []);

  // 移除文件
  const handleRemoveFile = useCallback((index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // 获取文件图标
  const getFileIcon = (fileName) => {
    const ext = fileName.split(".").pop().toLowerCase();
    if (["xlsx", "xls"].includes(ext)) {
      return (
        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h6v6h6v10H6z" />
          <path d="M8 12h8v2H8zm0 4h8v2H8z" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h6v6h6v10H6z" />
        <path d="M8 12h8v2H8zm0 4h8v2H8z" />
      </svg>
    );
  };

  // 格式化文件大小
  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <section className="bg-card rounded-lg border border-border p-6">
      <div className="text-center">
        {/* 拖拽区域 */}
        <div
          className={`
            border-2 border-dashed rounded-lg p-10 transition-all duration-300 cursor-pointer
            ${isDragOver
              ? "border-primary bg-primary/5 scale-[1.02]"
              : "border-border bg-muted/50 hover:border-primary/50 hover:bg-muted/80"
            }
            ${disabled ? "opacity-50 cursor-not-allowed" : ""}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={!disabled ? handleButtonClick : undefined}
        >
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {description}
          </p>
          <Button size="lg" variant="outline" disabled={disabled} className="min-w-[140px]">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            {buttonText}
          </Button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          webkitdirectory={supportFolder ? "true" : undefined}
          directory={supportFolder ? "true" : undefined}
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* 已选文件列表 */}
        {selectedFiles.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-foreground mb-3">
              已选择 {selectedFiles.length} 个文件
            </h4>
            <div className="max-h-48 overflow-auto space-y-2 text-left">
              {selectedFiles.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    {getFileIcon(item.file.name)}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {item.path}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(item.file.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile(index);
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {showTips && (
          <div className="mt-6 text-xs text-muted-foreground">
            <p>支持的文件格式：.xlsx, .xls, .csv</p>
            <p>最大文件大小：50MB</p>
            {supportFolder && <p>支持递归处理文件夹中的所有文件</p>}
            {multiple && <p>支持同时上传多个文件</p>}
          </div>
        )}

        {tips.length > 0 && (
          <div className="mt-6 p-4 bg-primary/5 rounded-lg text-left">
            <h4 className="text-xs font-medium text-foreground mb-2">处理说明</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              {tips.map((tip) => (
                <li key={tip}>• {tip}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}