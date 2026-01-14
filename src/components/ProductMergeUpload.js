"use client";

import React, { useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { validateFileSize, readFile } from "@/lib/excelHandler";
import { processProductMergeData } from "@/lib/orderProcessor";
import FileUploader from "./FileUploader";
import { useErrorHandler } from "./ErrorBoundary";

export default function ProductMergeUpload() {
  const {
    addLog,
    setError,
    clearError,
    setProcessing,
    setOriginalData,
    setProcessedData,
  } = useApp();

  const { handleError } = useErrorHandler();

  // 处理文件
  const handleFiles = useCallback(
    async (filesWithPath) => {
      if (!filesWithPath || filesWithPath.length === 0) {
        handleError(new Error("没有文件需要处理"), "文件上传");
        return;
      }

      try {
        setProcessing(true);
        clearError();

        addLog(`开始处理 ${filesWithPath.length} 个文件...`, "info");

        const allData = [];
        const errors = [];

        for (let i = 0; i < filesWithPath.length; i++) {
          const { file, path } = filesWithPath[i];
          addLog(
            `处理第 ${i + 1}/${filesWithPath.length} 个文件: ${path}`,
            "info"
          );

          if (!validateFileSize(file)) {
            const errorMsg = `文件过大（超过50MB），已跳过: ${path}`;
            addLog(errorMsg, "warning");
            errors.push(errorMsg);
            continue;
          }

          try {
            const fileExtensionMatch = file.name.match(/\.(xlsx|xls|csv)$/i);
            if (!fileExtensionMatch) {
              throw new Error(`不支持的文件格式: ${file.name}`);
            }

            const fileType = fileExtensionMatch[1].toLowerCase();

            addLog(`正在读取文件: ${path}`, "info");
            const data = await readFile(file, fileType);
            addLog(
              `文件读取完成: ${path}，共 ${data?.length || 0} 行`,
              "info"
            );

            if (!data || data.length === 0) {
              addLog(`文件数据为空，跳过: ${path}`, "warning");
              continue;
            }

            // 验证必需的列
            const firstRow = data[0];
            const requiredColumns = ["商品名称", "商品编号", "单价", "商品数量", "总价"];
            const missingColumns = requiredColumns.filter(col => !(col in firstRow));
            
            if (missingColumns.length > 0) {
              throw new Error(`缺少必要的列: ${missingColumns.join(", ")}`);
            }

            addLog(`数据结构验证通过: ${path}`, "info");
            allData.push(data);
            addLog(`已添加 ${data.length} 行数据到处理队列`, "info");
          } catch (error) {
            const errorMsg = `${path}: ${error.message}`;
            errors.push(errorMsg);
            addLog(`文件处理失败: ${errorMsg}`, "error");
            // 继续处理其他文件
          }
        }

        addLog(
          `文件处理完成，共读取 ${allData.length} 个文件`,
          "info"
        );

        if (allData.length === 0) {
          const errorMsg =
            errors.length > 0
              ? `所有文件处理失败:\n${errors.join("\n")}`
              : "没有找到有效的文件数据";
          handleError(new Error(errorMsg), "文件处理");
          return;
        }

        // 如果有部分文件处理失败，给出警告
        if (errors.length > 0) {
          addLog(
            `警告: ${errors.length} 个文件处理失败，但继续处理剩余数据`,
            "warning"
          );
        }

        // 设置原始数据（二维数组，每个元素是一个文件的数据）
        setOriginalData(allData);

        try {
          addLog("开始合并商品数据...");
          const processedData = processProductMergeData(allData);
          addLog(
            `商品合并处理完成，合并为 ${processedData.length} 条记录`,
            "success"
          );

          setProcessedData(processedData);
          addLog("上传完成", "success");
        } catch (error) {
          handleError(error, "商品合并数据处理");
          throw error;
        }
      } catch (error) {
        handleError(error, "文件上传处理");
        throw error;
      } finally {
        setProcessing(false);
      }
    },
    [
      addLog,
      clearError,
      setProcessing,
      setOriginalData,
      setProcessedData,
      handleError,
    ]
  );

  return (
    <FileUploader
      title="上传商品数据文件"
      description="拖拽文件到此处，或点击选择文件（支持 .xlsx, .xls, .csv）"
      buttonText="选择文件"
      onFilesSelected={handleFiles}
      supportFolder={false}
      multiple={true}
      tips={[
        "自动合并相同商品编号的商品数量和总价",
        "自动计算合并后的单价",
        "支持批量上传多个文件",
        "合并后可直接导出结果",
      ]}
    />
  );
}