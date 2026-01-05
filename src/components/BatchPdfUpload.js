"use client";

import React, { useState, useCallback } from "react";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";
import { uploadBatchPdf, createPdfTable } from "@/lib/mysqlConnection";

export function BatchPdfUpload({ batchName, onPdfListUpdate }) {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  // 初始化PDF表
  const initializePdfTable = useCallback(async () => {
    try {
      const result = await createPdfTable();
      if (result.success) {
        console.log("PDF表初始化成功");
      } else {
        console.error("PDF表初始化失败:", result.message);
      }
    } catch (error) {
      console.error("PDF表初始化失败:", error);
    }
  }, []);

  // 处理文件上传
  const handleFileUpload = useCallback(
    async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      // 验证文件类型
      if (!file.type.includes("pdf")) {
        toast({
          variant: "destructive",
          title: "文件格式错误",
          description: "只支持PDF文件格式",
        });
        return;
      }

      // 验证文件大小 (10MB)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        toast({
          variant: "destructive",
          title: "文件过大",
          description: "文件大小不能超过10MB",
        });
        return;
      }

      setIsUploading(true);
      try {
        // 确保PDF表存在
        await initializePdfTable();

        const result = await uploadBatchPdf(file, batchName);
        if (result.success) {
          toast({
            title: "上传成功",
            description: `PDF文件 "${file.name}" 上传成功`,
          });

          // 清空文件输入
          event.target.value = "";

          // 通知父组件更新PDF列表
          if (onPdfListUpdate) {
            // 重新加载PDF列表
            try {
              const { getBatchPdfs } = await import("@/lib/mysqlConnection");
              const listResult = await getBatchPdfs(batchName);
              if (listResult.success) {
                onPdfListUpdate(listResult.data);
              }
            } catch (error) {
              console.error("更新PDF列表失败:", error);
            }
          }
        } else {
          throw new Error(result.message);
        }
      } catch (error) {
        console.error("上传PDF失败:", error);
        toast({
          variant: "destructive",
          title: "上传失败",
          description: `上传PDF文件失败: ${error.message}`,
        });
      } finally {
        setIsUploading(false);
      }
    },
    [batchName, toast, initializePdfTable, onPdfListUpdate]
  );

  return (
    <div className="space-y-4">
      {/* PDF上传区域 */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
        <div className="space-y-4">
          <div className="text-gray-600">
            <svg
              className="mx-auto h-12 w-12 text-gray-400 mb-4"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="text-lg font-medium text-gray-700 mb-2">
              上传PDF文件
            </p>
            <p className="text-sm text-gray-500">
              支持拖拽或点击选择文件，最大10MB
            </p>
          </div>

          <input
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            disabled={isUploading || !batchName}
            className="hidden"
            id="pdf-upload-input"
          />

          <label htmlFor="pdf-upload-input">
            <Button
              type="button"
              disabled={isUploading || !batchName}
              className="cursor-pointer px-6 py-3"
              asChild
            >
              <span className="flex items-center gap-2">
                {isUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    上传中...
                  </>
                ) : (
                  <>
                    <svg
                      className="h-4 w-4"
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
                    选择PDF文件
                  </>
                )}
              </span>
            </Button>
          </label>

          {!batchName && (
            <p className="text-xs text-red-500">请先选择采购批号</p>
          )}
        </div>
      </div>
    </div>
  );
}
