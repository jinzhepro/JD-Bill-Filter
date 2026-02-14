"use client";

import React, { useState, useRef, useCallback } from "react";
import { Button } from "./ui/button";
import { isValidFileExtension } from "@/lib/fileValidation";
import { Upload, FileSpreadsheet, FileText, Trash2 } from "lucide-react";

/**
 * 通用文件上传组件
 * 支持拖拽上传、文件夹上传、单文件上传
 * @param {string} title - 标题
 * @param {string} description - 描述文字
 * @param {string} buttonText - 按钮文字
 * @param {Function} onFilesSelected - 文件选择回调
 * @param {string} accept - 接受的文件类型
 * @param {boolean} multiple - 是否支持多文件
 * @param {boolean} supportFolder - 是否支持文件夹
 * @param {boolean} showTips - 是否显示提示
 * @param {Array} tips - 提示列表
 * @param {boolean} disabled - 是否禁用
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
      return <FileSpreadsheet className="w-5 h-5 text-green-600 dark:text-green-400" />;
    }
    return <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
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
    <section className="bg-card rounded-xl border border-border p-8 shadow-sm">
      <div className="text-center">
        {/* 拖拽区域 */}
        <div
          className={`
            relative overflow-hidden rounded-xl border-2 border-dashed p-12 transition-all duration-300 cursor-pointer
            ${isDragOver
              ? "border-primary bg-primary/5 scale-[1.01] shadow-lg shadow-primary/10"
              : "border-border bg-gradient-to-br from-muted/30 to-muted/60 hover:border-primary/40 hover:bg-gradient-to-br hover:from-muted/50 hover:to-muted/70 hover:shadow-md"
            }
            ${disabled ? "opacity-50 cursor-not-allowed" : ""}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={!disabled ? handleButtonClick : undefined}
        >
          {/* 背景装饰 */}
          <div className="absolute inset-0 -z-10 opacity-30">
            <div className="absolute top-0 left-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl transform translate-x-1/2 translate-y-1/2" />
          </div>

          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-lg">
                <Upload className="w-10 h-10 text-primary" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shadow-md">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
            </div>
          </div>
          <h3 className="text-xl font-bold text-foreground mb-3 tracking-tight">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto leading-relaxed">
            {description}
          </p>
          <Button
            size="lg"
            variant="default"
            disabled={disabled}
            className="min-w-[160px] h-11 rounded-lg font-medium shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-200 hover:-translate-y-0.5"
          >
            <Upload className="w-4 h-4 mr-2" />
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
          <div className="mt-8 flex flex-wrap justify-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted/60 rounded-full text-muted-foreground">
              <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              .xlsx
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted/60 rounded-full text-muted-foreground">
              <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              .xls
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted/60 rounded-full text-muted-foreground">
              <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              .csv
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 rounded-full text-amber-700 dark:text-amber-400">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              最大 50MB
            </span>
            {supportFolder && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 rounded-full text-blue-700 dark:text-blue-400">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                支持文件夹
              </span>
            )}
            {multiple && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 rounded-full text-purple-700 dark:text-purple-400">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                多文件
              </span>
            )}
          </div>
        )}

        {tips.length > 0 && (
          <div className="mt-6 p-5 bg-gradient-to-r from-primary/5 to-blue-500/5 rounded-xl border border-primary/10 text-left">
            <h4 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              处理说明
            </h4>
            <ul className="text-xs text-muted-foreground space-y-2">
              {tips.map((tip, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-primary font-medium">{index + 1}.</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}