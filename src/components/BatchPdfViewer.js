"use client";

import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import Modal from "./ui/modal";
import { useToast } from "@/hooks/use-toast";

export function BatchPdfViewer({ batchName, onClose }) {
  const { toast } = useToast();
  const [pdfFiles, setPdfFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPdf, setSelectedPdf] = useState(null);

  // 加载批次的PDF文件列表
  useEffect(() => {
    const loadPdfFiles = async () => {
      if (!batchName) return;

      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/batch-pdf?batchName=${encodeURIComponent(batchName)}`
        );
        const result = await response.json();

        if (result.success) {
          setPdfFiles(result.data || []);
        } else {
          throw new Error(result.message);
        }
      } catch (error) {
        console.error("加载PDF文件列表失败:", error);
        toast({
          variant: "destructive",
          title: "加载失败",
          description: `加载PDF文件列表失败: ${error.message}`,
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadPdfFiles();
  }, [batchName, toast]);

  // 删除PDF文件
  const handleDeletePdf = async (fileId, fileName) => {
    if (!confirm(`确定要删除文件 "${fileName}" 吗？此操作不可撤销。`)) {
      return;
    }

    try {
      const response = await fetch(
        `/api/batch-pdf?fileId=${encodeURIComponent(fileId)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (result.success) {
        toast({
          title: "删除成功",
          description: `文件 "${fileName}" 已删除`,
        });

        // 重新加载文件列表
        setPdfFiles(pdfFiles.filter((file) => file.id !== fileId));

        // 如果删除的是当前查看的文件，关闭查看器
        if (selectedPdf && selectedPdf.id === fileId) {
          setSelectedPdf(null);
        }
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error("删除PDF文件失败:", error);
      toast({
        variant: "destructive",
        title: "删除失败",
        description: `删除PDF文件失败: ${error.message}`,
      });
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // 格式化日期时间
  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`PDF文件管理 - 批次: ${batchName}`}
      size="xl"
    >
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-500"></div>
            <span className="ml-2 text-gray-600">正在加载PDF文件...</span>
          </div>
        ) : pdfFiles.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            该批次暂无PDF文件
          </div>
        ) : (
          <div className="space-y-4">
            {/* PDF文件列表 */}
            <div className="grid grid-cols-1 gap-4">
              {pdfFiles.map((file) => (
                <div
                  key={file.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center">
                          <svg
                            className="w-5 h-5 text-red-600"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {file.fileName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatFileSize(file.fileSize)} • 上传时间:{" "}
                            {formatDateTime(file.uploadTime)}
                          </div>
                          {file.uploadedBy && (
                            <div className="text-sm text-gray-500">
                              上传者: {file.uploadedBy}
                            </div>
                          )}
                          {file.description && (
                            <div className="text-sm text-gray-600 mt-1">
                              描述: {file.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedPdf(file)}
                      >
                        查看
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(file.filePath, "_blank")}
                      >
                        下载
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeletePdf(file.id, file.fileName)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        删除
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PDF查看器模态框 */}
        {selectedPdf && (
          <Modal
            isOpen={true}
            onClose={() => setSelectedPdf(null)}
            title={`查看PDF: ${selectedPdf.fileName}`}
            size="full"
          >
            <div className="flex flex-col" style={{ height: "75vh" }}>
              <div
                className="flex-1 bg-gray-100 rounded-lg overflow-hidden"
                style={{ minHeight: "500px" }}
              >
                <iframe
                  src={selectedPdf.filePath}
                  className="w-full h-full"
                  title={selectedPdf.fileName}
                  style={{ minHeight: "500px" }}
                />
              </div>
              <div className="flex justify-end space-x-3 mt-4">
                <Button
                  variant="outline"
                  onClick={() => window.open(selectedPdf.filePath, "_blank")}
                >
                  在新窗口打开
                </Button>
                <Button onClick={() => setSelectedPdf(null)}>关闭</Button>
              </div>
            </div>
          </Modal>
        )}

        {/* 底部操作按钮 */}
        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            关闭
          </Button>
        </div>
      </div>
    </Modal>
  );
}
