"use client";

import React, { useState, useRef } from "react";
import { useApp } from "@/context/AppContext";
import Button from "./ui/Button";

export function PDFUpload() {
  const { addLog, setError } = useApp();

  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // 处理文件拖拽
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // 处理文件拖放
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // 处理文件选择
  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  // 处理文件
  const handleFile = async (file) => {
    setIsProcessing(true);

    try {
      addLog(`收到PDF文件: ${file.name}`, "info");

      // 暂时禁用PDF解析功能
      throw new Error(
        "PDF解析功能暂时不可用，请手动输入库存信息。我们正在优化此功能，敬请期待。"
      );
    } catch (error) {
      console.error("PDF处理失败:", error);
      setError(error.message);
      addLog(`PDF处理失败: ${error.message}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // 打开文件选择对话框
  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <section className="bg-white rounded-xl shadow-lg p-6 animate-fade-in">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">上传发票PDF</h2>

      <div className="space-y-4">
        {/* 拖拽上传区域 */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? "border-primary-500 bg-primary-50"
              : "border-gray-300 hover:border-gray-400"
          } ${
            isProcessing ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={!isProcessing ? openFileDialog : undefined}
        >
          <div className="flex flex-col items-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-gray-400"
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

            <div>
              <p className="text-lg font-medium text-gray-700">
                {isProcessing ? "处理中..." : "拖拽PDF文件到此处"}
              </p>
              <p className="text-sm text-gray-500 mt-1">或点击选择文件</p>
            </div>

            <p className="text-xs text-gray-400">
              支持PDF格式，文件大小不超过10MB
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isProcessing}
          />
        </div>

        {/* 上传按钮 */}
        <div className="flex justify-center">
          <Button
            onClick={openFileDialog}
            disabled={isProcessing}
            className="w-full md:w-auto"
          >
            {isProcessing ? "处理中..." : "选择PDF文件"}
          </Button>
        </div>

        {/* 功能说明 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-medium text-yellow-800 mb-2">功能说明：</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• PDF解析功能正在优化中，暂时不可用</li>
            <li>• 请使用"添加库存项"手动输入库存信息</li>
            <li>• 支持物料名称、规格、数量、采购批号、SKU等字段</li>
            <li>• 支持实时编辑SKU字段</li>
            <li>• 库存列表按采购批号分组显示</li>
          </ul>
        </div>

        {/* 开发中提示 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-800 mb-2">开发计划：</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 支持多种发票格式的自动识别</li>
            <li>• 智能提取物料信息</li>
            <li>• 自动识别批号信息</li>
            <li>• 批量导入库存数据</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
