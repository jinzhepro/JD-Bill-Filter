"use client";

import React, { useState, useRef, useCallback } from "react";
import { Button } from "./ui/button";

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
  const inputRef = useRef(null);

  // 验证文件扩展名
  const isValidFileExtension = useCallback((fileName) => {
    const lowerName = fileName.toLowerCase();
    return (
      lowerName.endsWith(".xlsx") ||
      lowerName.endsWith(".xls") ||
      lowerName.endsWith(".csv")
    );
  }, []);

  // 处理文件选择
  const handleFileSelect = useCallback(
    async (event) => {
      try {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const validFiles = Array.from(files).filter((file) =>
          isValidFileExtension(file.name)
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

        if (onFilesSelected) {
          onFilesSelected(filesWithPath);
        }
      } catch (error) {
        console.error("文件选择失败:", error);
      }
    },
    [isValidFileExtension, onFilesSelected]
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
          isValidFileExtension(file.name)
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

        if (onFilesSelected) {
          onFilesSelected(filesWithPath);
        }
      } catch (error) {
        console.error("拖拽文件处理失败:", error);
      }
    },
    [isValidFileExtension, onFilesSelected]
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

  return (
    <section className="bg-card rounded-lg shadow p-8">
      <div className="text-center">
        <div
          className={`
            border-3 border-dashed rounded-lg p-16 transition-all duration-300 cursor-pointer
            ${
              isDragOver
                ? "border-primary bg-primary/10"
                : "border-border bg-muted hover:border-primary hover:bg-muted/80"
            }
            ${disabled ? "opacity-50 cursor-not-allowed" : ""}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={!disabled ? handleButtonClick : undefined}
        >
          <div className="text-6xl mb-6">📂</div>
          <h3 className="text-2xl font-semibold text-foreground mb-4">
            {title}
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            {description}
          </p>
          <Button size="lg" disabled={disabled} className="px-8">
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

        {showTips && (
          <div className="mt-6 text-sm text-muted-foreground">
            <p>支持的文件格式：.xlsx, .xls, .csv</p>
            <p>最大文件大小：50MB</p>
            {supportFolder && <p>支持递归处理文件夹中的所有文件</p>}
            {multiple && <p>支持同时上传多个文件</p>}
          </div>
        )}

        {tips.length > 0 && (
          <div className="mt-8 p-4 bg-primary/10 rounded-lg text-left">
            <h4 className="text-sm font-medium text-foreground mb-2">处理说明</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {tips.map((tip, index) => (
                <li key={index}>• {tip}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}