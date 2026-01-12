"use client";

import React from "react";
import { useApp } from "@/context/AppContext";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";

export default function ResultDisplay() {
  const {
    originalData,
    processedData,
    uploadedFiles,
    resetOrder,
    addLog,
  } = useApp();

  const { toast } = useToast();

  // 获取第一个上传的文件（兼容单文件模式）
  const uploadedFile = uploadedFiles.length > 0 ? uploadedFiles[0] : null;

  // 计算总价
  const calculateTotalAmount = (data) => {
    if (!data || data.length === 0) return 0;
    return data.reduce((total, row) => {
      const amount = parseFloat(row["金额"] || row["总价"] || 0);
      return total + amount;
    }, 0);
  };

  const totalAmount = calculateTotalAmount(processedData);

  // 复制列数据功能
  const handleCopyColumn = async (columnName) => {
    try {
      const dataToCopy = processedData
        .map((row) => row[columnName])
        .filter((value) => value !== null && value !== undefined);
      const textToCopy = dataToCopy.join("\n");

      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        // 降级方案：使用 textarea
        const textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }

      addLog(
        `已复制列 "${columnName}" 的 ${dataToCopy.length} 条数据到剪贴板`,
        "success"
      );
      toast({
        title: `已复制列 "${columnName}" 的 ${dataToCopy.length} 条数据到剪贴板`,
      });
    } catch (err) {
      console.error("复制失败:", err);
      addLog(`复制列 "${columnName}" 失败`, "error");
      toast({
        variant: "destructive",
        title: `复制列 "${columnName}" 失败`,
      });
    }
  };

  const handleReset = () => {
    resetOrder();
    addLog("已返回主界面", "info");
  };

  // 下载Excel文件
  const handleDownloadExcel = () => {
    if (!processedData || processedData.length === 0) return;

    try {
      const { downloadExcel } = require("@/lib/excelHandler");
      const dateStr = new Date().toISOString().split('T')[0];
      const fileName = `订单处理结果_${dateStr}.xlsx`;
      downloadExcel(processedData, fileName);
      toast({
        title: `Excel文件已保存: ${fileName}`,
      });
      addLog(`已导出 ${processedData.length} 条订单数据到Excel`, "success");
    } catch (error) {
      console.error("Excel下载失败:", error);
      addLog("Excel下载失败", "error");
      toast({
        variant: "destructive",
        title: "Excel下载失败",
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* 返回按钮和标题 */}
      <div className="flex justify-between items-center">
        <Button
          onClick={handleReset}
          className="bg-gray-200 text-gray-700 hover:bg-gray-300"
        >
          ← 返回主界面
        </Button>
        <h1 className="text-2xl font-bold text-white">订单处理结果</h1>
        <div></div>
      </div>

      {/* 处理后数据展示 */}
      {processedData && processedData.length > 0 && (
        <section className="bg-white rounded-xl shadow-lg p-8 animate-fade-in">
          {/* 统计信息 */}
          <div className="mb-6 p-4 bg-green-50 rounded-lg">
            <h3 className="text-sm font-medium text-green-900 mb-2">
              处理统计
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">原始记录数：</span>
                <span className="font-semibold text-gray-900 ml-2">
                  {originalData?.length || 0}
                </span>
              </div>
              <div>
                <span className="text-gray-600">处理后记录数：</span>
                <span className="font-semibold text-gray-900 ml-2">
                  {processedData.length}
                </span>
              </div>
              <div>
                <span className="text-gray-600">总价：</span>
                <span className="font-semibold text-green-700 ml-2">
                  ¥{totalAmount.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-gray-600">文件名：</span>
                <span className="font-semibold text-gray-900 ml-2">
                  {uploadedFile?.name || "-"}
                </span>
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="mb-6 flex gap-3 flex-wrap">
            <Button
              variant="success"
              onClick={handleDownloadExcel}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              下载Excel结果 📊
            </Button>
            <Button variant="destructive" onClick={handleReset}>
              重新上传
            </Button>
          </div>

          {/* 处理后数据表格 */}
          <div className="table-container custom-scrollbar">
            <table className="preview-table">
              <thead>
                <tr>
                  {processedData.length > 0 &&
                    Object.keys(processedData[0]).map((header, index) => (
                      <th
                        key={index}
                        onClick={() => handleCopyColumn(header)}
                        title={`点击复制 "${header}" 列数据`}
                        className="cursor-pointer hover:bg-blue-50 transition-colors"
                      >
                        {header} 📋
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {processedData.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {Object.entries(row).map(([key, value]) => (
                      <td key={key}>
                        {key === "单价" || key === "总价"
                          ? `¥${parseFloat(value).toFixed(2)}`
                          : value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-2 text-sm text-gray-500 text-center">
              💡 提示：点击表头可复制该列的所有数据
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
