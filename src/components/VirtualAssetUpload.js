"use client";

import React, { useState, useCallback } from "react";
import { readFile } from "@/lib/excelHandler";
import { isValidFileSize } from "@/lib/fileValidation";
import {
  validateVirtualAssetStructure,
  processVirtualAssetData,
  calculateVirtualAssetTotals,
} from "@/lib/virtualAssetProcessor";
import FileUploader from "./FileUploader";
import VirtualAssetResultDisplay from "./VirtualAssetResultDisplay";
import { useToast } from "@/hooks/use-toast";

/**
 * 处理单个文件的读取和验证
 */
async function processSingleFile(fileWithPath) {
  const { file, path } = fileWithPath;

  try {
    isValidFileSize(file);
  } catch {
    return { error: `文件过大（超过50MB），已跳过: ${path}` };
  }

  try {
    const fileExtensionMatch = file.name.match(/\.(csv)$/i);
    if (!fileExtensionMatch) {
      return { error: `不支持的文件格式: ${file.name}（仅支持CSV）` };
    }

    const data = await readFile(file, "csv");
    if (!data || data.length === 0) {
      return { error: `文件数据为空，跳过: ${path}` };
    }

    return { data, path };
  } catch (error) {
    return { error: `${path}: ${error.message}` };
  }
}

/**
 * 处理所有文件的读取和验证
 */
async function processAllFiles(filesWithPath) {
  const allData = [];
  const errors = [];

  for (const fwp of filesWithPath) {
    const result = await processSingleFile(fwp);

    if (result.data) {
      allData.push(...result.data);
    } else if (result.error) {
      errors.push(result.error);
    }
  }

  return { allData, errors };
}

export default function VirtualAssetUpload() {
  const [processedData, setProcessedData] = useState(null);
  const [summary, setSummary] = useState(null);
  const { toast } = useToast();

  const handleFiles = useCallback(
    async (filesWithPath) => {
      if (!filesWithPath || filesWithPath.length === 0) {
        toast({
          variant: "destructive",
          title: "没有文件",
          description: "请选择需要处理的CSV文件",
        });
        return;
      }

      try {
        setProcessedData(null);
        setSummary(null);

        const { allData, errors } = await processAllFiles(filesWithPath);

        if (allData.length === 0) {
          toast({
            variant: "destructive",
            title: "文件处理失败",
            description:
              errors.length > 0
                ? errors[0]
                : "没有找到有效的CSV数据",
          });
          return;
        }

        // 验证数据结构
        try {
          validateVirtualAssetStructure(allData);
        } catch (error) {
          toast({
            variant: "destructive",
            title: "数据结构验证失败",
            description: error.message,
          });
          return;
        }

        // 处理数据：按SKU合并
        const mergedData = processVirtualAssetData(allData);
        const totals = calculateVirtualAssetTotals(mergedData);

        setProcessedData(mergedData);
        setSummary({
          总行数: allData.length,
          合并后SKU数: totals.SKU数,
          总金额: totals.实际金额,
          总文件数: filesWithPath.length,
          成功文件数: filesWithPath.length - errors.length,
          失败文件数: errors.length,
        });

        if (errors.length > 0) {
          toast({
            title: "部分文件处理完成",
            description: `成功处理 ${filesWithPath.length - errors.length}/${filesWithPath.length} 个文件`,
          });
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "处理失败",
          description: error.message,
        });
      }
    },
    [toast]
  );

  const handleReset = useCallback(() => {
    setProcessedData(null);
    setSummary(null);
  }, []);

  // 上传状态
  if (!processedData) {
    return (
      <div className="space-y-4">
        <FileUploader
          title="上传虚拟资产CSV"
          description="拖拽CSV文件到此处，或点击选择文件（支持多个CSV文件）"
          buttonText="选择CSV文件"
          onFilesSelected={handleFiles}
          supportFolder={false}
          multiple={true}
          accept=".csv"
          tips={[
            "CSV需包含列：商品skuId、实际金额、虚拟资产名称等",
            "自动按商品skuId合并，汇总实际金额",
            "支持同时上传多个CSV文件，数据会自动合并",
          ]}
        />
      </div>
    );
  }

  // 结果显示
  return (
    <VirtualAssetResultDisplay
      processedData={processedData}
      summary={summary}
      onReset={handleReset}
    />
  );
}
