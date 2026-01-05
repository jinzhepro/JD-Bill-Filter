"use client";

import React, { useState, useCallback } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";

export function PdfViewer({ pdf, isOpen, onClose }) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // 重置状态当PDF改变时
  React.useEffect(() => {
    if (pdf) {
      setIsLoading(true);
      setError(null);
    }
  }, [pdf]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!pdf) return null;

  const downloadUrl = pdf.downloadUrl + "?view=true";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] p-0">
        <DialogHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-medium truncate pr-4">
              📄 {pdf.fileName}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = pdf.downloadUrl;
                  link.download = pdf.fileName;
                  link.target = "_blank";
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                variant="outline"
                size="sm"
              >
                ⬇️ 下载
              </Button>
              <Button onClick={handleClose} variant="outline" size="sm">
                ✕ 关闭
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-gray-600">正在加载PDF...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="text-red-500 mb-2">
                  <svg
                    className="h-8 w-8 mx-auto"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <p className="text-red-600 mb-2">PDF加载失败</p>
                <p className="text-gray-600 text-sm mb-4">{error}</p>
                <Button
                  onClick={() => {
                    setError(null);
                    setIsLoading(true);
                    // 重新加载iframe
                    const iframe = document.getElementById("pdf-viewer-iframe");
                    if (iframe) {
                      iframe.src = iframe.src;
                    }
                  }}
                  variant="outline"
                  size="sm"
                >
                  🔄 重试
                </Button>
              </div>
            </div>
          )}

          <iframe
            id="pdf-viewer-iframe"
            src={downloadUrl}
            className="w-full h-full border-0"
            title={pdf.fileName}
            onLoad={() => {
              setIsLoading(false);
            }}
            onError={() => {
              setIsLoading(false);
              setError("无法加载PDF文件，请检查网络连接或稍后重试");
            }}
          />
        </div>

        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-4">
              <span>📁 文件大小: {(pdf.fileSize / 1024).toFixed(2)} KB</span>
              <span>
                📅 上传时间: {new Date(pdf.uploadTime).toLocaleString("zh-CN")}
              </span>
            </div>
            {pdf.description && (
              <div className="text-right">
                <span className="font-medium">📝 描述:</span> {pdf.description}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
