"use client";

import React, { useState, useCallback } from "react";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";
import { PdfViewer } from "./PdfViewer";
import {
  uploadBatchPdf,
  getBatchPdfs,
  deleteBatchPdf,
  createPdfTable,
} from "@/lib/mysqlConnection";

export function BatchPdfUpload({ batchName, onPdfListUpdate }) {
  const [isUploading, setIsUploading] = useState(false);
  const [pdfList, setPdfList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPdfList, setShowPdfList] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const { toast } = useToast();

  // 加载批次PDF列表
  const loadPdfList = useCallback(async () => {
    if (!batchName) return;

    setIsLoading(true);
    try {
      const result = await getBatchPdfs(batchName);
      if (result.success) {
        setPdfList(result.data);
        if (onPdfListUpdate) {
          onPdfListUpdate(result.data);
        }
      } else {
        console.error("加载PDF列表失败:", result.message);
      }
    } catch (error) {
      console.error("加载PDF列表失败:", error);
    } finally {
      setIsLoading(false);
    }
  }, [batchName, onPdfListUpdate]);

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

          // 重新加载PDF列表
          await loadPdfList();
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
    [batchName, toast, loadPdfList, initializePdfTable]
  );

  // 处理PDF删除
  const handleDeletePdf = useCallback(
    async (pdfId, fileName) => {
      if (!window.confirm(`确定要删除PDF文件 "${fileName}" 吗？`)) {
        return;
      }

      try {
        const result = await deleteBatchPdf(pdfId);
        if (result.success) {
          toast({
            title: "删除成功",
            description: `PDF文件 "${fileName}" 已删除`,
          });

          // 重新加载PDF列表
          await loadPdfList();
        } else {
          throw new Error(result.message);
        }
      } catch (error) {
        console.error("删除PDF失败:", error);
        toast({
          variant: "destructive",
          title: "删除失败",
          description: `删除PDF文件失败: ${error.message}`,
        });
      }
    },
    [loadPdfList, toast]
  );

  // 处理下载PDF
  const handleDownloadPdf = useCallback((pdf) => {
    // 创建下载链接
    const link = document.createElement("a");
    link.href = pdf.downloadUrl;
    link.download = pdf.fileName;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  // 处理在线查看PDF
  const handleViewPdf = useCallback(
    (pdf) => {
      setSelectedPdf(pdf);
      setShowPdfViewer(true);

      toast({
        title: "正在查看",
        description: `正在打开PDF文件 "${pdf.fileName}"`,
      });
    },
    [toast]
  );

  // 关闭PDF查看器
  const handleClosePdfViewer = useCallback(() => {
    setShowPdfViewer(false);
    setSelectedPdf(null);
  }, []);

  // 格式化文件大小
  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // 格式化时间
  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString("zh-CN");
  };

  // 切换PDF列表显示
  const togglePdfList = useCallback(() => {
    if (!showPdfList) {
      loadPdfList();
    }
    setShowPdfList(!showPdfList);
  }, [showPdfList, loadPdfList]);

  return (
    <div className="space-y-4">
      {/* PDF上传区域 */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
        <div className="space-y-2">
          <div className="text-gray-600">
            <svg
              className="mx-auto h-8 w-8 text-gray-400"
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
            <p className="text-sm text-gray-500">
              点击或拖拽上传PDF文件（最大10MB）
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
              className="cursor-pointer"
              asChild
            >
              <span>{isUploading ? "上传中..." : "选择PDF文件"}</span>
            </Button>
          </label>
        </div>
      </div>

      {/* PDF列表管理 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-700">PDF文件管理</h4>
          <div className="flex gap-2">
            <Button
              onClick={togglePdfList}
              variant="outline"
              size="sm"
              disabled={!batchName}
            >
              {showPdfList ? "隐藏" : "查看"} PDF列表
            </Button>
            <Button
              onClick={loadPdfList}
              variant="outline"
              size="sm"
              disabled={!batchName || isLoading}
            >
              {isLoading ? "刷新中..." : "刷新"}
            </Button>
          </div>
        </div>

        {/* PDF列表 */}
        {showPdfList && (
          <div className="border rounded-lg">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">
                正在加载PDF列表...
              </div>
            ) : pdfList.length === 0 ? (
              <div className="p-4 text-center text-gray-500">暂无PDF文件</div>
            ) : (
              <div className="divide-y">
                {pdfList.map((pdf) => (
                  <div
                    key={pdf.id}
                    className="p-4 flex items-center justify-between hover:bg-gray-50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          <svg
                            className="h-8 w-8 text-red-500"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {pdf.fileName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(pdf.fileSize)} •{" "}
                            {formatDateTime(pdf.uploadTime)}
                          </p>
                          {pdf.description && (
                            <p className="text-xs text-gray-600 mt-1">
                              {pdf.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => handleViewPdf(pdf)}
                        variant="outline"
                        size="sm"
                        title="在线查看PDF"
                      >
                        👁️ 查看
                      </Button>
                      <Button
                        onClick={() => handleDownloadPdf(pdf)}
                        variant="outline"
                        size="sm"
                      >
                        ⬇️ 下载
                      </Button>
                      <Button
                        onClick={() => handleDeletePdf(pdf.id, pdf.fileName)}
                        variant="destructive"
                        size="sm"
                      >
                        🗑️ 删除
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* PDF查看器模态框 */}
      <PdfViewer
        pdf={selectedPdf}
        isOpen={showPdfViewer}
        onClose={handleClosePdfViewer}
      />
    </div>
  );
}
