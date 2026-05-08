"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, Trash2, Search, Copy, FileText } from "lucide-react";
import ExcelJS from "exceljs";
import * as XLSX from "xlsx";

export function CanteenPurchaseOrderManager() {
  const [orders, setOrders] = useState([]);
  const [canteens, setCanteens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState("");
  const [selectedCanteen, setSelectedCanteen] = useState("");
  const [fileData, setFileData] = useState(null);
  const [previewItems, setPreviewItems] = useState([]);
  const [previewErrors, setPreviewErrors] = useState([]);
  const { toast } = useToast();

  const fetchCanteens = useCallback(async () => {
    try {
      const res = await fetch("/api/canteens?pageSize=100");
      const data = await res.json();
      if (data.success) {
        setCanteens(data.data);
      }
    } catch (error) {
      console.error('获取食堂列表失败:', error);
    }
  }, []);

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

const parseExcelData = useCallback((rows, canteenName) => {
    const items = [];
    const errors = [];
    
    // 先提取发票号码（从所有行中查找）
    let invoiceNo = '';
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 4) continue;
      
      const dCol = String(row[3] || '').trim();
      // 从文本中提取发票号码（格式：发票号码：   26922000000419467261）
      if (dCol.includes('发票号码')) {
        const match = dCol.match(/发票号码[：:\s]+(\d+)/);
        if (match) {
          invoiceNo = match[1];
          console.log('提取到发票号码:', invoiceNo, '来自第', i + 1, '行');
          break;
        }
      }
    }
    
    // 如果没有找到发票号码，生成临时批次号
    if (!invoiceNo) {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const timeStr = String(now.getTime()).slice(-6);
      invoiceNo = `CP${dateStr}${timeStr}`;
      console.log('未找到发票号码，生成临时批次号:', invoiceNo);
    }
    
    // 只解析以*开头的行
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) {
        continue;
      }
      
      const firstCol = String(row[0] || '').trim();
      
      // 只处理以*开头的行
      if (!firstCol.startsWith('*')) {
        continue;
      }
      
      console.log(`第${i + 1}行[已过滤]:`, row.slice(0, 12).map((cell, idx) => `[${idx}]${cell}`).join(' | '));
      
      const productName = firstCol;
      const spec = String(row[3] || '').trim();
      const unit = String(row[5] || '').trim();
      const quantity = parseFloat(row[6]) || 0;
      const unitPrice = parseFloat(row[7]) || 0;
      const totalAmount = parseFloat(row[9]) || 0;
      
      const taxRateStr = String(row[10] || '').trim();
      let taxRateNum = 0;
      if (taxRateStr.includes('%')) {
        taxRateNum = parseFloat(taxRateStr.replace('%', '')) / 100;
      } else {
        taxRateNum = parseFloat(taxRateStr) || 0;
      }
      
      const taxAmount = parseFloat(row[11]) || 0;
      
      console.log(`第${i + 1}行解析:`, { productName, spec, unit, quantity, unitPrice, totalAmount, taxRate: taxRateNum, taxAmount, rawRow: row.slice(0, 12) });
      
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
        spec: spec,
        unit: unit,
        quantity: quantity,
        unit_price: unitPrice,
        total_amount: totalAmount,
        tax_rate: taxRateNum,
        tax_amount: taxAmount,
        canteen_name: canteenName,
        batch_no: invoiceNo  // 使用发票号码作为批次号
      });
    }
    
    console.log('解析结果:', { itemsCount: items.length, errorsCount: errors.length, invoiceNo });
    console.log('解析出的数据:', items);
    
    return { items, errors };
  }, []);

  useEffect(() => {
    fetchCanteens();
  }, [fetchCanteens]);
  
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (fileData && selectedCanteen) {
      const { items, errors } = parseExcelData(fileData, selectedCanteen);
      setPreviewItems(items);
      setPreviewErrors(errors);
    }
  }, [selectedCanteen, fileData, parseExcelData]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    console.log('上传文件:', file.name, '类型:', file.type, '大小:', file.size);

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls'].includes(ext)) {
      toast({ title: "请上传Excel文件(.xlsx或.xls)", variant: "destructive" });
      return;
    }

    if (!selectedCanteen) {
      toast({ title: "请先选择食堂", variant: "destructive" });
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
      
      const { items, errors } = parseExcelData(rows, selectedCanteen);
      
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
      
      const { items, errors } = parseExcelData(rows, selectedCanteen);
      
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
    setSelectedCanteen("");
    setFileData(null);
    setPreviewItems([]);
    setPreviewErrors([]);
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
      if (columnKey === 'amount_with_tax') {
        // 含税金额是计算字段
        return ((item.total_amount || 0) + (item.tax_amount || 0)).toFixed(2);
      }
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
                          导入时间: {formatDateTime(items[0]?.created_at)} | 食堂: {items[0]?.canteen_name || '-'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          不含税金额: {formatAmount(items.reduce((sum, item) => sum + (item.total_amount || 0), 0))} | 
                          税额: {formatAmount(items.reduce((sum, item) => sum + (item.tax_amount || 0), 0))} | 
                          合计: {formatAmount(items.reduce((sum, item) => sum + (item.total_amount || 0) + (item.tax_amount || 0), 0))}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteBatch(batchNo)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
<thead>
                            <tr className="bg-muted">
                              <ThWithCopy items={items} columnKey="product_name" columnName="项目名称" className="text-left" />
                              <ThWithCopy items={items} columnKey="spec" columnName="规格型号" className="text-center" />
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
                                <td className="border border-border px-3 py-2 text-center">{item.spec}</td>
                                <td className="border border-border px-3 py-2 text-center">{item.unit}</td>
                                <td className="border border-border px-3 py-2 text-right">{item.quantity}</td>
                                <td className="border border-border px-3 py-2 text-right">{formatAmount(item.unit_price)}</td>
                                <td className="border border-border px-3 py-2 text-right">{formatAmount(item.total_amount)}</td>
                                <td className="border border-border px-3 py-2 text-right">{(item.tax_rate * 100).toFixed(0)}%</td>
                                <td className="border border-border px-3 py-2 text-right">{formatAmount(item.tax_amount)}</td>
                                <td className="border border-border px-3 py-2 text-right">{formatAmount((item.total_amount || 0) + (item.tax_amount || 0))}</td>
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
              <label className="text-sm font-medium">选择食堂 *</label>
              <Select value={selectedCanteen} onValueChange={setSelectedCanteen}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择食堂" />
                </SelectTrigger>
                <SelectContent>
                  {canteens.map((canteen) => (
                    <SelectItem key={canteen.id} value={canteen.name}>
                      {canteen.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
              读取所有以「*」开头的数据行。列映射：A列项目名称、D列规格型号、F列单位、G列数量、H列单价、J列金额、K列税率、L列税额。
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
            <Button onClick={handleConfirmImport} disabled={importing || previewItems.length === 0 || !selectedCanteen}>
              {importing ? "导入中..." : "确认导入"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}