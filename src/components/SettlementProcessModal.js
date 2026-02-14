"use client";

import React, { useState } from "react";
import Decimal from "decimal.js";
import Modal from "./ui/modal";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { useSettlement } from "@/context/SettlementContext";
import { useToast } from "@/hooks/use-toast";
import { Check, RefreshCcw, Info } from "lucide-react";

/**
 * 清理字符串中的金额值，返回 Decimal 对象
 * @param {string|number} value - 原始值
 * @returns {Decimal} 清理后的金额
 */
function cleanDecimalValue(value) {
  if (value instanceof Decimal) return value;
  if (typeof value === "number") return new Decimal(value);
  if (typeof value === "string") {
    const cleaned = parseFloat(value.replace(/[^0-9.-]/g, ""));
    return new Decimal(isNaN(cleaned) ? 0 : cleaned);
  }
  return new Decimal(0);
}

/**
 * 安全地将 Decimal 转换为数字
 * @param {Decimal} decimal - Decimal 对象
 * @returns {number} 数字值
 */
function toNumber(decimal) {
  return decimal instanceof Decimal ? decimal.toNumber() : decimal;
}

/**
 * 生成唯一ID
 */
const generateId = () => Date.now() + Math.random().toString(36).substr(2, 9);

/**
 * 解析粘贴的多行数据
 * 支持格式：
 * 1. 制表符分隔：SKU\t货款\t数量\t服务费
 * 2. 空格分隔：SKU 货款 数量 服务费
 * 3. 逗号分隔：SKU,货款,数量,服务费
 * 4. 竖线分隔：SKU|货款|数量|服务费
 * @param {string} content - 粘贴的内容
 * @returns {Array} - 解析后的行数据数组
 */
function parsePastedContent(content) {
  if (!content.trim()) {
    return [];
  }

  const lines = content.split(/\r?\n/).filter((line) => line.trim());
  const parsedRows = [];

  for (const line of lines) {
    let parts = line.split(/\t/);
    if (parts.length === 1) {
      parts = line.split(/[,|]/);
    }
    if (parts.length === 1) {
      parts = line.split(/\s+/);
    }

    parts = parts.map((part) => part.trim()).filter((part) => part !== "");

    if (parts.length >= 2) {
      let sku, amount, quantity, serviceFee;

      if (parts.length === 2) {
        sku = parts[0];
        quantity = parts[1];
        amount = "";
        serviceFee = "";
      } else if (parts.length === 3) {
        sku = parts[0];
        amount = parts[1];
        quantity = parts[2];
        serviceFee = "";
      } else {
        sku = parts[0];
        amount = parts[1];
        quantity = parts[2];
        serviceFee = parts[3];
      }

      const row = {
        id: generateId(),
        sku: sku || "",
        amount: amount || "",
        quantity: quantity || "",
        serviceFee: serviceFee || "",
      };
      parsedRows.push(row);
    }
  }

  return parsedRows;
}

/**
 * 合并相同SKU的行
 * @param {Array} rows - 行数据数组
 * @returns {Array} - 合并后的行数据数组
 */
function mergeSameSkuRows(rows) {
  const skuMap = new Map();

  rows.forEach((row) => {
    const sku = row.sku.trim();
    if (!sku) return;

    if (skuMap.has(sku)) {
      const existing = skuMap.get(sku);

      const existingQuantity = cleanDecimalValue(existing.quantity);
      const currentQuantity = cleanDecimalValue(row.quantity);
      existing.quantity = existingQuantity.plus(currentQuantity).toString();

      const existingAmount = cleanDecimalValue(existing.amount);
      const currentAmount = cleanDecimalValue(row.amount);
      existing.amount = existingAmount.plus(currentAmount).toString();

      const existingServiceFee = cleanDecimalValue(existing.serviceFee);
      const currentServiceFee = cleanDecimalValue(row.serviceFee);
      existing.serviceFee = existingServiceFee.plus(currentServiceFee).toString();
    } else {
      skuMap.set(sku, { ...row });
    }
  });

  return Array.from(skuMap.values());
}

/**
 * 结算单处理Modal组件
 * 通过Modal方式提供粘贴解析功能，粘贴后直接处理
 * @param {Object} props - 组件属性
 * @param {boolean} props.isOpen - Modal是否打开
 * @param {Function} props.onClose - 关闭Modal的回调
 */
export default function SettlementProcessModal({ isOpen, onClose }) {
  const { processedData, setProcessedData, addProcessingHistory, addDataChange, pasteHistory, setPasteHistory, clearPasteHistory } = useSettlement();
  const { toast } = useToast();

  const [pasteContent, setPasteContent] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * 处理粘贴输入框内容变化
   */
  const handlePasteContentChange = (e) => {
    setPasteContent(e.target.value);
  };

  /**
   * 清空粘贴输入框
   */
  const handleClearPaste = () => {
    setPasteContent("");
  };

  /**
   * 从历史记录加载数据
   */
  const handleLoadFromHistory = (historyItem) => {
    setPasteContent(historyItem.content);
    toast({
      title: "已加载历史记录",
      description: `已将 ${historyItem.rowCount} 行数据填充到输入框`,
    });
  };

  /**
   * 清空历史记录
   */
  const handleClearHistory = () => {
    clearPasteHistory();
    toast({
      title: "历史记录已清空",
    });
  };

  /**
   * 查找SKU对应的行索引
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
    if (!row.serviceFee.trim() || isNaN(parseFloat(row.serviceFee))) {
      return { id: row.id, message: "请输入有效的直营服务费" };
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
    const currentQuantity = cleanDecimalValue(targetRow["数量"]);
    const deductQuantity = cleanDecimalValue(row.quantity);

    if (currentQuantity < deductQuantity) {
      return {
        success: false,
        message: `商品编号 ${row.sku} 数量不足，当前数量: ${currentQuantity.toNumber()}，需要扣减: ${deductQuantity.toNumber()}`,
        data: updatedData,
        changes: null,
      };
    }

    const originalData = {
      数量: toNumber(currentQuantity),
      应结金额: toNumber(cleanDecimalValue(targetRow["应结金额"])),
      直营服务费: toNumber(cleanDecimalValue(targetRow["直营服务费"])),
      净结金额: toNumber(cleanDecimalValue(targetRow["净结金额"])),
    };

    const newQuantity = currentQuantity.minus(deductQuantity);

    updatedData[skuIndex] = {
      ...targetRow,
      数量: toNumber(newQuantity),
    };

    const deductedData = {
      数量: toNumber(deductQuantity),
      应结金额: toNumber(cleanDecimalValue(row.amount)),
      直营服务费: toNumber(cleanDecimalValue(row.serviceFee)),
    };

    const rowAmount = cleanDecimalValue(row.amount);
    const rowServiceFee = cleanDecimalValue(row.serviceFee);

    if (!rowAmount.eq(new Decimal(0))) {
      const currentAmount = cleanDecimalValue(targetRow["应结金额"]);
      const newAmount = currentAmount.minus(rowAmount);
      updatedData[skuIndex]["应结金额"] = toNumber(newAmount);
    }

    if (!rowServiceFee.eq(new Decimal(0))) {
      const currentServiceFee = cleanDecimalValue(targetRow["直营服务费"]);
      const newServiceFee = currentServiceFee.plus(rowServiceFee.abs());
      updatedData[skuIndex]["直营服务费"] = toNumber(newServiceFee);
    }

    const finalAmount = cleanDecimalValue(updatedData[skuIndex]["应结金额"])
      .plus(cleanDecimalValue(updatedData[skuIndex]["直营服务费"]));
    updatedData[skuIndex]["净结金额"] = toNumber(finalAmount);

    const currentData = {
      数量: toNumber(newQuantity),
      应结金额: toNumber(cleanDecimalValue(updatedData[skuIndex]["应结金额"])),
      直营服务费: toNumber(cleanDecimalValue(updatedData[skuIndex]["直营服务费"])),
      净结金额: toNumber(cleanDecimalValue(updatedData[skuIndex]["净结金额"])),
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
        const currentQuantity = cleanDecimalValue(targetRow["数量"]);
        const deductQuantity = cleanDecimalValue(row.quantity);

        if (currentQuantity < deductQuantity) {
          insufficientSKUs.push(`${row.sku} (当前: ${currentQuantity.toNumber()}, 需要: ${deductQuantity.toNumber()})`);
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

  /**
   * 关闭Modal时重置状态
   */
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
              粘贴数据
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
            placeholder="粘贴多行数据，支持格式：
• 制表符分隔：SKU* 货款* 数量* 服务费*
• 空格分隔：SKU* 货款* 数量* 服务费*
• 逗号分隔：SKU*,货款*,数量*,服务费*
• 竖线分隔：SKU*|货款*|数量*|服务费*

* 为必填项"
            value={pasteContent}
            onChange={handlePasteContentChange}
            className="h-40 text-sm font-mono"
          />
        </div>

        {/* 历史记录 */}
        {pasteHistory.length > 0 && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-semibold text-foreground">
                历史记录
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearHistory}
                className="h-7 px-2 text-xs text-destructive hover:text-destructive"
              >
                清空
              </Button>
            </div>
            <div className="bg-muted/30 rounded-lg border border-border overflow-hidden max-h-32 overflow-y-auto">
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
          </div>
        )}

        {/* 说明文字 */}
        <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
          <p className="flex items-start gap-2">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              直接粘贴多行数据（支持制表符、空格、逗号、竖线分隔），点击"粘贴处理"即可完成。
              <strong>相同商品编号会自动合并计算</strong>。直营服务费输入正数可减小服务费扣除金额（例如：-10 输入 5 变为 -5）。
            </span>
          </p>
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
