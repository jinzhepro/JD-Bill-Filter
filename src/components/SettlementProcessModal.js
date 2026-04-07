"use client";

import React, { useState } from "react";
import Decimal from "decimal.js";
import Modal from "./ui/modal";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { useSettlement } from "@/context/SettlementContext";
import { useToast } from "@/hooks/use-toast";
import { Check, RefreshCcw } from "lucide-react";
import {
  cleanDecimalValue,
  toNumber,
  parsePastedContent,
  mergeSameSkuRows,
} from "@/lib/settlementHelpers";
import { cleanAmount } from "@/lib/utils";

/**
 * 结算单处理Modal组件
 * 通过Modal方式提供粘贴解析功能，粘贴后直接处理
 * @param {Object} props - 组件属性
 * @param {boolean} props.isOpen - Modal是否打开
 * @param {Function} props.onClose - 关闭Modal的回调
 */
export default function SettlementProcessModal({ isOpen, onClose }) {
  const { processedData, setProcessedData, addProcessingHistory, addDataChange, pasteHistory, setPasteHistory, saveBeforeProcessing } = useSettlement();
  const { toast } = useToast();

  const [pasteContent, setPasteContent] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePasteContentChange = (e) => {
    setPasteContent(e.target.value);
  };

  const handleClearPaste = () => {
    setPasteContent("");
  };

  const handleLoadFromHistory = (historyItem) => {
    setPasteContent(historyItem.content);
    
    toast({
      title: "已加载历史记录",
      description: `已将 ${historyItem.rowCount} 行数据填充到输入框`,
    });
  };

  /**
   * 查找 SKU 对应的行索引
   */
  const findSkuIndex = (sku) => {
    if (!processedData || processedData.length === 0) return -1;
    return processedData.findIndex(
      (row) =>
        String(row["商品编号"] || row["SKU"] || "").trim() === sku.trim()
    );
  };

  /**
   * 验证单行数据
   */
  const validateRow = (row) => {
    if (!row.sku.trim()) {
      return { id: row.id, message: "请输入SKU" };
    }
    if (!row.amount.trim() || isNaN(parseFloat(row.amount))) {
      return { id: row.id, message: "请输入有效的货款" };
    }
    if (!row.quantity.trim() || isNaN(parseFloat(row.quantity))) {
      return { id: row.id, message: "请输入有效的数量" };
    }
    return null;
  };

  /**
   * 处理单行数据
   */
  const processRow = (row, updatedData) => {
    const skuIndex = findSkuIndex(row.sku);

    if (skuIndex === -1) {
      return {
        success: false,
        message: `未在结算单中找到商品编号: ${row.sku}，请检查输入是否正确`,
        data: updatedData,
        changes: null,
      };
    }

    const targetRow = updatedData[skuIndex];
    const currentQuantity = new Decimal(cleanAmount(targetRow["数量"]));
    const deductQuantity = cleanDecimalValue(row.quantity);

    if (currentQuantity.lt(deductQuantity)) {
      return {
        success: false,
        message: `商品编号 ${row.sku} 数量不足，当前数量：${currentQuantity.toNumber()}，需要扣减：${deductQuantity.toNumber()}`,
        data: updatedData,
        changes: null,
      };
    }

    const originalData = {
      数量: toNumber(currentQuantity),
      应结金额: toNumber(cleanDecimalValue(targetRow["应结金额"])),
      直营服务费: toNumber(cleanDecimalValue(targetRow["直营服务费"])),
    };

    const newQuantity = currentQuantity.minus(deductQuantity);

    updatedData[skuIndex] = {
      ...targetRow,
      数量: toNumber(newQuantity),
    };

    const deductedData = {
      数量: toNumber(deductQuantity),
      应结金额: toNumber(cleanDecimalValue(row.amount)),
      直营服务费: 0,
    };

    const rowAmount = cleanDecimalValue(row.amount);

    if (!rowAmount.eq(new Decimal(0))) {
      const currentAmount = cleanDecimalValue(targetRow["应结金额"]);
      const newAmount = currentAmount.minus(rowAmount);
      updatedData[skuIndex]["应结金额"] = toNumber(newAmount);
    }

    const currentData = {
      数量: toNumber(newQuantity),
      应结金额: toNumber(cleanDecimalValue(updatedData[skuIndex]["应结金额"])),
      直营服务费: toNumber(cleanDecimalValue(updatedData[skuIndex]["直营服务费"])),
    };

    const changes = {
      original: originalData,
      deducted: deductedData,
      current: currentData,
      timestamp: new Date().toISOString(),
    };

    return {
      success: true,
      message: `SKU ${row.sku} 处理成功`,
      data: updatedData,
      changes: changes,
    };
  };

  /**
   * 粘贴并直接处理
   */
  const handlePasteAndProcess = () => {
    if (!pasteContent.trim()) {
      toast({
        variant: "destructive",
        title: "请输入要粘贴的内容",
      });
      return;
    }

    const parsedRows = parsePastedContent(pasteContent);

    if (parsedRows.length === 0) {
      toast({
        variant: "destructive",
        title: "解析失败",
        description: "请检查粘贴内容格式是否正确",
      });
      return;
    }

    // 保存到历史记录
    const existingIndex = pasteHistory.findIndex(
      item => item.content === pasteContent
    );

    let newHistory = [...pasteHistory];
    if (existingIndex !== -1) {
      newHistory.splice(existingIndex, 1);
    }

    const historyItem = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      content: pasteContent,
      rowCount: parsedRows.length,
      preview: parsedRows.slice(0, 3).map(r => r.sku).join(", ") + (parsedRows.length > 3 ? "..." : ""),
    };

    newHistory.push(historyItem);
    setPasteHistory(newHistory);

    const validRows = parsedRows.filter((row) => row.sku.trim());

    if (validRows.length === 0) {
      toast({
        variant: "destructive",
        title: "没有有效的数据",
        description: "请确保粘贴内容包含SKU",
      });
      return;
    }

    const mergedRows = mergeSameSkuRows(validRows);

    // 预验证所有行
    for (const row of mergedRows) {
      const error = validateRow(row);
      if (error) {
        toast({
          variant: "destructive",
          title: error.message,
        });
        return;
      }
    }

    // 预检查所有SKU是否存在
    const notFoundSKUs = [];
    for (const row of mergedRows) {
      const skuIndex = findSkuIndex(row.sku);
      if (skuIndex === -1) {
        notFoundSKUs.push(row.sku);
      }
    }

    if (notFoundSKUs.length > 0) {
      toast({
        variant: "destructive",
        title: `以下商品编号未找到: ${notFoundSKUs.join(", ")}`,
        description: "请检查输入是否正确，或从结算单中查找正确的商品编号",
      });
      return;
    }

    // 预检查所有数量是否足够
    const insufficientSKUs = [];
    for (const row of mergedRows) {
      const skuIndex = findSkuIndex(row.sku);
      if (skuIndex !== -1) {
        const targetRow = processedData[skuIndex];
        // 使用 cleanAmount 处理，因为它会正确处理千位分隔符
        const currentQuantity = new Decimal(cleanAmount(targetRow["数量"]));
        const deductQuantity = cleanDecimalValue(row.quantity);

        if (currentQuantity.lt(deductQuantity)) {
          insufficientSKUs.push(`${row.sku} (当前：${currentQuantity.toNumber()}, 需要：${deductQuantity.toNumber()})`);
        }
      }
    }

    if (insufficientSKUs.length > 0) {
      toast({
        variant: "destructive",
        title: `以下商品编号数量不足:`,
        description: insufficientSKUs.join("; "),
      });
      return;
    }

    // 所有验证通过，开始处理
    // 先保存当前数据状态，用于撤回
    saveBeforeProcessing();
    
    setIsProcessing(true);

    let updatedData = [...processedData];
    const successResults = [];
    const dataChanges = {};

    for (const row of mergedRows) {
      const result = processRow(row, updatedData);
      if (result.success) {
        successResults.push(row.sku);
        updatedData = result.data;
        if (result.changes) {
          dataChanges[row.sku] = result.changes;
        }
      }
    }

    setProcessedData(updatedData);

    if (successResults.length > 0) {
      const historyRecord = {
        timestamp: new Date().toISOString(),
        skus: successResults,
        count: successResults.length,
      };
      addProcessingHistory(historyRecord);

      Object.entries(dataChanges).forEach(([sku, changes]) => {
        addDataChange(sku, changes);
      });

      toast({
        title: `成功处理 ${successResults.length} 条记录`,
        description: successResults.join(", "),
      });
    }

    setIsProcessing(false);
    setPasteContent("");
    onClose();
  };

  /**
   * 重置输入
   */
  const handleReset = () => {
    setPasteContent("");
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="开票处理"
      size="lg"
    >
      <div className="space-y-4">
        {/* 粘贴输入区域 */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-semibold text-foreground">
              粘贴文本
              <span className="ml-2 text-xs text-muted-foreground font-normal">
                格式：SKU 商品名称 数量 金额（商品名称列会被忽略）
              </span>
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearPaste}
              className="h-7 px-2 text-xs"
              disabled={!pasteContent}
            >
              清空
            </Button>
          </div>
          <Textarea
            placeholder="粘贴文本内容..."
            value={pasteContent}
            onChange={handlePasteContentChange}
            className="h-60 text-sm font-mono"
          />

          {/* 数据合计 */}
          {pasteContent.trim() && (
            <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-border">
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">行数:</span>
                  <span className="font-semibold">{pasteContent.trim().split('\n').filter(l => l.trim()).length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">货款合计:</span>
                  <span className="font-semibold text-green-600">
                    ¥{pasteContent.trim().split('\n').filter(l => l.trim()).reduce((sum, line) => {
                      const parts = line.split(/[\s\t,|]+/);
                      const amount = parseFloat(parts[3]) || 0;
                      return sum + amount;
                    }, 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">数量合计:</span>
                  <span className="font-semibold">
                    {pasteContent.trim().split('\n').filter(l => l.trim()).reduce((sum, line) => {
                      const parts = line.split(/[\s\t,|]+/);
                      const qty = parseFloat(parts[2]) || 0;
                      return sum + qty;
                    }, 0).toFixed(0)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 历史记录 */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-semibold text-foreground">
              历史记录 {pasteHistory.length > 0 && `(${pasteHistory.length}条)`}
            </h3>
            <span className="text-xs text-muted-foreground">
              历史记录自动保留，无法清空
            </span>
          </div>
          {pasteHistory.length > 0 ? (
            <div className="bg-muted/30 rounded-lg border border-border">
              {pasteHistory.slice().reverse().map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handleLoadFromHistory(item)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-foreground">
                        {item.rowCount} 行
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {item.preview}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-muted/30 rounded-lg border border-border p-4 text-center text-xs text-muted-foreground">
              暂无历史记录，使用开票处理功能后会自动保存
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3 pt-2">
          <Button
            onClick={handlePasteAndProcess}
            className="flex-1"
            disabled={isProcessing || !pasteContent.trim()}
          >
            <Check className="w-4 h-4 mr-2" />
            {isProcessing ? "处理中..." : "粘贴处理"}
          </Button>
          <Button variant="outline" onClick={handleReset}>
            <RefreshCcw className="w-4 h-4 mr-2" />
            重置
          </Button>
          <Button variant="ghost" onClick={handleClose}>
            取消
          </Button>
        </div>
      </div>
    </Modal>
  );
}
