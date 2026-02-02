"use client";

import React, { useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { useSettlement } from "@/context/SettlementContext";
import { useToast } from "@/hooks/use-toast";

/**
 * 结算单处理结果添加表单组件
 * 支持多行输入和粘贴，用于批量处理SKU、货款、数量、直营服务费
 */
export default function SettlementProcessForm() {
  const { processedData, setProcessedData, addProcessingHistory, addDataChange, pasteHistory, setPasteHistory, clearPasteHistory } = useSettlement();
  const { toast } = useToast();

  // 多行表单状态，初始有一行空数据
  const [rows, setRows] = useState([
    { id: 1, sku: "", amount: "", quantity: "", serviceFee: "" },
  ]);

  // 粘贴输入框内容
  const [pasteContent, setPasteContent] = useState("");

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
  const parsePastedContent = (content) => {
    if (!content.trim()) {
      return [];
    }

    const lines = content.split(/\r?\n/).filter((line) => line.trim());
    const parsedRows = [];

    for (const line of lines) {
      // 尝试不同的分隔符
      let parts = line.split(/\t/); // 制表符优先
      if (parts.length === 1) {
        parts = line.split(/[,|]/); // 逗号或竖线
      }
      if (parts.length === 1) {
        parts = line.split(/\s+/); // 空格
      }

      // 清理每个部分，移除前后空格
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
  };

  /**
   * 处理解析并填充按钮点击
   */
  const handleParseAndFill = () => {
    if (!pasteContent.trim()) {
      toast({
        variant: "destructive",
        title: "请输入要粘贴的内容",
      });
      return;
    }

    const parsedRows = parsePastedContent(pasteContent);
    if (parsedRows.length > 0) {
      setRows(parsedRows);
      
      // 检查是否已存在相同内容的历史记录，如果存在则移除旧的
      const existingIndex = pasteHistory.findIndex(
        item => item.content === pasteContent
      );
      
      let newHistory = [...pasteHistory];
      if (existingIndex !== -1) {
        // 移除旧的相同记录
        newHistory.splice(existingIndex, 1);
      }
      
      const historyItem = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        content: pasteContent,
        rowCount: parsedRows.length,
        preview: parsedRows.slice(0, 3).map(r => r.sku).join(", ") + (parsedRows.length > 3 ? "..." : ""),
      };
      
      // 添加新记录
      newHistory.push(historyItem);
      
      // 更新历史记录（一次性更新，避免多次状态更新）
      setPasteHistory(newHistory);
      
      setPasteContent("");
      toast({
        title: `成功解析 ${parsedRows.length} 行数据`,
        description: "已自动填充到表格中",
      });
    } else {
      toast({
        variant: "destructive",
        title: "解析失败",
        description: "请检查粘贴内容格式是否正确",
      });
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
   * 合并相同SKU的行
   * @param {Array} rows - 行数据数组
   * @returns {Array} - 合并后的行数据数组
   */
  const mergeSameSkuRows = (rows) => {
    const skuMap = new Map();

    rows.forEach((row) => {
      const sku = row.sku.trim();
      if (!sku) return;

      if (skuMap.has(sku)) {
        // 合并相同SKU的行
        const existing = skuMap.get(sku);
        
        // 合并数量（累加）
        const existingQuantity = parseFloat(existing.quantity) || 0;
        const currentQuantity = parseFloat(row.quantity) || 0;
        existing.quantity = (existingQuantity + currentQuantity).toString();

        // 合并货款（累加）
        const existingAmount = parseFloat(existing.amount) || 0;
        const currentAmount = parseFloat(row.amount) || 0;
        existing.amount = (existingAmount + currentAmount).toString();

        // 合并直营服务费（累加）
        const existingServiceFee = parseFloat(existing.serviceFee) || 0;
        const currentServiceFee = parseFloat(row.serviceFee) || 0;
        existing.serviceFee = (existingServiceFee + currentServiceFee).toString();
      } else {
        // 第一次遇到这个SKU，复制一份
        skuMap.set(sku, { ...row });
      }
    });

    return Array.from(skuMap.values());
  };

  /**
   * 处理单行输入变化
   * @param {number} id - 行ID
   * @param {string} field - 字段名
   * @param {string} value - 输入值
   */
  const handleInputChange = (id, field, value) => {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  /**
   * 添加新行
   */
  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      { id: generateId(), sku: "", amount: "", quantity: "", serviceFee: "" },
    ]);
  };

  /**
   * 删除指定行
   * @param {number} id - 行ID
   */
  const handleRemoveRow = (id) => {
    if (rows.length <= 1) {
      toast({
        variant: "destructive",
        title: "至少保留一行",
      });
      return;
    }
    setRows((prev) => prev.filter((row) => row.id !== id));
  };

  /**
   * 查找SKU对应的行索引
   * @param {string} sku - SKU编号
   * @returns {number} - 行索引，未找到返回-1
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
   * @param {Object} row - 行数据
   * @returns {Object|null} - 错误信息或null
   */
  const validateRow = (row) => {
    if (!row.sku.trim()) {
      return { id: row.id, message: "请输入SKU" };
    }
    if (!row.quantity.trim() || isNaN(parseFloat(row.quantity))) {
      return { id: row.id, message: "请输入有效的数量" };
    }
    return null;
  };

  /**
   * 处理单行数据
   * @param {Object} row - 行数据
   * @param {Array} updatedData - 当前更新后的数据
   * @returns {Object} - 处理结果 { success: boolean, message: string, data: Array, changes: Object }
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
    const currentQuantity = parseFloat(targetRow["数量"] || 0);
    const deductQuantity = parseFloat(row.quantity);

    // 检查数量是否足够扣减
    if (currentQuantity < deductQuantity) {
      return {
        success: false,
        message: `商品编号 ${row.sku} 数量不足，当前数量: ${currentQuantity}，需要扣减: ${deductQuantity}`,
        data: updatedData,
        changes: null,
      };
    }

    const originalData = {
      数量: currentQuantity,
      应结金额: parseFloat(targetRow["应结金额"] || 0),
      直营服务费: parseFloat(targetRow["直营服务费"] || 0),
      净结金额: parseFloat(targetRow["净结金额"] || 0),
    };

    const newQuantity = currentQuantity - deductQuantity;

    updatedData[skuIndex] = {
      ...targetRow,
      数量: newQuantity,
    };

    const deductedData = {
      数量: deductQuantity,
      应结金额: row.amount.trim() && !isNaN(parseFloat(row.amount)) ? parseFloat(row.amount) : 0,
      直营服务费: row.serviceFee.trim() && !isNaN(parseFloat(row.serviceFee)) ? parseFloat(row.serviceFee) : 0,
    };

    if (row.amount.trim() && !isNaN(parseFloat(row.amount))) {
      const currentAmount = parseFloat(targetRow["应结金额"] || 0);
      const newAmount = currentAmount - parseFloat(row.amount);
      updatedData[skuIndex]["应结金额"] = newAmount;
    }

    if (row.serviceFee.trim() && !isNaN(parseFloat(row.serviceFee))) {
      const currentServiceFee = parseFloat(targetRow["直营服务费"] || 0);
      const inputServiceFee = parseFloat(row.serviceFee);
      const newServiceFee = currentServiceFee + Math.abs(inputServiceFee);
      updatedData[skuIndex]["直营服务费"] = newServiceFee;
    }

    const finalAmount =
      parseFloat(updatedData[skuIndex]["应结金额"] || 0) +
      parseFloat(updatedData[skuIndex]["直营服务费"] || 0);
    updatedData[skuIndex]["净结金额"] = finalAmount;

    const currentData = {
      数量: newQuantity,
      应结金额: parseFloat(updatedData[skuIndex]["应结金额"] || 0),
      直营服务费: parseFloat(updatedData[skuIndex]["直营服务费"] || 0),
      净结金额: parseFloat(updatedData[skuIndex]["净结金额"] || 0),
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
   * 处理所有行数据
   */
  const handleSubmit = () => {
    const validRows = rows.filter((row) => row.sku.trim());

    if (validRows.length === 0) {
      toast({
        variant: "destructive",
        title: "请至少输入一行数据",
      });
      return;
    }

    // 合并相同SKU的行
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
        const currentQuantity = parseFloat(targetRow["数量"] || 0);
        const deductQuantity = parseFloat(row.quantity);
        
        if (currentQuantity < deductQuantity) {
          insufficientSKUs.push(`${row.sku} (当前: ${currentQuantity}, 需要: ${deductQuantity})`);
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
      const historyItem = {
        timestamp: new Date().toISOString(),
        skus: successResults,
        count: successResults.length,
      };
      addProcessingHistory(historyItem);

      Object.entries(dataChanges).forEach(([sku, changes]) => {
        addDataChange(sku, changes);
      });

      toast({
        title: `成功处理 ${successResults.length} 条记录`,
        description: successResults.join(", "),
      });
    }

    setRows([{ id: generateId(), sku: "", amount: "", quantity: "", serviceFee: "" }]);
  };

  /**
   * 重置所有行
   */
  const handleReset = () => {
    setRows([{ id: generateId(), sku: "", amount: "", quantity: "", serviceFee: "" }]);
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-semibold text-foreground">
            快速粘贴（支持多行）
          </h3>
          <div className="flex gap-2">
            {pasteContent && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearPaste}
                className="h-7 px-2 text-xs"
              >
                清空
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleParseAndFill}
              disabled={!pasteContent.trim()}
              className="h-7 px-2 text-xs"
            >
              解析并填充
            </Button>
          </div>
        </div>
        <Textarea
          placeholder="粘贴多行数据，支持格式：
• 制表符分隔：SKU\t货款\t数量\t服务费
• 空格分隔：SKU 货款 数量 服务费
• 逗号分隔：SKU,货款,数量,服务费
• 竖线分隔：SKU|货款|数量|服务费

示例（空格分隔）：
A001 100.50 5 10.00
A002 200.00 3 15.00

示例（只有SKU和数量）：
A001 5
A002 3"
          value={pasteContent}
          onChange={handlePasteContentChange}
          className="h-32 text-sm font-mono"
        />
      </div>

      {pasteHistory.length > 0 && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-semibold text-foreground">
              粘贴历史记录
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearHistory}
              className="h-7 px-2 text-xs text-destructive hover:text-destructive"
            >
              清空历史
            </Button>
          </div>
          <div className="bg-muted/30 rounded-lg border border-border overflow-hidden">
            {pasteHistory.slice().reverse().map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleLoadFromHistory(item)}
                  className="h-7 px-2 text-xs ml-2"
                >
                  加载
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-border mb-6"></div>

      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          手动输入
        </h3>
        <Button variant="outline" size="sm" onClick={handleAddRow}>
          <svg
            className="w-4 h-4 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          添加行
        </Button>
      </div>

      {/* 表头 */}
      <div className="grid grid-cols-12 gap-2 mb-2 px-2">
        <div className="col-span-3">
          <label className="text-xs font-medium text-muted-foreground">
            SKU <span className="text-destructive">*</span>
          </label>
        </div>
        <div className="col-span-3">
          <label className="text-xs font-medium text-muted-foreground">
            货款
          </label>
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium text-muted-foreground">
            数量 <span className="text-destructive">*</span>
          </label>
        </div>
        <div className="col-span-3">
          <label className="text-xs font-medium text-muted-foreground">
            直营服务费 <span className="text-xs">(正数减小)</span>
          </label>
        </div>
        <div className="col-span-1">
          <label className="text-xs font-medium text-muted-foreground">
            操作
          </label>
        </div>
      </div>

      {/* 数据行 */}
      <div className="space-y-2">
        {rows.map((row, index) => (
          <div
            key={row.id}
            className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            {/* SKU输入 */}
            <div className="col-span-3">
              <Input
                type="text"
                placeholder="商品编号"
                value={row.sku}
                onChange={(e) => handleInputChange(row.id, "sku", e.target.value)}
                className="w-full h-8 text-sm"
              />
            </div>

            {/* 货款输入 */}
            <div className="col-span-3">
              <Input
                type="number"
                placeholder="货款"
                value={row.amount}
                onChange={(e) =>
                  handleInputChange(row.id, "amount", e.target.value)
                }
                className="w-full h-8 text-sm"
                step="0.01"
              />
            </div>

            {/* 数量输入 */}
            <div className="col-span-2">
              <Input
                type="number"
                placeholder="数量"
                value={row.quantity}
                onChange={(e) =>
                  handleInputChange(row.id, "quantity", e.target.value)
                }
                className="w-full h-8 text-sm"
                step="1"
                min="1"
              />
            </div>

            {/* 直营服务费输入 */}
            <div className="col-span-3">
              <Input
                type="number"
                placeholder="输入正数减小"
                value={row.serviceFee}
                onChange={(e) =>
                  handleInputChange(row.id, "serviceFee", e.target.value)
                }
                className="w-full h-8 text-sm"
                step="0.01"
                min="0"
              />
            </div>

            {/* 删除按钮 */}
            <div className="col-span-1 flex justify-center">
              <button
                onClick={() => handleRemoveRow(row.id)}
                className="p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-colors"
                title="删除此行"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-3 mt-4">
        <Button onClick={handleSubmit} className="flex-1 md:flex-none">
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
          处理 ({rows.filter((r) => r.sku.trim()).length} 行)
        </Button>
        <Button variant="outline" onClick={handleReset}>
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          重置
        </Button>
      </div>

      {/* 说明文字 */}
      <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
        <p className="flex items-start gap-2">
          <svg
            className="w-4 h-4 mt-0.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>
            支持多行批量处理。推荐使用上方的<strong>快速粘贴</strong>功能，直接粘贴多行数据（支持制表符、空格、逗号、竖线分隔），系统会自动识别每一行并填充到表格中。
            也可以点击&quot;添加行&quot;手动输入。直营服务费输入正数可减小服务费扣除金额（例如：-10 输入 5 变为 -5）。
            <strong>相同商品编号会自动合并计算</strong>，如果商品编号未找到或数量不足，系统会显示错误提示。
          </span>
        </p>
      </div>
    </div>
  );
}
