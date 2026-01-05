"use client";

import React, { useState, useCallback } from "react";
import { Button } from "./ui/button";
import Modal from "./ui/modal";
import { useToast } from "@/hooks/use-toast";

export function BatchPdfUpload({ batchName, onUploadSuccess, onClose }) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [description, setDescription] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // 处理文件选择
  const handleFileSelect = useCallback(
    (file) => {
      if (file && file.type === "application/pdf") {
        setSelectedFile(file);
      } else {
        toast({
          variant: "destructive",
          title: "文件类型错误",
          description: "只支持PDF文件",
        });
      }
    },
    [toast]
  );

  // 处理拖拽事件
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  // 处理文件拖放
  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    },
    [handleFileSelect]
  );

  // 处理文件输入变化
  const handleFileInputChange = useCallback(
    (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFileSelect(e.target.files[0]);
      }
    },
    [handleFileSelect]
  );

  // 上传文件
  const handleUpload = useCallback(async () => {
    if (!selectedFile) {
      toast({
        variant: "destructive",
        title: "请选择文件",
        description: "请先选择要上传的PDF文件",
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("batchName", batchName);
      formData.append("description", description);
      formData.append("uploadedBy", "系统用户"); // 可以从用户上下文获取

      const response = await fetch("/api/batch-pdf", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "上传成功",
          description: `文件 "${selectedFile.name}" 上传成功`,
        });

        // 重置表单
        setSelectedFile(null);
        setDescription("");

        // 通知父组件上传成功
        if (onUploadSuccess) {
          onUploadSuccess(result.data);
        }

        // 关闭模态框
        if (onClose) {
          onClose();
        }
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error("PDF上传失败:", error);
      toast({
        variant: "destructive",
        title: "上传失败",
        description: `PDF上传失败: ${error.message}`,
      });
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile, batchName, description, onUploadSuccess, onClose, toast]);

  // 格式化文件大小
  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`上传PDF文件 - 批次: ${batchName}`}
      size="md"
    >
      <div className="space-y-4">
        {/* 文件拖放区域 */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragActive
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-gray-400"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {selectedFile ? (
            <div className="space-y-2">
              <div className="text-green-600 font-medium">
                ✓ 已选择文件: {selectedFile.name}
              </div>
              <div className="text-sm text-gray-500">
                文件大小: {formatFileSize(selectedFile.size)}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedFile(null)}
              >
                重新选择
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-gray-500">
                拖拽PDF文件到此处，或点击下方按钮选择文件
              </div>
              <div className="text-sm text-gray-400">
                仅支持PDF格式，文件大小不超过10MB
              </div>
            </div>
          )}
        </div>

        {/* 文件选择按钮 */}
        {!selectedFile && (
          <div className="flex justify-center">
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileInputChange}
                className="hidden"
              />
              <Button variant="outline" asChild>
                <span>选择PDF文件</span>
              </Button>
            </label>
          </div>
        )}

        {/* 文件描述 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            文件描述（可选）
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="请输入文件描述..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
          />
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="outline" onClick={onClose} disabled={isUploading}>
            取消
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
          >
            {isUploading ? "上传中..." : "上传"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
