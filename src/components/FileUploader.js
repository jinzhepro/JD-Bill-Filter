"use client";

import React, { useState, useRef, useCallback } from "react";
import { Button } from "./ui/button";
import { isValidFileExtension } from "@/lib/fileValidation";
import { Upload, Plus, CheckCircle2, Clock, FolderOpen, Files, Info } from "lucide-react";

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
        console.error("文件选择错误:", error);
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
          return;
        }

        const validFiles = Array.from(files).filter((file) =>
          isValidFileExtensionMemo(file.name)
        );

        if (validFiles.length === 0) {
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
        console.error("文件拖拽错误:", error);
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
                <Plus className="w-4 h-4 text-white" />
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
              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
              .xlsx
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted/60 rounded-full text-muted-foreground">
              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
              .xls
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted/60 rounded-full text-muted-foreground">
              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
              .csv
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-warning/10 rounded-full text-warning">
              <Clock className="w-3.5 h-3.5" />
              最大 50MB
            </span>
            {supportFolder && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-info/10 rounded-full text-info">
                <FolderOpen className="w-3.5 h-3.5" />
                支持文件夹
              </span>
            )}
            {multiple && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 rounded-full text-primary">
                <Files className="w-3.5 h-3.5" />
                多文件
              </span>
            )}
          </div>
        )}

        {tips.length > 0 && (
          <div className="mt-6 p-5 bg-gradient-to-r from-primary/5 to-blue-500/5 rounded-xl border border-primary/10 text-left">
            <h4 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
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