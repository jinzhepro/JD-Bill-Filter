"use client";

import React from "react";
import { useApp } from "@/context/AppContext";
import { ProcessingStep } from "@/types";
import FileUpload from "./FileUpload";
import PriceInput from "./PriceInput";
import DataProcessor from "./DataProcessor";
import ResultDisplay from "./ResultDisplay";
import { ErrorModal } from "./ui/Modal";
import { StepProgressBar } from "./ui/ProgressBar";

export function AppContent() {
  const { currentStep, error, clearError, reset } = useApp();

  // 步骤配置 - 重新添加价格输入步骤
  const steps = [
    { label: "上传文件", value: ProcessingStep.UPLOAD },
    { label: "设置单价", value: ProcessingStep.PRICE_INPUT },
    { label: "处理数据", value: ProcessingStep.PROCESSING },
    { label: "查看结果", value: ProcessingStep.RESULT },
  ];

  // 获取当前步骤索引
  const currentStepIndex = steps.findIndex(
    (step) => step.value === currentStep
  );

  // 渲染当前步骤的组件
  const renderCurrentStep = () => {
    switch (currentStep) {
      case ProcessingStep.UPLOAD:
        return <FileUpload />;
      case ProcessingStep.PRICE_INPUT:
        return <PriceInput />;
      case ProcessingStep.PROCESSING:
        return <DataProcessor />;
      case ProcessingStep.RESULT:
        return <ResultDisplay />;
      default:
        return <FileUpload />;
    }
  };

  return (
    <div className="space-y-8">
      {/* 步骤进度条 */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <StepProgressBar steps={steps} currentStep={currentStepIndex} />
      </div>

      {/* 当前步骤内容 */}
      {renderCurrentStep()}

      {/* 错误模态框 */}
      <ErrorModal
        isOpen={!!error}
        onClose={() => {
          clearError();
          if (
            currentStep === ProcessingStep.UPLOAD &&
            error?.includes("文件")
          ) {
            reset();
          }
        }}
        message={error || ""}
      />
    </div>
  );
}
