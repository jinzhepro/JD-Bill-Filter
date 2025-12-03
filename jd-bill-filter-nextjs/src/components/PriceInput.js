"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { ProcessingStep, ProductStatus } from "@/types";
import { validateUnitPrice } from "@/lib/dataProcessor";
import Button from "./ui/Button";
import { PriceInputTable } from "./ui/Table";
import Modal from "./ui/Modal";
import { ConfirmModal } from "./ui/Modal";
import ProgressBar from "./ui/ProgressBar";

export default function PriceInput() {
  const {
    uploadedFile,
    uniqueProducts,
    setProductPrices,
    setStep,
    addLog,
    setError,
    clearError,
  } = useApp();

  const [products, setProducts] = useState([]);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchPrice, setBatchPrice] = useState("");
  const [batchOverride, setBatchOverride] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // 初始化商品列表
  useEffect(() => {
    if (uniqueProducts.length > 0) {
      setProducts([...uniqueProducts]);
    }
  }, [uniqueProducts]);

  // 计算进度
  const totalProducts = products.length;
  const validProducts = products.filter(
    (p) => p.status === ProductStatus.VALID
  ).length;
  const progressPercent =
    totalProducts > 0 ? (validProducts / totalProducts) * 100 : 0;
  const allValid = validProducts === totalProducts && totalProducts > 0;

  // 处理单价输入
  const handlePriceChange = useCallback((productCode, value, isValid) => {
    setProducts((prevProducts) =>
      prevProducts.map((product) =>
        product.productCode === productCode
          ? {
              ...product,
              unitPrice: value,
              status: isValid ? ProductStatus.VALID : ProductStatus.INVALID,
            }
          : product
      )
    );
  }, []);

  // 处理状态变化
  const handleStatusChange = useCallback((productCode, status) => {
    setProducts((prevProducts) =>
      prevProducts.map((product) =>
        product.productCode === productCode ? { ...product, status } : product
      )
    );
  }, []);

  // 批量设置单价
  const handleBatchPrice = useCallback(() => {
    if (!batchPrice || !validateUnitPrice(batchPrice)) {
      setError("请输入有效的单价（0-999999.99）");
      return;
    }

    const numPrice = parseFloat(batchPrice);
    let updatedCount = 0;

    setProducts((prevProducts) =>
      prevProducts.map((product) => {
        const shouldUpdate =
          batchOverride || product.status !== ProductStatus.VALID;
        if (shouldUpdate) {
          updatedCount++;
          return {
            ...product,
            unitPrice: numPrice,
            status: ProductStatus.VALID,
          };
        }
        return product;
      })
    );

    setShowBatchModal(false);
    setBatchPrice("");
    setBatchOverride(false);
    addLog(`批量设置单价完成，更新了 ${updatedCount} 个商品`, "success");
  }, [batchPrice, batchOverride, setError, addLog]);

  // 重置所有单价
  const handleResetPrices = useCallback(() => {
    setProducts((prevProducts) =>
      prevProducts.map((product) => ({
        ...product,
        unitPrice: product.hasDefaultPrice ? product.unitPrice : "",
        status: product.hasDefaultPrice
          ? ProductStatus.VALID
          : ProductStatus.PENDING,
      }))
    );
    setShowResetModal(false);
    addLog("所有商品单价已重置", "info");
  }, [addLog]);

  // 收集单价数据并开始处理
  const handleStartProcessing = useCallback(async () => {
    if (!allValid) {
      setError("请为所有商品设置有效的单价");
      return;
    }

    try {
      setIsProcessing(true);
      clearError();

      // 收集单价数据
      const productPrices = {};
      products.forEach((product) => {
        if (product.unitPrice) {
          productPrices[product.productCode] = {
            productCode: product.productCode,
            productName: product.productName,
            unitPrice: parseFloat(product.unitPrice),
          };
        }
      });

      setProductPrices(productPrices);
      addLog(
        `单价设置完成，共为 ${
          Object.keys(productPrices).length
        } 个商品设置了单价`,
        "success"
      );

      // 切换到处理步骤
      setStep(ProcessingStep.PROCESSING);
      addLog("开始数据处理...", "info");
    } catch (error) {
      console.error("处理失败:", error);
      setError(`处理失败: ${error.message}`);
      addLog(`处理失败: ${error.message}`, "error");
    } finally {
      setIsProcessing(false);
    }
  }, [
    allValid,
    products,
    setProductPrices,
    setStep,
    addLog,
    setError,
    clearError,
  ]);

  // 取消操作
  const handleCancel = useCallback(() => {
    setStep(ProcessingStep.UPLOAD);
    addLog("已取消单价输入", "info");
  }, [setStep, addLog]);

  if (!uploadedFile || products.length === 0) {
    return null;
  }

  return (
    <section className="bg-white rounded-xl shadow-lg p-8 animate-fade-in">
      <h3 className="text-2xl font-semibold text-primary-600 mb-6 text-center">
        设置商品单价
      </h3>

      {/* 进度信息 */}
      <div className="bg-primary-50 rounded-lg p-6 mb-6">
        <p className="text-gray-700 mb-4 text-center">
          请为以下商品设置单价（所有相同商品编号将使用相同单价）
        </p>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-primary-700">
            {validProducts}/{totalProducts} 商品已设置单价
          </span>
          <span className="text-sm font-medium text-primary-700">
            {Math.round(progressPercent)}%
          </span>
        </div>
        <ProgressBar progress={progressPercent} color="primary" />
      </div>

      {/* 商品列表 */}
      <div className="mb-6">
        <div className="max-h-96 overflow-y-auto custom-scrollbar">
          <PriceInputTable
            products={products}
            onPriceChange={handlePriceChange}
            onStatusChange={handleStatusChange}
          />
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-4 justify-center mb-6">
        <Button variant="info" onClick={() => setShowBatchModal(true)}>
          批量设置单价
        </Button>
        <Button variant="secondary" onClick={() => setShowResetModal(true)}>
          重置所有单价
        </Button>
      </div>

      {/* 确认按钮 */}
      <div className="flex gap-4 justify-center pt-6 border-t border-gray-200">
        <Button variant="secondary" onClick={handleCancel}>
          取消
        </Button>
        <Button
          variant="success"
          onClick={handleStartProcessing}
          disabled={!allValid || isProcessing}
        >
          {isProcessing ? "处理中..." : "开始处理"}
        </Button>
      </div>

      {/* 批量设置单价模态框 */}
      <Modal
        isOpen={showBatchModal}
        onClose={() => setShowBatchModal(false)}
        title="批量设置单价"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              请输入统一单价：
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="999999.99"
              placeholder="0.00"
              value={batchPrice}
              onChange={(e) => setBatchPrice(e?.target?.value || "")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="batchOverride"
              checked={batchOverride}
              onChange={(e) => setBatchOverride(e?.target?.checked || false)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label
              htmlFor="batchOverride"
              className="ml-2 text-sm text-gray-700"
            >
              覆盖已设置的单价
            </label>
          </div>
          <div className="flex gap-3 justify-end pt-4">
            <Button
              variant="secondary"
              onClick={() => setShowBatchModal(false)}
            >
              取消
            </Button>
            <Button variant="primary" onClick={handleBatchPrice}>
              确认
            </Button>
          </div>
        </div>
      </Modal>

      {/* 重置确认模态框 */}
      <ConfirmModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={handleResetPrices}
        title="重置所有单价"
        message="确定要重置所有商品的单价吗？这将清除所有手动输入的单价。"
        confirmText="重置"
        cancelText="取消"
        confirmVariant="danger"
      />
    </section>
  );
}
