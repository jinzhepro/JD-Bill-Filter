"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Upload, Trash2, Search, Copy, FileText, Link2 } from "lucide-react";
import ExcelJS from "exceljs";
import * as XLSX from "xlsx";
import { reconcileOrderWithInvoice } from "@/lib/reconciliation";

export function CanteenPurchaseOrderManager() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileData, setFileData] = useState(null);
  const [previewItems, setPreviewItems] = useState([]);
  const [previewErrors, setPreviewErrors] = useState([]);
  const [linkOrderModalOpen, setLinkOrderModalOpen] = useState(false);
  const [linkingBatchNo, setLinkingBatchNo] = useState("");
  const [orderText, setOrderText] = useState("");
  const [linkingOrder, setLinkingOrder] = useState(false);
  const [reconciliationResults, setReconciliationResults] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState("");
  const { toast } = useToast();

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search });
      const res = await fetch(`/api/canteen-purchase-orders?${params}`);
      const data = await res.json();
      
      if (data.success) {
        setOrders(data.data);
      } else {
        toast({ title: data.error, variant: "destructive" });
      }
    } catch (error) {
      console.error('获取食堂采购单数据失败:', error);
      toast({ title: "获取数据失败", variant: "destructive" });
    }
    setLoading(false);
  }, [search, toast]);

  const handleSearch = () => {
    fetchOrders();
  };

const parseExcelData = useCallback((rows) => {
    const items = [];
    const errors = [];
    
    let invoiceNo = '';
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 4) continue;
      
      const dCol = String(row[3] || '').trim();
      if (dCol.includes('发票号码')) {
        const match = dCol.match(/发票号码[：:\s]+(\d+)/);
        if (match) {
          invoiceNo = match[1];
          console.log('提取到发票号码:', invoiceNo, '来自第', i + 1, '行');
          break;
        }
      }
    }
    
    if (!invoiceNo) {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const timeStr = String(now.getTime()).slice(-6);
      invoiceNo = `CP${dateStr}${timeStr}`;
      console.log('未找到发票号码，生成临时批次号:', invoiceNo);
    }
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) {
        continue;
      }
      
      const firstCol = String(row[0] || '').trim();
      
      if (!firstCol.startsWith('*')) {
        continue;
      }
      
      const compactRow = row.filter(cell => {
        const strCell = String(cell || '').trim();
        return strCell !== '';
      });
      
      if (compactRow.length === 0) {
        continue;
      }
      
      console.log(`第${i + 1}行[紧凑后]:`, compactRow.map((cell, idx) => `[${idx}]${cell}`).join(' | '));
      
      const productName = String(compactRow[0] || '').trim();
      
      let quantityIdx = -1;
      for (let j = 1; j < compactRow.length; j++) {
        const cell = compactRow[j];
        const num = parseFloat(cell);
        if (!isNaN(num) && num > 0) {
          const cellStr = String(cell || '').trim();
          if (/^\d+(\.\d+)?$/.test(cellStr)) {
            quantityIdx = j;
            break;
          }
        }
      }
      
      if (quantityIdx === -1) {
        errors.push(`第${i + 1}行：未找到有效的数量`);
        continue;
      }
      
      const quantity = parseFloat(compactRow[quantityIdx]) || 0;
      
      let unit = '';
      if (quantityIdx >= 2) {
        unit = String(compactRow[quantityIdx - 1] || '').trim();
        console.log(`第${i + 1}行取单位: quantityIdx=${quantityIdx}, 取索引${quantityIdx - 1}, 值="${unit}"`);
      } else {
        console.log(`第${i + 1}行取单位: quantityIdx=${quantityIdx}, 无单位`);
      }
      
      const unitPrice = parseFloat(compactRow[quantityIdx + 1]) || 0;
      const totalAmount = parseFloat(compactRow[quantityIdx + 2]) || 0;
      
      const taxRateStr = String(compactRow[quantityIdx + 3] || '').trim();
      let taxRateNum = 0;
      if (taxRateStr.includes('%')) {
        taxRateNum = parseFloat(taxRateStr.replace('%', '')) / 100;
      } else {
        taxRateNum = parseFloat(taxRateStr) || 0;
      }
      
      const taxAmount = parseFloat(compactRow[quantityIdx + 4]) || 0;
      const amountWithTax = totalAmount + taxAmount;
      
      console.log(`第${i + 1}行解析:`, { productName, unit, quantity, unitPrice, totalAmount, taxRate: taxRateNum, taxAmount, amountWithTax });
      
      if (!productName) {
        errors.push(`第${i + 1}行：项目名称为空`);
        continue;
      }
      
      if (quantity <= 0) {
        errors.push(`第${i + 1}行：数量无效`);
        continue;
      }
      
      if (unitPrice <= 0) {
        errors.push(`第${i + 1}行：单价无效`);
        continue;
      }
      
      if (totalAmount <= 0) {
        errors.push(`第${i + 1}行：金额无效`);
        continue;
      }
      
      items.push({
        product_name: productName,
        unit: unit,
        quantity: quantity,
        unit_price: unitPrice,
        total_amount: totalAmount,
        tax_rate: taxRateNum,
        tax_amount: taxAmount,
        amount_with_tax: amountWithTax,
        canteen_name: '',
        batch_no: invoiceNo
      });
    }
    
    console.log('解析结果:', { itemsCount: items.length, errorsCount: errors.length, invoiceNo });
    console.log('解析出的数据:', items);
    
    return { items, errors };
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (fileData) {
      const { items, errors } = parseExcelData(fileData);
      setPreviewItems(items);
      setPreviewErrors(errors);
    }
  }, [fileData, parseExcelData]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    console.log('上传文件:', file.name, '类型:', file.type, '大小:', file.size);

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls'].includes(ext)) {
      toast({ title: "请上传Excel文件(.xlsx或.xls)", variant: "destructive" });
      return;
    }

    setFileName(file.name);
    
    // Excel 文件使用 ExcelJS 或 XLSX 库读取
    if (ext === 'xlsx' || ext === 'xls') {
      let rows = null;
      
      // 尝试方法1: ExcelJS
      try {
        console.log('尝试使用 ExcelJS 读取...');
        const workbook = new ExcelJS.Workbook();
        const arrayBuffer = await file.arrayBuffer();
        
        await workbook.xlsx.load(arrayBuffer, {
          ignoreNodes: [
            'dataValidations', 'sheetProtection', 'autoFilter', 'mergedCells',
            'conditionalFormatting', 'hyperlinks', 'pageSetup', 'rowBreaks',
            'colBreaks', 'headerFooter', 'definedNames', 'tables', 'pivotTables'
          ]
        });
        
        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
          throw new Error('文件中没有工作表');
        }
        
        rows = [];
        worksheet.eachRow((row) => {
          const values = [];
          row.eachCell({ includeEmpty: true }, (cell) => {
            try {
              let value = cell.value;
              if (value && typeof value === 'object') {
                if (value.richText) {
                  value = value.richText.map(rt => rt.text).join('');
                } else if (value.text !== undefined) {
                  value = value.text;
                } else if (value.result !== undefined) {
                  value = value.result;
                } else if (value.value !== undefined) {
                  value = value.value;
                } else {
                  value = '';
                }
              }
              values.push(value);
            } catch (err) {
              console.error('单元格解析错误:', err);
              values.push('');
            }
          });
          rows.push(values);
        });
        
        console.log('ExcelJS 读取成功，行数:', rows.length);
      } catch (excelJSError) {
        console.error('ExcelJS 读取失败:', excelJSError.message);
        
        // 尝试方法2: XLSX 库
        try {
          console.log('尝试使用 XLSX 库读取...');
          const arrayBuffer = await file.arrayBuffer();
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // 转换为二维数组
          rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
          
          console.log('XLSX 读取成功，行数:', rows.length);
        } catch (xlsxError) {
          console.error('XLSX 库读取失败:', xlsxError.message);
          toast({ 
            title: 'Excel 文件读取失败，请尝试用 Excel 另存为新文件或导出为 CSV 格式', 
            variant: "destructive" 
          });
          return;
        }
      }
      
      if (!rows || rows.length === 0) {
        toast({ title: "文件中没有数据", variant: "destructive" });
        return;
      }
      
      // 打印所有数据到控制台
      console.log('========== Excel 所有数据 ==========');
      console.log('总行数:', rows.length);
      rows.forEach((row, idx) => {
        console.log(`第${idx + 1}行:`, row.map((cell, colIdx) => `[${colIdx}]${cell}`).join(' | '));
      });
      console.log('========== 数据结束 ==========');
      
      setFileData(rows);
      
      const { items, errors } = parseExcelData(rows);
      
      console.log('parseExcelData 返回结果:', { items, errors });
      
      setPreviewItems(items);
      setPreviewErrors(errors);
      
      if (items.length === 0) {
        if (errors.length > 0) {
          console.log('解析错误:', errors);
          toast({ title: `解析失败，共 ${errors.length} 个错误`, description: errors.slice(0, 3).join('; '), variant: "destructive" });
        } else {
          toast({ title: "未找到以*开头的数据行", variant: "destructive" });
        }
        return;
      }
      
      toast({ title: `成功解析 ${items.length} 条数据` });
      return;
    }
    
    try {
      const workbook = new ExcelJS.Workbook();
      const arrayBuffer = await file.arrayBuffer();
      
      console.log('文件大小:', arrayBuffer.byteLength, 'bytes');
      console.log('开始解析 Excel 文件...');
      
      let loadedSuccessfully = false;
      
      // 尝试使用不同的加载选项
      const loadOptions = [
        {
          // 选项1: 忽略所有可能的复杂节点
          ignoreNodes: [
            'dataValidations', 'sheetProtection', 'autoFilter', 'mergedCells',
            'conditionalFormatting', 'hyperlinks', 'pageSetup', 'rowBreaks',
            'colBreaks', 'headerFooter', 'definedNames', 'tables', 'pivotTables'
          ]
        },
        {
          // 选项2: 基础选项
          ignoreNodes: ['dataValidations', 'sheetProtection', 'autoFilter', 'mergedCells']
        },
        {} // 选项3: 无选项
      ];
      
      for (let i = 0; i < loadOptions.length; i++) {
        try {
          console.log(`尝试加载选项 ${i + 1}...`);
          await workbook.xlsx.load(arrayBuffer, loadOptions[i]);
          loadedSuccessfully = true;
          console.log(`加载成功，使用选项 ${i + 1}`);
          break;
        } catch (loadError) {
          console.error(`选项 ${i + 1} 失败:`, loadError.message);
          if (i === loadOptions.length - 1) {
            throw loadError;
          }
        }
      }
      
      if (!loadedSuccessfully) {
        throw new Error('所有加载选项均失败');
      }
      
      console.log('Excel 文件加载成功，工作表数量:', workbook.worksheets.length);
      
      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        toast({ title: "文件中没有工作表", variant: "destructive" });
        return;
      }
      
      console.log('使用工作表:', worksheet.name);
      
      const rows = [];
      
      worksheet.eachRow((row) => {
        const values = [];
        row.eachCell({ includeEmpty: true }, (cell) => {
          try {
            let value = cell.value;
            if (value && typeof value === 'object') {
              if (value.richText) {
                value = value.richText.map(rt => rt.text).join('');
              } else if (value.text !== undefined) {
                value = value.text;
              } else if (value.result !== undefined) {
                value = value.result;
              } else if (value.value !== undefined) {
                value = value.value;
              } else {
                value = '';
              }
            }
            values.push(value);
          } catch (err) {
            console.error('单元格解析错误:', err, 'Cell:', cell);
            values.push('');
          }
        });
        rows.push(values);
      });
      
      // 打印 CSV 格式到控制台
      console.log('========== Excel 转 CSV ==========');
      console.log('总行数:', rows.length);
      rows.forEach((row, idx) => {
        const csvLine = row.map(cell => {
          const cellStr = String(cell || '');
          // 如果包含逗号、引号或换行，需要用引号包裹
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        }).join(',');
        console.log(`第${idx + 1}行: ${csvLine}`);
      });
      console.log('========== CSV 结束 ==========');
      
      console.log('解析Excel行数:', rows.length);
      console.log('前10行第一列数据:', rows.slice(0, 10).map((row, i) => `第${i+1}行: "${row[0]}"`));
      console.log('前5行完整数据:', rows.slice(0, 5));
      
      setFileData(rows);
      
      const { items, errors } = parseExcelData(rows);
      
      console.log('解析结果:', { itemsCount: items.length, errorsCount: errors.length, items, errors });
      
      if (items.length === 0 && errors.length === 0) {
        toast({ title: "未找到以*开头的数据行，请检查文件格式", variant: "destructive" });
        return;
      }
      
      setPreviewItems(items);
      setPreviewErrors(errors);
    } catch (error) {
      console.error('解析文件失败:', error);
      console.error('错误详情:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      let errorMsg = `解析文件失败: ${error.message}`;
      if (error.message.includes('company') || error.message.includes('undefined')) {
        errorMsg = '文件格式可能不兼容。请尝试：\n1. 用 Excel 打开文件后"另存为"新的 .xlsx 文件\n2. 或导出为 CSV 格式后再导入';
      }
      
      toast({ title: errorMsg, variant: "destructive" });
    }
  };

  const handleConfirmImport = async () => {
    if (previewItems.length === 0) {
      toast({ title: "没有可导入的数据", variant: "destructive" });
      return;
    }

    setImporting(true);
    
    try {
      const res = await fetch("/api/canteen-purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: previewItems })  // previewItems 已经包含 batch_no
      });
      
      const data = await res.json();
      
      if (data.success) {
        const { results } = data;
        toast({ title: `导入完成：成功 ${results.success} 条` });
        handleCloseModal();
        fetchOrders();
      } else {
        toast({ title: data.error, variant: "destructive" });
      }
    } catch (error) {
      console.error('操作失败:', error);
      toast({ title: "导入失败", variant: "destructive" });
    }
    
    setImporting(false);
  };

  const handleCloseModal = () => {
    setImportModalOpen(false);
    setFileName("");
    setFileData(null);
    setPreviewItems([]);
    setPreviewErrors([]);
  };

  const parseOrderText = (text) => {
    const lines = text.trim().split("\n");
    const mergedItems = {};
    
    for (const line of lines) {
      const parts = line.split("\t");
      if (parts.length >= 5) {
        const productName = parts[0].trim();
        const unit = parts[1].trim();
        const quantity = parseFloat(parts[2]) || 0;
        const unitPrice = parseFloat(parts[3]) || 0;
        const amountWithTax = parseFloat(parts[4]) || 0;
        
        const key = `${productName}_${unit}_${unitPrice}`;
        
        if (mergedItems[key]) {
          mergedItems[key].quantity += quantity;
          mergedItems[key].amount_with_tax += amountWithTax;
        } else {
          mergedItems[key] = {
            product_name: productName,
            unit: unit,
            quantity: quantity,
            unit_price: unitPrice,
            amount_with_tax: amountWithTax
          };
        }
      }
    }
    
    return Object.values(mergedItems);
  };

  const handleOpenLinkOrderModal = (batchNo) => {
    setLinkingBatchNo(batchNo);
    setLinkOrderModalOpen(true);
    setOrderText("");
    setReconciliationResults([]);
  };

  const handleLinkOrder = async () => {
    if (!orderText.trim()) {
      toast({ title: "请粘贴订单数据", variant: "destructive" });
      return;
    }

    const orderItems = parseOrderText(orderText);
    
    if (orderItems.length === 0) {
      toast({ title: "无法解析订单数据，请检查格式", variant: "destructive" });
      return;
    }

    setLinkingOrder(true);

    try {
      const res = await fetch("/api/canteen-purchase-orders/link-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batch_no: linkingBatchNo, order_items: orderItems })
      });
      
      const data = await res.json();
      
      if (data.success) {
        const invoiceItems = batches[linkingBatchNo] || [];
        const results = reconcileOrderWithInvoice(orderItems, invoiceItems);
        setReconciliationResults(results);
        
        fetchOrders();
        
        toast({ title: `关联完成：匹配 ${data.results.matched} 条，未匹配 ${data.results.unmatched} 条` });
      } else {
        toast({ title: data.error, variant: "destructive" });
      }
    } catch (error) {
      console.error('关联订单失败:', error);
      toast({ title: "关联订单失败", variant: "destructive" });
    }

    setLinkingOrder(false);
  };

  const handleClearOrderData = async () => {
    if (!confirm(`确定清除发票 ${linkingBatchNo} 的订单数据？`)) return;

    try {
      const res = await fetch(`/api/canteen-purchase-orders/link-order?batch_no=${linkingBatchNo}`, { method: "DELETE" });
      const data = await res.json();
      
      if (data.success) {
        toast({ title: `清除成功，共 ${data.updated} 条` });
        setReconciliationResults([]);
        setOrderText("");
        fetchOrders();
      } else {
        toast({ title: data.error, variant: "destructive" });
      }
    } catch (error) {
      console.error('清除失败:', error);
      toast({ title: "清除失败", variant: "destructive" });
    }
  };

  const handleCloseLinkOrderModal = () => {
    setLinkOrderModalOpen(false);
    setLinkingBatchNo("");
    setOrderText("");
    setReconciliationResults([]);
  };

  const handleDeleteBatch = async (batchNo) => {
    if (!confirm(`确定删除发票号码 ${batchNo} 的所有数据？`)) return;
    
    try {
      const res = await fetch(`/api/canteen-purchase-orders?batch_no=${batchNo}`, { method: "DELETE" });
      const data = await res.json();
      
      if (data.success) {
        toast({ title: `删除成功，共 ${data.deleted} 条` });
        fetchOrders();
      } else {
        toast({ title: data.error, variant: "destructive" });
      }
    } catch (error) {
      console.error('操作失败:', error);
      toast({ title: "删除失败", variant: "destructive" });
    }
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(amount || 0);
  };

  const handleEditOrderName = (id, currentValue) => {
    setEditingId(id);
    setEditingValue(currentValue || "");
  };

  const handleSaveOrderName = async (id) => {
    try {
      const res = await fetch("/api/canteen-purchase-orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, order_name: editingValue })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setOrders(orders.map(order => 
          order.id === id ? { ...order, order_name: editingValue } : order
        ));
        setEditingId(null);
        setEditingValue("");
        toast({ title: "保存成功" });
      } else {
        toast({ title: data.error, variant: "destructive" });
      }
    } catch (error) {
      console.error('保存失败:', error);
      toast({ title: "保存失败", variant: "destructive" });
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingValue("");
  };

  const batches = orders.reduce((acc, order) => {
    if (!acc[order.batch_no]) {
      acc[order.batch_no] = [];
    }
    acc[order.batch_no].push(order);
    return acc;
  }, {});

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr.replace(" ", "T") + "Z");
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Shanghai"
    });
  };

  const copyColumn = async (items, columnKey, columnName) => {
    const values = items.map(item => {
      return item[columnKey] || "";
    }).join("\n");
    
    try {
      await navigator.clipboard.writeText(values);
      toast({ title: `${columnName} 已复制` });
    } catch (error) {
      console.error('操作失败:', error);
      toast({ title: "复制失败", variant: "destructive" });
    }
  };

  const ThWithCopy = ({ items, columnKey, columnName, className }) => (
    <th className={`border border-border px-3 py-2 ${className}`}>
      <div className="flex items-center gap-1">
        <span>{columnName}</span>
        <button
          onClick={() => copyColumn(items, columnKey, columnName)}
          className="cursor-pointer p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
          title={`复制${columnName}列`}
        >
          <Copy className="w-3 h-3" />
        </button>
      </div>
    </th>
  );

  const previewTotalAmount = previewItems.reduce((sum, item) => sum + (item.total_amount || 0), 0);
  const previewTotalTax = previewItems.reduce((sum, item) => sum + (item.tax_amount || 0), 0);
  const previewTotalWithTax = previewTotalAmount + previewTotalTax;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>食堂采购单列表</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="搜索发票号码、品名..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
            <Button variant="outline" onClick={handleSearch}>
              <Search className="w-4 h-4 mr-1" />
              搜索
            </Button>
            <Button variant="outline" onClick={() => setImportModalOpen(true)}>
              <Upload className="w-4 h-4 mr-1" />
              导入
            </Button>
          </div>

          {loading ? (
            <p className="text-muted-foreground text-center py-4">加载中...</p>
          ) : orders.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">暂无数据</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(batches).map(([batchNo, items]) => (
                <Card key={batchNo}>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="text-lg">发票号码: {batchNo}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          导入时间: {formatDateTime(items[0]?.created_at)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          数量: {items.reduce((sum, item) => sum + (item.quantity || 0), 0).toFixed(2)} | 
                          不含税金额: {formatAmount(items.reduce((sum, item) => sum + (item.total_amount || 0), 0))} | 
                          税额: {formatAmount(items.reduce((sum, item) => sum + (item.tax_amount || 0), 0))} | 
                          合计: {formatAmount(items.reduce((sum, item) => sum + (item.total_amount || 0) + (item.tax_amount || 0), 0))}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleOpenLinkOrderModal(batchNo)} title="关联订单">
                          <Link2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteBatch(batchNo)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
<thead>
<tr className="bg-muted">
                                <ThWithCopy items={items} columnKey="product_name" columnName="项目名称" className="text-left" />
                                <ThWithCopy items={items} columnKey="order_name" columnName="订单名称" className="text-left" />
                                <ThWithCopy items={items} columnKey="unit" columnName="单位" className="text-center" />
                                <ThWithCopy items={items} columnKey="quantity" columnName="数量" className="text-right" />
                                <ThWithCopy items={items} columnKey="unit_price" columnName="单价" className="text-right" />
                                <ThWithCopy items={items} columnKey="total_amount" columnName="金额" className="text-right" />
                                <ThWithCopy items={items} columnKey="tax_rate" columnName="税率" className="text-right" />
                                <ThWithCopy items={items} columnKey="tax_amount" columnName="税额" className="text-right" />
                                <ThWithCopy items={items} columnKey="amount_with_tax" columnName="含税金额" className="text-right" />
                              </tr>
                           </thead>
                           <tbody>
                             {items.map((item) => (
<tr key={item.id}>
                                  <td className="border border-border px-3 py-2">{item.product_name}</td>
                                  <td className="border border-border px-3 py-2">
                                    {editingId === item.id ? (
                                      <Input
                                        value={editingValue}
                                        onChange={(e) => setEditingValue(e.target.value)}
                                        onBlur={() => handleSaveOrderName(item.id)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') handleSaveOrderName(item.id);
                                          if (e.key === 'Escape') handleCancelEdit();
                                        }}
                                        className="h-8"
                                        autoFocus
                                      />
                                    ) : (
                                      <span 
                                        className="text-muted-foreground cursor-pointer hover:text-foreground"
                                        onClick={() => handleEditOrderName(item.id, item.order_name)}
                                      >
                                        {item.order_name || '-'}
                                      </span>
                                    )}
                                  </td>
                                  <td className="border border-border px-3 py-2 text-center">{item.unit}</td>
                                  <td className="border border-border px-3 py-2 text-right">{item.quantity}</td>
                                  <td className="border border-border px-3 py-2 text-right">{formatAmount(item.unit_price)}</td>
                                  <td className="border border-border px-3 py-2 text-right">{formatAmount(item.total_amount)}</td>
                                  <td className="border border-border px-3 py-2 text-right">{(item.tax_rate * 100).toFixed(0)}%</td>
                                  <td className="border border-border px-3 py-2 text-right">{formatAmount(item.tax_amount)}</td>
                                  <td className="border border-border px-3 py-2 text-right">{formatAmount(item.amount_with_tax || 0)}</td>
                                </tr>
                             ))}
                           </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={importModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>导入食堂采购单</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">上传Excel文件</label>
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
              />
              {fileName && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="w-4 h-4" />
                  <span>{fileName}</span>
                </div>
              )}
            </div>

            <p className="text-sm text-muted-foreground">
              读取所有以「*」开头的数据行。自动删除空列，第一个数据为名称，找到第一个数字作为数量，后面依次为单价、金额、税率、税额。
            </p>

            {previewErrors.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <p className="text-sm text-destructive">
                  解析问题：{previewErrors.slice(0, 5).join("；")}{previewErrors.length > 5 ? "..." : ""}
                </p>
              </div>
            )}

            {previewItems.length > 0 && (
              <div className="bg-muted rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium">解析结果</p>
                <div className="flex gap-6 text-sm">
                  <span>共 {previewItems.length} 条</span>
                  <span>不含税金额: {formatAmount(previewTotalAmount)}</span>
                  <span>税额: {formatAmount(previewTotalTax)}</span>
                  <span className="font-medium">合计: {formatAmount(previewTotalWithTax)}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              取消
            </Button>
            <Button onClick={handleConfirmImport} disabled={importing || previewItems.length === 0}>
              {importing ? "导入中..." : "确认导入"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={linkOrderModalOpen} onOpenChange={handleCloseLinkOrderModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>关联订单 - 发票号码: {linkingBatchNo}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">粘贴订单数据（制表符分隔）</label>
              <Textarea
                placeholder="格式：名称\t单位\t数量\t单价\t金额\t税率（每行一条）"
                value={orderText}
                onChange={(e) => setOrderText(e.target.value)}
                rows={10}
                className="font-mono"
              />
            </div>

            {reconciliationResults.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">核对结果</p>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-muted">
                        <th className="border border-border px-2 py-1 text-left">订单名称</th>
                        <th className="border border-border px-2 py-1 text-right">订单数量</th>
                        <th className="border border-border px-2 py-1 text-right">订单金额</th>
                        <th className="border border-border px-2 py-1 text-left">发票名称</th>
                        <th className="border border-border px-2 py-1 text-right">发票数量</th>
                        <th className="border border-border px-2 py-1 text-right">发票含税金额</th>
                        <th className="border border-border px-2 py-1 text-center">状态</th>
                        <th className="border border-border px-2 py-1 text-left">差异</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reconciliationResults.map((result, idx) => {
                        let bgColor = '';
                        if (result.status === 'matched') bgColor = 'bg-green-50';
                        else if (result.status === 'partial') bgColor = 'bg-yellow-50';
                        else if (result.status === 'unmatched') bgColor = 'bg-red-50';
                        else if (result.status === 'missing') bgColor = 'bg-orange-50';
                        
                        return (
                          <tr key={idx} className={bgColor}>
                            <td className="border border-border px-2 py-1">{result.order?.product_name || '-'}</td>
                            <td className="border border-border px-2 py-1 text-right">{result.order?.quantity || '-'}</td>
                            <td className="border border-border px-2 py-1 text-right">{result.order?.total_amount ? formatAmount(result.order.total_amount) : '-'}</td>
                            <td className="border border-border px-2 py-1">{result.invoice?.product_name || '-'}</td>
                            <td className="border border-border px-2 py-1 text-right">{result.invoice?.quantity || '-'}</td>
                            <td className="border border-border px-2 py-1 text-right">{result.invoice ? formatAmount((result.invoice.total_amount || 0) + (result.invoice.tax_amount || 0)) : '-'}</td>
                            <td className="border border-border px-2 py-1 text-center">
                              {result.status === 'matched' && <span className="text-green-600">✓ 匹配</span>}
                              {result.status === 'partial' && <span className="text-yellow-600">⚠ 部分匹配</span>}
                              {result.status === 'unmatched' && <span className="text-red-600">✗ 不匹配</span>}
                              {result.status === 'missing' && <span className="text-orange-600">⚡ 缺失</span>}
                            </td>
                            <td className="border border-border px-2 py-1 text-xs">
                              {result.differences.quantity && <span className="text-red-600">数量: {result.differences.quantity > 0 ? '+' : ''}{result.differences.quantity}</span>}
                              {result.differences.amount && <span className="text-red-600 ml-1">金额: {result.differences.amount > 0 ? '+' : ''}{formatAmount(result.differences.amount)}</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClearOrderData} disabled={reconciliationResults.length === 0}>
              清除订单数据
            </Button>
            <Button variant="outline" onClick={handleCloseLinkOrderModal}>
              关闭
            </Button>
            <Button onClick={handleLinkOrder} disabled={linkingOrder || !orderText.trim()}>
              {linkingOrder ? "导入中..." : "确认导入"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}