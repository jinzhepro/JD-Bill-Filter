"use client";

import React, { useState } from "react";
import Decimal from "decimal.js";
import Tesseract from 'tesseract.js';
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
  const { processedData, setProcessedData, addProcessingHistory, addDataChange, pasteHistory, setPasteHistory } = useSettlement();
  const { toast } = useToast();

  const [pasteContent, setPasteContent] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [recognitionProgress, setRecognitionProgress] = useState(0);
  const [tempData, setTempData] = useState({ skus: [], quantities: [], amounts: [], fees: [] });

  /**
   * 处理粘贴事件（支持文字和图片）
   * 智能判断：如果粘贴框是空的就是第一次上传（识别 SKU 和数量）
   *          如果有数据就是第二次上传（识别货款和自营服务费）
   */
  const handlePaste = async (event) => {
    // 检查剪贴板中是否有图片
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // 如果是图片类型
      if (item.type.startsWith('image/')) {
        event.preventDefault();

        const file = item.getAsFile();
        if (!file) continue;

        // 智能判断：根据 pasteContent 是否为空决定识别模式
        const isFirstUpload = !pasteContent || pasteContent.trim() === '';

        setIsRecognizing(true);
        setRecognitionProgress(0);

        try {
          // 使用 Tesseract 进行 OCR 识别
          const { data: { text } } = await Tesseract.recognize(
            file,
            'chi_sim+eng',
            {
              logger: m => {
                if (m.status === 'recognizing text') {
                  setRecognitionProgress(Math.round(m.progress * 100));
                }
              }
            }
          );

          // 提取所有数字行
          const lines = text.split('\n').filter(line => line.trim());
          const numbers = [];

          for (const line of lines) {
            // 提取数字（包括小数）
            const numberMatch = line.match(/\d+(\.\d+)?/g);
            if (numberMatch) {
              numbers.push(...numberMatch);
            }
          }

          // 检查是否包含 SKU 关键字
          const hasSkuKeyword = /SKU|商品编号 | 编号/.test(text);

          // 从当前输入框解析现有数据（保留用户编辑）
          const parsedRows = parsePastedContent(pasteContent);
          const prevSkus = parsedRows.map(r => r.sku);
          const prevQuantities = parsedRows.map(r => r.quantity);
          const prevAmounts = parsedRows.map(r => r.amount);
          const prevFees = parsedRows.map(r => r.serviceFee);

          // 计算总行数
          const rowCount = Math.max(prevSkus.length, prevQuantities.length, prevAmounts.length, prevFees.length);

          if (hasSkuKeyword) {
            // 情况 1：识别到 SKU 关键字 → 填充 SKU 和数量列
            const newSkus = [];
            const newQuantities = [];

            for (let i = 0; i < numbers.length; i++) {
              if (i % 2 === 0) {
                newSkus.push(numbers[i]);
              } else {
                newQuantities.push(numbers[i]);
              }
            }

            // 复制之前的数据
            const allSkus = [...prevSkus];
            const allQuantities = [...prevQuantities];

            // 优先填充缺失 SKU 的行
            let newIndex = 0;
            for (let i = 0; i < rowCount && newIndex < newSkus.length; i++) {
              if (!allSkus[i] || allSkus[i] === '') {
                allSkus[i] = newSkus[newIndex];
                if (newIndex < newQuantities.length) {
                  allQuantities[i] = newQuantities[newIndex];
                }
                newIndex++;
              }
            }

            // 剩余数据追加到新行
            while (newIndex < newSkus.length) {
              allSkus.push(newSkus[newIndex]);
              if (newIndex < newQuantities.length) {
                allQuantities.push(newQuantities[newIndex]);
              } else {
                allQuantities.push('');
              }
              newIndex++;
            }

            // 生成完整的结果行
            const maxCount = Math.max(allSkus.length, prevAmounts.length, prevFees.length);
            const resultLines = [];

            for (let i = 0; i < maxCount; i++) {
              const sku = i < allSkus.length ? allSkus[i] : '';
              const amount = i < prevAmounts.length ? prevAmounts[i] : '';
              const quantity = i < allQuantities.length ? allQuantities[i] : '';
              const fee = i < prevFees.length ? prevFees[i] : '';

              resultLines.push(`${sku}\t${amount}\t${quantity}\t${fee}`);
            }

            const resultText = resultLines.join('\n');
            setPasteContent(resultText);

            // 保存到临时数据
            setTempData({
              skus: allSkus,
              quantities: allQuantities,
              amounts: prevAmounts,
              fees: prevFees
            });

            toast({
              title: "识别成功（SKU + 数量）",
              description: `共 ${allSkus.length} 个 SKU 和 ${allQuantities.length} 个数量`,
            });
          } else {
            // 情况 2：只识别到纯数字 → 填充货款和服务费列
            const newAmounts = [];
            const newFees = [];

            for (let i = 0; i < numbers.length; i++) {
              if (i % 2 === 0) {
                newAmounts.push(numbers[i]);
              } else {
                newFees.push(numbers[i]);
              }
            }

            // 复制之前的数据
            const allAmounts = [...prevAmounts];
            const allFees = [...prevFees];

            // 优先填充缺失货款/服务费的行
            let newIndex = 0;
            for (let i = 0; i < rowCount && newIndex < newAmounts.length; i++) {
              if ((!allAmounts[i] || allAmounts[i] === '') && (!allFees[i] || allFees[i] === '')) {
                allAmounts[i] = newAmounts[newIndex];
                if (newIndex < newFees.length) {
                  allFees[i] = newFees[newIndex];
                }
                newIndex++;
              }
            }

            // 剩余数据追加到新行
            while (newIndex < newAmounts.length) {
              allAmounts.push(newAmounts[newIndex]);
              if (newIndex < newFees.length) {
                allFees.push(newFees[newIndex]);
              } else {
                allFees.push('');
              }
              newIndex++;
            }

            // 生成完整的结果行
            const maxCount = Math.max(prevSkus.length, allAmounts.length, prevQuantities.length, allFees.length);
            const resultLines = [];

            for (let i = 0; i < maxCount; i++) {
              const sku = i < prevSkus.length ? prevSkus[i] : '';
              const amount = i < allAmounts.length ? allAmounts[i] : '';
              const quantity = i < prevQuantities.length ? prevQuantities[i] : '';
              const fee = i < allFees.length ? allFees[i] : '';

              resultLines.push(`${sku}\t${amount}\t${quantity}\t${fee}`);
            }

            const resultText = resultLines.join('\n');
            setPasteContent(resultText);

            // 保存到临时数据
            setTempData({
              skus: prevSkus,
              quantities: prevQuantities,
              amounts: allAmounts,
              fees: allFees
            });

            toast({
              title: "识别成功（货款 + 自营服务费）",
              description: `共 ${allAmounts.length} 个货款和 ${allFees.length} 个服务费`,
            });
          }
        } catch (error) {
          toast({
            variant: "destructive",
            title: "识别失败",
            description: error.message || "图片识别过程中发生错误",
          });
        } finally {
          setIsRecognizing(false);
          setRecognitionProgress(0);
        }

        break; // 只处理第一个图片
      }
    }
  };

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
    setTempData({ skus: [], quantities: [], amounts: [], fees: [] });
  };

  /**
   * 从历史记录加载数据
   */
  const handleLoadFromHistory = (historyItem) => {
    setPasteContent(historyItem.content);
    
    // 解析历史记录内容，恢复 tempData
    const parsedRows = parsePastedContent(historyItem.content);
    const skus = parsedRows.map(r => r.sku);
    const quantities = parsedRows.map(r => r.quantity);
    const amounts = parsedRows.map(r => r.amount);
    const fees = parsedRows.map(r => r.serviceFee);
    
    setTempData({
      skus,
      quantities,
      amounts,
      fees
    });
    
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
    setTempData({ skus: [], quantities: [], amounts: [], fees: [] });
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
              粘贴图片
              <span className="ml-2 text-xs text-muted-foreground font-normal">
                含SKU图片填SKU列，纯数字图片填货款列
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
            placeholder="Ctrl+V 粘贴图片自动识别..."
            value={pasteContent}
            onChange={handlePasteContentChange}
            onPaste={handlePaste}
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
                      const amount = parseFloat(parts[1]) || 0;
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
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">服务费合计:</span>
                  <span className="font-semibold text-blue-600">
                    ¥{pasteContent.trim().split('\n').filter(l => l.trim()).reduce((sum, line) => {
                      const parts = line.split(/[\s\t,|]+/);
                      const fee = parseFloat(parts[3]) || 0;
                      return sum + fee;
                    }, 0).toFixed(2)}
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
