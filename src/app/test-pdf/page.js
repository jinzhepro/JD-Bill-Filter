"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { BatchPdfUpload } from "@/components/BatchPdfUpload";
import { BatchPdfViewer } from "@/components/BatchPdfViewer";

export default function TestPdfPage() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isViewerModalOpen, setIsViewerModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState("TEST-BATCH-001");

  const handleUploadSuccess = (uploadedFile) => {
    console.log("PDF上传成功:", uploadedFile);
    alert(`PDF文件 "${uploadedFile.fileName}" 上传成功！`);
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">PDF功能测试页面</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">
          测试批次: {selectedBatch}
        </h2>

        <div className="space-y-4">
          <div className="flex gap-4">
            <Button
              onClick={() => setIsUploadModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              测试PDF上传
            </Button>

            <Button
              onClick={() => setIsViewerModalOpen(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              测试PDF查看
            </Button>
          </div>

          <div className="text-sm text-gray-600">
            <p>• 点击"测试PDF上传"按钮测试PDF文件上传功能</p>
            <p>• 点击"测试PDF查看"按钮查看已上传的PDF文件</p>
            <p>• 支持的文件格式: PDF</p>
            <p>• 文件大小限制: 10MB</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">功能说明</h2>

        <div className="space-y-2 text-sm">
          <h3 className="font-medium">PDF上传功能:</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>支持拖拽上传和点击选择文件</li>
            <li>自动验证文件类型和大小</li>
            <li>支持添加文件描述</li>
            <li>上传成功后自动保存到数据库</li>
          </ul>

          <h3 className="font-medium mt-4">PDF查看功能:</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>显示批次下所有PDF文件列表</li>
            <li>支持在线预览PDF文件</li>
            <li>支持下载PDF文件</li>
            <li>支持删除PDF文件</li>
          </ul>
        </div>
      </div>

      {/* PDF上传模态框 */}
      {isUploadModalOpen && (
        <BatchPdfUpload
          batchName={selectedBatch}
          onUploadSuccess={handleUploadSuccess}
          onClose={() => setIsUploadModalOpen(false)}
        />
      )}

      {/* PDF查看模态框 */}
      {isViewerModalOpen && (
        <BatchPdfViewer
          batchName={selectedBatch}
          onClose={() => setIsViewerModalOpen(false)}
        />
      )}
    </div>
  );
}
