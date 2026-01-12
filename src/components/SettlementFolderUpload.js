"use client";

import React, { useState, useRef, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { validateFileSize, readFile } from "@/lib/excelHandler";
import {
  validateSettlementDataStructure,
  processSettlementData,
} from "@/lib/settlementProcessor";
import { Button } from "./ui/button";

export default function SettlementFolderUpload() {
  const {
    addLog,
    setError,
    clearError,
    setProcessing,
    setOriginalData,
    setProcessedData,
  } = useApp();

  const [isDragOver, setIsDragOver] = useState(false);
  const folderInputRef = useRef(null);

  // 处理文件
  const handleFiles = useCallback(
    async (filesWithPath) => {
      if (!filesWithPath || filesWithPath.length === 0) {
        addLog("没有文件需要处理", "warning");
        return;
      }

      addLog(`开始处理 ${filesWithPath.length} 个文件...`, "info");

      const allData = [];
      const errors = [];

      // 逐个处理文件
      for (let i = 0; i < filesWithPath.length; i++) {
        const { file, path } = filesWithPath[i];
        addLog(
          `处理第 ${i + 1}/${filesWithPath.length} 个文件: ${path}`,
          "info"
        );

        // 验证文件大小
        if (!validateFileSize(file)) {
          addLog(`文件过大，已跳过: ${path}`, "warning");
          continue;
        }

        try {
          // 读取文件
          const fileType = file.name
            .match(/\.(xlsx|xls|csv)$/i)?.[1]
            ?.toLowerCase();
          if (!fileType) {
            throw new Error("不支持的文件格式");
          }

          addLog(`正在读取文件: ${path}`, "info");
          const data = await readFile(file, fileType);
          addLog(`文件读取完成: ${path}，共 ${data?.length || 0} 行`, "info");

          if (!data || data.length === 0) {
            addLog(`文件数据为空，跳过: ${path}`, "warning");
            continue;
          }

          // 验证数据结构
          addLog(`正在验证数据结构: ${path}`, "info");
          validateSettlementDataStructure(data);
          addLog(`数据结构验证通过: ${path}`, "info");

          // 添加到总数据
          allData.push(...data);
          addLog(`已添加 ${data.length} 行数据到处理队列`, "info");
        } catch (error) {
          const errorMsg = `${path}: ${error.message}`;
          errors.push(errorMsg);
          addLog(`文件处理失败: ${errorMsg}`, "error");
        }
      }

      addLog(`文件处理完成，共读取 ${allData.length} 行有效数据`, "info");

      // 检查是否有有效数据
      if (allData.length === 0) {
        const errorMsg =
          errors.length > 0
            ? `所有文件处理失败:\n${errors.join("\n")}`
            : "没有找到有效的文件数据";
        addLog(`错误: ${errorMsg}`, "error");
        setError(errorMsg);
        setProcessing(false);
        return;
      }

      // 设置原始数据
      addLog(`设置原始数据: ${allData.length} 行`, "info");
      setOriginalData(allData);

      // 处理结算单数据
      try {
        addLog("开始处理结算单数据...");
        const processedData = await processSettlementData(allData);
        addLog(`结算单处理完成，合并为 ${processedData.length} 条记录`);

        setProcessedData(processedData);
        addLog("上传完成", "success");
      } catch (error) {
        addLog(`结算单处理失败: ${error.message}`, "error");
        setError(error.message);
      } finally {
        setProcessing(false);
      }
    },
    [addLog, setError, setProcessing, setOriginalData, setProcessedData]
  );

  // 处理文件夹/文件选择
  const handleFileSelect = useCallback(
    async (event) => {
      const files = event.target.files;
      if (!files || files.length === 0) {
        addLog("没有选择文件", "warning");
        return;
      }

      try {
        setProcessing(true);
        clearError();

        const validFiles = Array.from(files).filter((file) => {
          const fileName = file.name.toLowerCase();
          return (
            fileName.endsWith(".xlsx") ||
            fileName.endsWith(".xls") ||
            fileName.endsWith(".csv")
          );
        });

        if (validFiles.length === 0) {
          setError("没有找到有效的文件格式（.xlsx, .xls, .csv）");
          setProcessing(false);
          return;
        }

        const filesWithPath = validFiles.map((file) => ({
          file,
          path: file.webkitRelativePath || file.name,
        }));

        addLog(`找到 ${validFiles.length} 个有效文件`, "info");
        await handleFiles(filesWithPath);
      } catch (error) {
        console.error("文件选择处理失败:", error);
        setError(error.message);
        addLog(`文件选择处理失败: ${error.message}`, "error");
        setProcessing(false);
      }
    },
    [handleFiles, setError, clearError, setProcessing, addLog]
  );

  // 处理拖拽
  const handleDrop = useCallback(
    async (event) => {
      event.preventDefault();
      setIsDragOver(false);

      const files = event.dataTransfer.files;
      if (!files || files.length === 0) {
        addLog("没有拖拽文件", "warning");
        return;
      }

      try {
        setProcessing(true);
        clearError();

        const validFiles = Array.from(files).filter((file) => {
          const fileName = file.name.toLowerCase();
          return (
            fileName.endsWith(".xlsx") ||
            fileName.endsWith(".xls") ||
            fileName.endsWith(".csv")
          );
        });

        if (validFiles.length === 0) {
          setError("没有找到有效的文件");
          setProcessing(false);
          return;
        }

        const filesWithPath = validFiles.map((file) => ({
          file,
          path: file.name,
        }));

        addLog(`拖拽了 ${validFiles.length} 个有效文件`, "info");
        await handleFiles(filesWithPath);
      } catch (error) {
        console.error("拖拽处理失败:", error);
        setError(error.message);
        addLog(`拖拽处理失败: ${error.message}`, "error");
        setProcessing(false);
      }
    },
    [handleFiles, setError, clearError, setProcessing, addLog]
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
    folderInputRef.current?.click();
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
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleButtonClick}
        >
          <div className="text-6xl mb-6">📂</div>
          <h3 className="text-2xl font-semibold text-foreground mb-4">
            上传结算单文件
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            拖拽文件到此处，或点击选择文件（支持 .xlsx, .xls, .csv）
          </p>
          <Button size="lg" className="px-8">
            选择文件
          </Button>
        </div>

        <input
          ref={folderInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="mt-6 text-sm text-muted-foreground">
          <p>支持的文件格式：.xlsx, .xls, .csv</p>
          <p>最大文件大小：50MB</p>
        </div>

        <div className="mt-8 p-4 bg-primary/10 rounded-lg text-left">
          <h4 className="text-sm font-medium text-foreground mb-2">处理说明</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• 自动合并相同商品编号的应结金额</li>
            <li>• 每次只能上传一个文件</li>
            <li>• 合并后可直接导出结果</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
