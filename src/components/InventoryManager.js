"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useInventory } from "@/context/InventoryContext";
import { Button } from "./ui/button";
import Modal, { ConfirmModal } from "./ui/modal";
import { TableImport } from "./TableImport";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import {
  updateInventoryItem,
  searchInventoryItems,
  getInventoryStats,
  groupInventoryByBatch,
  createMultipleInventoryItems,
} from "@/lib/inventoryStorage";
import { PdfViewer } from "./PdfViewer";
import {
  testConnection,
  createInventoryTable,
  pushInventoryToMySQL,
  getInventoryFromMySQL,
  getInventoryBatches,
  deleteBatch,
  healthCheck,
  saveInboundRecords,
} from "@/lib/mysqlConnection";
import { BatchPdfUpload } from "./BatchPdfUpload";

export function InventoryManager() {
  const {
    inventoryItems,
    inventoryForm,
    editingInventoryId,
    isDbLoading,
    batchEntryStatus,
    setInventoryItems,
    setInventoryForm,
    resetInventoryForm,
    setEditingInventoryId,
    addMultipleInventoryItems,
    updateInventoryItem: updateItem,
    deleteInventoryItem,
    addLog,
    setError,
    loadInventoryFromDB,
    toggleBatchEntryStatus,
  } = useInventory();

  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all, entered, not-entered
  const [isTableImportModalOpen, setIsTableImportModalOpen] = useState(false);

  const [isMySqlProcessing, setIsMySqlProcessing] = useState(false);
  const [mySqlStatus, setMySqlStatus] = useState("");

  // 确认对话框状态
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] =
    useState(false);
  const [deletingItem, setDeletingItem] = useState(null);
  const [isDeleteBatchModalOpen, setIsDeleteBatchModalOpen] = useState(false);
  const [isConfirmDeleteBatchModalOpen, setIsConfirmDeleteBatchModalOpen] =
    useState(false);
  const [deletingBatch, setDeletingBatch] = useState(null);

  // PDF管理状态
  const [batchPdfCounts, setBatchPdfCounts] = useState({});
  const [isLoadingPdfCounts, setIsLoadingPdfCounts] = useState(true);

  // PDF Modal状态
  const [uploadPdfModalOpen, setUploadPdfModalOpen] = useState(false);
  const [viewPdfModalOpen, setViewPdfModalOpen] = useState(false);
  const [currentBatchName, setCurrentBatchName] = useState(null);
  const [currentPdfList, setCurrentPdfList] = useState([]);
  const [selectedPdf, setSelectedPdf] = useState(null);

  const hasLoadedPdfCounts = useRef(false);

  // 加载所有批次的PDF数量
  const loadAllBatchPdfCounts = useCallback(async () => {
    if (hasLoadedPdfCounts.current) return;
    hasLoadedPdfCounts.current = true;

    try {
      // 使用新的批量接口一次性获取所有批次的PDF数量
      const { getAllBatchesPdfCounts } = await import("@/lib/mysqlConnection");
      const result = await getAllBatchesPdfCounts();

      if (result.success) {
        setBatchPdfCounts(result.data);
        console.log("PDF数量统计加载完成:", result.data);
      } else {
        console.error("获取PDF数量统计失败:", result.message);
        // 如果失败，设置空对象
        setBatchPdfCounts({});
      }
    } catch (error) {
      console.error("加载PDF数量统计失败:", error);
      // 发生错误时，设置空对象
      setBatchPdfCounts({});
    }
  }, []);

  // 在组件挂载时从数据库加载库存数据
  useEffect(() => {
    // 数据已经在AppContext中加载，这里不需要重复加载
    // 加载所有批次的PDF数量
    loadAllBatchPdfCounts();
  }, []); // 空依赖数组，只在组件挂载时执行一次

  // 表格导入处理
  const handleTableImport = async (items) => {
    try {
      // 添加到库存
      addMultipleInventoryItems(items);
      addLog(`成功通过表格导入 ${items.length} 个库存项`, "success");

      // 保存入库记录
      const inboundRecords = items.map((item) => ({
        id: `inbound-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        sku: item.sku || "",
        materialName: item.materialName,
        purchaseBatch: item.purchaseBatch,
        quantity: item.quantity,
        unitPrice: item.unitPrice || 0,
        totalPrice: item.totalPrice || 0,
        warehouse: item.warehouse || "",
        timestamp: new Date()
          .toISOString()
          .replace("T", " ")
          .replace(/\.\d{3}Z$/, ""),
        operator: "系统导入",
      }));

      const inboundResult = await saveInboundRecords(inboundRecords);
      if (inboundResult.success) {
        addLog(`成功保存 ${inboundRecords.length} 条入库记录`, "success");
      } else {
        console.error("保存入库记录失败:", inboundResult.message);
      }

      toast({
        title: "表格导入成功",
        description: `成功导入 ${items.length} 个库存项`,
      });
      setIsTableImportModalOpen(false);
    } catch (error) {
      setError(`表格导入库存项失败: ${error.message}`);
      toast({
        variant: "destructive",
        title: "表格导入失败",
        description: `表格导入库存项失败: ${error.message}`,
      });
    }
  };

  // 表格导入取消处理
  const handleTableImportCancel = () => {
    setIsTableImportModalOpen(false);
  };

  // 处理编辑
  const handleEdit = (item) => {
    setInventoryForm({
      materialName: item.materialName,
      quantity: item.quantity.toString(),
      purchaseBatch: item.purchaseBatch,
      sku: item.sku || "",
      unitPrice: item.unitPrice ? item.unitPrice.toString() : "",
      totalPrice: item.totalPrice ? item.totalPrice.toString() : "",
      taxRate: item.taxRate ? item.taxRate.toString() : "13",
      taxAmount: item.taxAmount ? item.taxAmount.toString() : "",
      warehouse: item.warehouse || "",
    });
    setEditingInventoryId(item.id);
  };

  // 处理删除
  const handleDelete = async (id, event) => {
    // 阻止事件冒泡
    if (event) {
      event.stopPropagation();
    }

    console.log("handleDelete被调用，ID:", id);

    const item = inventoryItems.find((item) => item.id === id);
    if (item) {
      setDeletingItem(item);
      setIsDeleteModalOpen(true);
    }
  };

  // 第一次确认删除
  const handleConfirmDelete = useCallback(() => {
    if (deletingItem) {
      setIsDeleteModalOpen(false);
      setIsConfirmDeleteModalOpen(true);
    }
  }, [deletingItem]);

  // 第二次确认删除
  const handleFinalConfirmDelete = useCallback(async () => {
    if (deletingItem) {
      try {
        console.log("开始调用deleteInventoryItem，ID:", deletingItem.id);
        await deleteInventoryItem(deletingItem.id);
        console.log("deleteInventoryItem调用完成");
        addLog(`库存项 "${deletingItem.materialName}" 已删除`, "warning");
        toast({
          title: "删除成功",
          description: `库存项 "${deletingItem.materialName}" 已删除`,
        });
        setIsConfirmDeleteModalOpen(false);
        setDeletingItem(null);
      } catch (error) {
        console.error("删除库存项失败:", error);
        setError(`删除库存项失败: ${error.message}`);
        toast({
          variant: "destructive",
          title: "删除失败",
          description: `删除库存项失败: ${error.message}`,
        });
      }
    }
  }, [deletingItem, deleteInventoryItem, addLog, setError]);

  // 立即更新商品名称处理
  const handleUpdateProductNames = async () => {
    if (inventoryItems.length === 0) {
      toast({
        variant: "destructive",
        title: "无数据",
        description: "没有库存数据可以更新",
      });
      return;
    }

    try {
      // 从数据库获取商品数据
      const { getProductsFromMySQL } = await import("@/lib/mysqlConnection");
      const productsResult = await getProductsFromMySQL();

      if (!productsResult.success) {
        throw new Error(productsResult.message || "获取商品数据失败");
      }

      const products = productsResult.data;
      if (!products || products.length === 0) {
        toast({
          variant: "destructive",
          title: "无商品数据",
          description: "数据库中没有商品数据，请先添加商品",
        });
        return;
      }

      // 创建SKU到商品名称的映射
      const skuMap = {};
      products.forEach((product) => {
        if (product.sku && product.productName) {
          skuMap[product.sku.toString()] = product.productName;
        }
      });

      // 使用数据库中的商品数据更新库存项的商品名称
      const updatedItems = inventoryItems.map((item) => {
        if (item.sku && skuMap[item.sku.toString()]) {
          return {
            ...item,
            materialName: skuMap[item.sku.toString()],
          };
        }
        return item;
      });

      // 更新状态
      setInventoryItems(updatedItems);

      // 保存到MySQL数据库
      const { pushInventoryToMySQL } = await import("@/lib/mysqlConnection");
      await pushInventoryToMySQL(updatedItems);

      // 统计更新详情
      const updatedDetails = [];
      const updatedCount = updatedItems.filter((item, index) => {
        const isUpdated =
          item.materialName !== inventoryItems[index].materialName;
        if (isUpdated) {
          updatedDetails.push({
            sku: item.sku,
            oldName: inventoryItems[index].materialName,
            newName: item.materialName,
          });
        }
        return isUpdated;
      }).length;

      addLog(`成功从数据库更新 ${updatedCount} 个库存项的商品名称`, "success");

      // 显示详细的更新信息
      if (updatedCount > 0) {
        const detailsText = updatedDetails
          .slice(0, 3)
          .map(
            (detail) =>
              `SKU ${detail.sku}: "${detail.oldName}" → "${detail.newName}"`
          )
          .join("\n");

        const moreText =
          updatedDetails.length > 3
            ? `\n...还有 ${updatedDetails.length - 3} 项更新`
            : "";

        toast({
          title: "更新成功",
          description: `成功更新 ${updatedCount} 个库存项的商品名称`,
        });

        // 显示详细更新信息的toast
        setTimeout(() => {
          toast({
            title: "更新详情",
            description: detailsText + moreText,
          });
        }, 1000);
      } else {
        toast({
          title: "无需更新",
          description: "所有库存项的商品名称已是最新",
        });
      }
    } catch (error) {
      setError(`从数据库更新商品名称失败: ${error.message}`);
      toast({
        variant: "destructive",
        title: "更新失败",
        description: `从数据库更新商品名称失败: ${error.message}`,
      });
    }
  };

  // 处理取消
  const handleCancel = () => {
    resetInventoryForm();
    setEditingInventoryId(null);
  };

  // 处理保存编辑
  const handleSaveEdit = async () => {
    if (!editingInventoryId) {
      setError("没有正在编辑的库存项");
      return;
    }

    if (
      !inventoryForm.materialName ||
      !inventoryForm.quantity ||
      !inventoryForm.purchaseBatch
    ) {
      setError("请填写必要的字段：物料名称、数量、采购批号");
      return;
    }

    const quantity = parseInt(inventoryForm.quantity);
    if (isNaN(quantity) || quantity < 0) {
      setError("数量必须是大于等于0的整数");
      return;
    }

    const unitPrice = inventoryForm.unitPrice
      ? parseFloat(inventoryForm.unitPrice)
      : 0;
    const totalPrice = inventoryForm.totalPrice
      ? parseFloat(inventoryForm.totalPrice)
      : 0;
    const taxRate = inventoryForm.taxRate
      ? parseFloat(inventoryForm.taxRate)
      : 13;
    const taxAmount = inventoryForm.taxAmount
      ? parseFloat(inventoryForm.taxAmount)
      : 0;

    const updatedItem = {
      id: editingInventoryId,
      materialName: inventoryForm.materialName,
      quantity: quantity,
      purchaseBatch: inventoryForm.purchaseBatch,
      sku: inventoryForm.sku || "",
      unitPrice: unitPrice,
      totalPrice: totalPrice,
      taxRate: taxRate,
      taxAmount: taxAmount,
      warehouse: inventoryForm.warehouse || "",
    };

    try {
      await updateItem(updatedItem);
      addLog(`库存项 "${updatedItem.materialName}" 已更新`, "success");
      resetInventoryForm();
      setEditingInventoryId(null);
    } catch (error) {
      console.error("更新库存项失败:", error);
      setError(`更新库存项失败: ${error.message}`);
    }
  };

  // API健康检查
  const handleHealthCheck = async () => {
    setIsMySqlProcessing(true);
    setMySqlStatus("正在进行API健康检查...");

    try {
      const result = await healthCheck();
      if (result.success) {
        setMySqlStatus("API健康检查通过");
        addLog(`API健康检查通过: ${result.message}`, "success");
      } else {
        setMySqlStatus("API健康检查失败");
        addLog(`API健康检查失败: ${result.message}`, "error");
      }
    } catch (error) {
      setMySqlStatus("API健康检查出错");
      addLog(`API健康检查出错: ${error.message}`, "error");
    } finally {
      setIsMySqlProcessing(false);
    }
  };

  // 测试MySQL连接
  const handleTestMySqlConnection = async () => {
    setIsMySqlProcessing(true);
    setMySqlStatus("正在测试MySQL连接...");

    try {
      const result = await testConnection();
      if (result.success) {
        setMySqlStatus("MySQL连接测试成功");
        addLog(result.message, "success");
      } else {
        setMySqlStatus("MySQL连接测试失败");
        addLog(result.message, "error");
      }
    } catch (error) {
      setMySqlStatus("MySQL连接测试出错");
      addLog(`MySQL连接测试出错: ${error.message}`, "error");
    } finally {
      setIsMySqlProcessing(false);
    }
  };

  // 推送数据到MySQL
  const handlePushToMySQL = async () => {
    if (inventoryItems.length === 0) {
      toast({
        variant: "destructive",
        title: "无数据",
        description: "没有库存数据可以推送",
      });
      return;
    }

    setIsMySqlProcessing(true);
    setMySqlStatus("正在推送数据到MySQL...");

    try {
      // 推送数据
      const pushResult = await pushInventoryToMySQL(inventoryItems);
      if (pushResult.success) {
        setMySqlStatus("数据推送成功");
        addLog(pushResult.message, "success");
        toast({
          title: "推送成功",
          description: pushResult.message,
        });
      } else {
        throw new Error(pushResult.message);
      }
    } catch (error) {
      setMySqlStatus("数据推送失败");
      addLog(`数据推送失败: ${error.message}`, "error");
      toast({
        variant: "destructive",
        title: "推送失败",
        description: `数据推送失败: ${error.message}`,
      });
    } finally {
      setIsMySqlProcessing(false);
    }
  };

  // 从MySQL拉取数据
  const handlePullFromMySQL = async () => {
    setIsMySqlProcessing(true);
    setMySqlStatus("正在从MySQL拉取数据...");

    try {
      const items = await loadInventoryFromDB();
      setMySqlStatus("数据拉取成功");
      addLog(`成功从数据库拉取 ${items.length} 条库存数据`, "success");
      toast({
        title: "拉取成功",
        description: `成功从数据库拉取 ${items.length} 条库存数据`,
      });
    } catch (error) {
      setMySqlStatus("数据拉取失败");
      addLog(`数据拉取失败: ${error.message}`, "error");
      toast({
        variant: "destructive",
        title: "拉取失败",
        description: `数据拉取失败: ${error.message}`,
      });
    } finally {
      setIsMySqlProcessing(false);
    }
  };

  // 处理复制物料名称
  const handleCopyMaterialName = async (materialName, event) => {
    // 阻止事件冒泡
    if (event) {
      event.stopPropagation();
    }

    try {
      await navigator.clipboard.writeText(materialName);
      toast({
        title: "复制成功",
        description: `物料名称 "${materialName}" 已复制到剪贴板`,
      });
    } catch (error) {
      console.error("复制失败:", error);
      toast({
        variant: "destructive",
        title: "复制失败",
        description: `复制物料名称失败: ${error.message}`,
      });
    }
  };

  // 复制批次列数据
  const handleCopyBatchColumn = async (columnName, batchName, event) => {
    // 阻止事件冒泡
    if (event) {
      event.stopPropagation();
    }

    try {
      // 获取当前批次的数据
      const batchItems = groupedItems[batchName] || [];
      let columnData = [];

      // 根据列名提取数据
      switch (columnName) {
        case "materialName":
          columnData = batchItems.map((item) => item.materialName || "");
          break;
        case "quantity":
          columnData = batchItems.map((item) => item.quantity.toString());
          break;
        case "unitPrice":
          columnData = batchItems.map((item) =>
            item.unitPrice ? parseFloat(item.unitPrice).toFixed(2) : ""
          );
          break;
        case "totalPrice":
          columnData = batchItems.map((item) =>
            item.totalPrice ? parseFloat(item.totalPrice).toFixed(2) : ""
          );
          break;
        case "taxRate":
          columnData = batchItems.map((item) =>
            item.taxRate ? item.taxRate.toString() : ""
          );
          break;
        case "sku":
          columnData = batchItems.map((item) => item.sku || "");
          break;
        case "warehouse":
          columnData = batchItems.map((item) => item.warehouse || "");
          break;
        case "purchaseBatch":
          columnData = batchItems.map((item) => item.purchaseBatch || "");
          break;
        default:
          columnData = batchItems.map((item) => item[columnName] || "");
      }

      // 将数据格式化为列形式（每行一个值，使用换行符分隔）
      // 这种格式可以直接粘贴到 Excel/Google Sheets 等表格软件的一列中
      const columnText = columnData.join("\n");

      await navigator.clipboard.writeText(columnText);
      toast({
        title: "复制成功",
        description: `已复制批次 "${batchName}" 的 ${columnName} 列数据 (${columnData.length} 行)，可直接粘贴到表格中`,
      });
    } catch (error) {
      console.error("复制批次列数据失败:", error);
      toast({
        variant: "destructive",
        title: "复制失败",
        description: `复制批次列数据失败: ${error.message}`,
      });
    }
  };

  // 复制整个批次的所有列数据（多列一起复制）
  const handleCopyBatchAllColumns = async (batchName, event) => {
    // 阻止事件冒泡
    if (event) {
      event.stopPropagation();
    }

    try {
      // 获取当前批次的数据
      const batchItems = groupedItems[batchName] || [];
      if (batchItems.length === 0) {
        toast({
          variant: "destructive",
          title: "无数据",
          description: `批次 "${batchName}" 没有数据可以复制`,
        });
        return;
      }

      // 定义列的顺序和对应的字段名
      const columns = [
        { name: "物料名称", key: "materialName" },
        { name: "数量", key: "quantity" },
        { name: "单价", key: "unitPrice" },
        { name: "总价", key: "totalPrice" },
        { name: "税率", key: "taxRate" },
        { name: "SKU", key: "sku" },
        { name: "仓库", key: "warehouse" },
        { name: "采购批号", key: "purchaseBatch" },
      ];

      // 构建表头行
      const headerRow = columns.map((col) => col.name).join("\t");

      // 构建数据行
      const dataRows = batchItems.map((item) => {
        return columns
          .map((col) => {
            const value = item[col.key];
            if (value === undefined || value === null) return "";
            
            // 根据字段类型格式化值
            switch (col.key) {
              case "quantity":
                return value.toString();
              case "unitPrice":
              case "totalPrice":
                return parseFloat(value).toFixed(2);
              case "taxRate":
                return value.toString();
              default:
                return value.toString();
            }
          })
          .join("\t");
      });

      // 组合所有行（表头 + 数据行）
      const allText = [headerRow, ...dataRows].join("\n");

      await navigator.clipboard.writeText(allText);
      toast({
        title: "复制成功",
        description: `已复制批次 "${batchName}" 的所有数据 (${batchItems.length} 行)，可直接粘贴到表格中`,
      });
    } catch (error) {
      console.error("复制批次所有数据失败:", error);
      toast({
        variant: "destructive",
        title: "复制失败",
        description: `复制批次所有数据失败: ${error.message}`,
      });
    }
  };

  // 获取过滤后的库存项
  const filteredItems = searchInventoryItems(inventoryItems, searchTerm);

  // 按采购批号分组
  const groupedItems = groupInventoryByBatch(filteredItems);

  // 根据状态过滤器过滤批次
  const filteredGroupedItems = Object.keys(groupedItems).reduce(
    (acc, batchName) => {
      const batchStatus = batchEntryStatus[batchName] || false;
      const shouldInclude =
        statusFilter === "all" ||
        (statusFilter === "entered" && batchStatus) ||
        (statusFilter === "not-entered" && !batchStatus);

      if (shouldInclude) {
        acc[batchName] = groupedItems[batchName];
      }

      return acc;
    },
    {}
  );

  // 获取统计信息
  const stats = getInventoryStats(inventoryItems);

  // 计算总价
  const totalAmount = inventoryItems.reduce((sum, item) => {
    const price = parseFloat(item.totalPrice);
    return sum + (isNaN(price) ? 0 : price);
  }, 0);

  // 删除批次处理
  const handleDeleteBatch = async (batchName) => {
    if (!batchName) {
      setError("缺少批次名称");
      return;
    }

    setDeletingBatch(batchName);
    setIsDeleteBatchModalOpen(true);
  };

  // 第一次确认删除批次
  const handleConfirmDeleteBatch = useCallback(() => {
    if (deletingBatch) {
      setIsDeleteBatchModalOpen(false);
      setIsConfirmDeleteBatchModalOpen(true);
    }
  }, [deletingBatch]);

  // 第二次确认删除批次
  const handleFinalConfirmDeleteBatch = useCallback(async () => {
    if (deletingBatch) {
      try {
        const result = await deleteBatch(deletingBatch);
        if (result.success) {
          addLog(`批次 "${deletingBatch}" 已删除`, "warning");
          toast({
            title: "删除成功",
            description: `批次 "${deletingBatch}" 已删除`,
          });
          // 重新加载数据
          await loadInventoryFromDB();
          setIsConfirmDeleteBatchModalOpen(false);
          setDeletingBatch(null);
        } else {
          throw new Error(result.message);
        }
      } catch (error) {
        setError(`删除批次失败: ${error.message}`);
        toast({
          variant: "destructive",
          title: "删除失败",
          description: `删除批次失败: ${error.message}`,
        });
      }
    }
  }, [deletingBatch, deleteBatch, addLog, loadInventoryFromDB, setError]);

  // 关闭所有确认模态框
  const handleCloseAllModals = useCallback(() => {
    setIsDeleteModalOpen(false);
    setIsConfirmDeleteModalOpen(false);
    setIsDeleteBatchModalOpen(false);
    setIsConfirmDeleteBatchModalOpen(false);
    setDeletingItem(null);
    setDeletingBatch(null);
  }, []);

  // 处理PDF列表更新（保留以兼容现有代码）
  const handlePdfListUpdate = useCallback((pdfs) => {
    // 这个函数现在主要用于兼容性，不需要实际实现
    console.log("PDF列表更新:", pdfs.length);
  }, []);

  // 打开PDF上传Modal
  const handleOpenUploadPdf = useCallback((batchName) => {
    setCurrentBatchName(batchName);
    setUploadPdfModalOpen(true);
  }, []);

  // 关闭PDF上传Modal
  const handleCloseUploadPdf = useCallback(() => {
    setUploadPdfModalOpen(false);
    setCurrentBatchName(null);
  }, []);

  // 打开PDF查看Modal
  const handleOpenViewPdf = useCallback(
    async (batchName) => {
      try {
        // 先设置批次名称和显示模态框
        setCurrentBatchName(batchName);
        setCurrentPdfList([]);
        setViewPdfModalOpen(true);

        // 如果该批次有PDF文件，才去获取列表
        if (batchPdfCounts[batchName] > 0) {
          const { getBatchPdfs } = await import("@/lib/mysqlConnection");
          const result = await getBatchPdfs(batchName);

          if (result.success) {
            setCurrentPdfList(result.data);
          } else {
            toast({
              variant: "destructive",
              title: "获取PDF列表失败",
              description: result.message,
            });
          }
        }
        // 如果没有PDF文件，保持空列表即可
      } catch (error) {
        console.error("获取PDF列表失败:", error);
        toast({
          variant: "destructive",
          title: "获取PDF列表失败",
          description: error.message,
        });
      }
    },
    [toast, batchPdfCounts]
  );

  // 关闭PDF查看Modal
  const handleCloseViewPdf = useCallback(() => {
    setViewPdfModalOpen(false);
    setCurrentBatchName(null);
    setCurrentPdfList([]);
    setSelectedPdf(null);
  }, []);

  // 处理PDF查看
  const handleViewPdf = useCallback((pdf) => {
    setSelectedPdf(pdf);
  }, []);

  // 处理PDF列表更新
  const handlePdfUploadUpdate = useCallback(
    (pdfs) => {
      // 重新加载所有批次的PDF数量统计
      loadAllBatchPdfCounts();
      // 同时更新当前Modal中的列表
      setCurrentPdfList(pdfs);
    },
    [loadAllBatchPdfCounts]
  );

  // 重新加载PDF数量统计
  const refreshPdfCounts = useCallback(() => {
    loadAllBatchPdfCounts();
  }, [loadAllBatchPdfCounts]);

  return (
    <div className="space-y-6">
      {/* 统计信息 */}
      <section className="bg-white rounded-xl shadow-lg p-6 animate-fade-in">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">库存统计</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-800">
              {stats.totalItems}
            </div>
            <div className="text-sm text-gray-600">总品种</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-800">
              {stats.totalQuantity}
            </div>
            <div className="text-sm text-gray-600">总数量</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-800">
              {stats.totalBatches}
            </div>
            <div className="text-sm text-gray-600">采购批次数</div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mt-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-800">
              ¥{totalAmount.toFixed(2)}
            </div>
            <div className="text-sm text-gray-600">总金额</div>
          </div>
        </div>
      </section>

      {/* 搜索和添加按钮 */}
      <section className="bg-white rounded-xl shadow-lg p-6 animate-fade-in">
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="w-full md:w-1/2">
              <input
                type="text"
                placeholder="搜索物料名称、采购批号、仓库或SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
              />
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => setIsTableImportModalOpen(true)}
                className="w-full md:w-auto"
              >
                表格导入
              </Button>
              <Button
                onClick={handleUpdateProductNames}
                className="w-full md:w-auto"
                disabled={inventoryItems.length === 0}
                title="从数据库商品表拉取最新的商品名称并更新库存项"
              >
                立即更新商品名称
              </Button>
            </div>
          </div>

          {/* 状态过滤器 */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">
                按状态过滤：
              </span>
              <div className="flex gap-2">
                <Button
                  variant={statusFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("all")}
                  className={
                    statusFilter === "all"
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : ""
                  }
                >
                  全部 ({Object.keys(groupedItems).length})
                </Button>
                <Button
                  variant={statusFilter === "entered" ? "success" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("entered")}
                  className={
                    statusFilter === "entered"
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : ""
                  }
                >
                  已录入 (
                  {
                    Object.keys(groupedItems).filter(
                      (batchName) => batchEntryStatus[batchName] || false
                    ).length
                  }
                  )
                </Button>
                <Button
                  variant={
                    statusFilter === "not-entered" ? "warning" : "outline"
                  }
                  size="sm"
                  onClick={() => setStatusFilter("not-entered")}
                  className={
                    statusFilter === "not-entered"
                      ? "bg-orange-600 hover:bg-orange-700 text-white"
                      : ""
                  }
                >
                  未录入 (
                  {
                    Object.keys(groupedItems).filter(
                      (batchName) => !(batchEntryStatus[batchName] || false)
                    ).length
                  }
                  )
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 库存列表 - 按采购批号分组 */}
      <section className="bg-white rounded-xl shadow-lg p-6 animate-fade-in">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          库存列表 ({Object.keys(filteredGroupedItems).length} 批次) -
          按采购批号分组
          {statusFilter !== "all" && (
            <span className="ml-2 text-sm font-normal text-gray-600">
              （{statusFilter === "entered" ? "已录入" : "未录入"}）
            </span>
          )}
        </h2>

        {isDbLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex flex-col items-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-500"></div>
              <div className="text-lg text-gray-600">正在加载库存数据...</div>
            </div>
          </div>
        ) : Object.keys(filteredGroupedItems).length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchTerm || statusFilter !== "all"
              ? "没有找到匹配的库存项"
              : "暂无库存数据，请通过表格导入功能添加库存"}
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(filteredGroupedItems).map(([batch, items]) => (
              <div
                key={batch}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                {/* 批号标题 */}
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-800">
                        采购批号: {batch}
                      </h3>
                      <Button
                        onClick={() => handleDeleteBatch(batch)}
                        className="px-2 py-1 text-xs"
                        title="删除整个批次"
                      >
                        删除批次
                      </Button>
                      <Button
                        onClick={() => handleOpenUploadPdf(batch)}
                        variant="outline"
                        className="px-2 py-1 text-xs"
                        title="上传PDF文件"
                      >
                        ⬆️ 上传PDF
                      </Button>
                      <Button
                        onClick={() => handleOpenViewPdf(batch)}
                        variant="outline"
                        className="px-2 py-1 text-xs"
                        title="查看PDF文件"
                      >
                        👁️ 查看PDF ({batchPdfCounts[batch] || 0})
                      </Button>
                      <Button
                        onClick={(e) => handleCopyBatchAllColumns(batch, e)}
                        variant="outline"
                        className="px-2 py-1 text-xs"
                        title="复制批次所有数据到剪贴板"
                      >
                        📋 复制全部
                      </Button>
                      <Button
                        onClick={() => toggleBatchEntryStatus(batch)}
                        variant={
                          batchEntryStatus[batch] ? "success" : "secondary"
                        }
                        className={`px-2 py-1 text-xs ${
                          batchEntryStatus[batch]
                            ? "bg-green-600 hover:bg-green-700 text-white"
                            : "bg-gray-400 hover:bg-gray-500 text-white"
                        }`}
                        title={`点击切换为${
                          batchEntryStatus[batch] ? "未录入" : "已录入"
                        }`}
                      >
                        {batchEntryStatus[batch] ? "✅ 已录入" : "⚪ 未录入"}
                      </Button>
                    </div>
                    <div className="text-right text-sm text-gray-600">
                      <div>
                        共 {items.length} 种物品，总计{" "}
                        {items.reduce((sum, item) => sum + item.quantity, 0)} 件
                      </div>
                      <div className="mt-1">
                        总价: ¥
                        {items
                          .reduce(
                            (sum, item) =>
                              sum + (parseFloat(item.totalPrice) || 0),
                            0
                          )
                          .toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 批号下的物品列表 */}
                <div>
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th
                          className="px-3 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-50"
                          onClick={(e) =>
                            handleCopyBatchColumn("materialName", batch, e)
                          }
                          title={`点击复制批次 "${batch}" 的物料名称列数据`}
                        >
                          物料名称 📋
                        </th>
                        <th
                          className="px-3 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-50"
                          onClick={(e) =>
                            handleCopyBatchColumn("quantity", batch, e)
                          }
                          title={`点击复制批次 "${batch}" 的数量列数据`}
                        >
                          数量 📋
                        </th>
                        <th
                          className="px-3 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-50"
                          onClick={(e) =>
                            handleCopyBatchColumn("unitPrice", batch, e)
                          }
                          title={`点击复制批次 "${batch}" 的单价列数据`}
                        >
                          单价 📋
                        </th>
                        <th
                          className="px-3 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-50"
                          onClick={(e) =>
                            handleCopyBatchColumn("totalPrice", batch, e)
                          }
                          title={`点击复制批次 "${batch}" 的总价列数据`}
                        >
                          总价 📋
                        </th>
                        <th
                          className="px-3 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-50"
                          onClick={(e) =>
                            handleCopyBatchColumn("taxRate", batch, e)
                          }
                          title={`点击复制批次 "${batch}" 的税率列数据`}
                        >
                          税率 📋
                        </th>
                        <th
                          className="px-3 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-50"
                          onClick={(e) =>
                            handleCopyBatchColumn("sku", batch, e)
                          }
                          title={`点击复制批次 "${batch}" 的SKU列数据`}
                        >
                          商品SKU 📋
                        </th>
                        <th
                          className="px-3 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-50"
                          onClick={(e) =>
                            handleCopyBatchColumn("warehouse", batch, e)
                          }
                          title={`点击复制批次 "${batch}" 的仓库列数据`}
                        >
                          仓库 📋
                        </th>
                        <th
                          className="px-3 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-50"
                          onClick={(e) =>
                            handleCopyBatchColumn("purchaseBatch", batch, e)
                          }
                          title={`点击复制批次 "${batch}" 的采购批号列数据`}
                        >
                          采购批号 📋
                        </th>
                        <th className="px-3 py-3 text-left font-semibold text-gray-700">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-gray-200 hover:bg-gray-50"
                        >
                          <td
                            className="px-3 py-3 truncate"
                            title={item.materialName}
                          >
                            <span className="flex-1 truncate">
                              {item.materialName}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            {item.quantity}
                          </td>
                          <td className="px-3 py-3 text-right">
                            {item.unitPrice
                              ? `¥${parseFloat(item.unitPrice).toFixed(2)}`
                              : "-"}
                          </td>
                          <td className="px-3 py-3 text-right">
                            {item.totalPrice
                              ? `¥${parseFloat(item.totalPrice).toFixed(2)}`
                              : "-"}
                          </td>
                          <td className="px-3 py-3 text-center">
                            {item.taxRate ? `${item.taxRate}%` : "-"}
                          </td>
                          <td className="px-3 py-3 truncate" title={item.sku}>
                            {item.sku || "-"}
                          </td>
                          <td
                            className="px-3 py-3 truncate"
                            title={item.warehouse}
                          >
                            {item.warehouse || "-"}
                          </td>
                          <td
                            className="px-3 py-3 truncate"
                            title={item.purchaseBatch}
                          >
                            {item.purchaseBatch || "-"}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex gap-1">
                              <Button
                                onClick={() => handleEdit(item)}
                                className="px-2 py-1 text-xs"
                              >
                                编辑
                              </Button>
                              <Button
                                onClick={(e) => handleDelete(item.id, e)}
                                className="px-2 py-1 text-xs"
                              >
                                删除
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 确认删除库存项模态框 */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseAllModals}
        onConfirm={handleConfirmDelete}
        title="删除库存项"
        message={`确定要删除库存项 "${deletingItem?.materialName}" 吗？此操作不可撤销。`}
        confirmText="删除"
        cancelText="取消"
        confirmVariant="destructive"
      />

      {/* 第二次确认删除库存项模态框 */}
      <ConfirmModal
        isOpen={isConfirmDeleteModalOpen}
        onClose={handleCloseAllModals}
        onConfirm={handleFinalConfirmDelete}
        title="最终确认删除"
        message={`请再次确认：真的要删除库存项 "${deletingItem?.materialName}" 吗？此操作不可撤销！`}
        confirmText="确认删除"
        cancelText="取消"
        confirmVariant="destructive"
      />

      {/* 确认删除批次模态框 */}
      <ConfirmModal
        isOpen={isDeleteBatchModalOpen}
        onClose={handleCloseAllModals}
        onConfirm={handleConfirmDeleteBatch}
        title="删除批次"
        message={`确定要删除批次 "${deletingBatch}" 吗？此操作将删除该批次下的所有库存项，且无法恢复！`}
        confirmText="删除"
        cancelText="取消"
        confirmVariant="destructive"
      />

      {/* 第二次确认删除批次模态框 */}
      <ConfirmModal
        isOpen={isConfirmDeleteBatchModalOpen}
        onClose={handleCloseAllModals}
        onConfirm={handleFinalConfirmDeleteBatch}
        title="最终确认删除批次"
        message={`请再次确认：真的要删除批次 "${deletingBatch}" 吗？此操作将删除该批次下的所有库存项，且无法恢复！`}
        confirmText="确认删除"
        cancelText="取消"
        confirmVariant="destructive"
      />

      {/* PDF上传模态框 */}
      <Modal
        isOpen={uploadPdfModalOpen}
        onClose={handleCloseUploadPdf}
        title={`上传PDF文件 - ${currentBatchName}`}
        size="xl"
      >
        {currentBatchName && (
          <BatchPdfUpload
            batchName={currentBatchName}
            onPdfListUpdate={handlePdfUploadUpdate}
          />
        )}
      </Modal>

      {/* PDF查看模态框 */}
      <Modal
        isOpen={viewPdfModalOpen}
        onClose={handleCloseViewPdf}
        title={`查看PDF文件 - ${currentBatchName}`}
        size="xl"
        className="h-[90vh]"
      >
        {viewPdfModalOpen && (
          <div className="space-y-4">
            {currentPdfList.length === 0 ? (
              <div className="text-center py-8 text-gray-500">暂无PDF文件</div>
            ) : (
              <div className="space-y-3">
                {currentPdfList.map((pdf) => (
                  <div
                    key={pdf.id}
                    className="p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">
                          {pdf.fileName}
                        </h4>
                        <p className="text-sm text-gray-500 mt-1">
                          大小: {(pdf.fileSize / 1024).toFixed(2)} KB •
                          上传时间:{" "}
                          {new Date(pdf.uploadTime).toLocaleString("zh-CN")}
                        </p>
                        {pdf.description && (
                          <p className="text-sm text-gray-600 mt-1">
                            {pdf.description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          onClick={() => handleViewPdf(pdf)}
                          variant="outline"
                          size="sm"
                        >
                          👁️ 查看
                        </Button>
                        <Button
                          onClick={() => {
                            const link = document.createElement("a");
                            link.href = pdf.downloadUrl;
                            link.download = pdf.fileName;
                            link.target = "_blank";
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          variant="outline"
                          size="sm"
                        >
                          ⬇️ 下载
                        </Button>
                        <Button
                          onClick={async () => {
                            if (
                              window.confirm(
                                `确定要删除PDF文件 "${pdf.fileName}" 吗？`
                              )
                            ) {
                              try {
                                const { deleteBatchPdf } = await import(
                                  "@/lib/mysqlConnection"
                                );
                                const result = await deleteBatchPdf(pdf.id);
                                if (result.success) {
                                  toast({
                                    title: "删除成功",
                                    description: `PDF文件 "${pdf.fileName}" 已删除`,
                                  });
                                  // 重新加载所有批次的PDF数量统计
                                  loadAllBatchPdfCounts();
                                  // 重新加载当前批次的PDF列表
                                  handleOpenViewPdf(currentBatchName);
                                } else {
                                  throw new Error(result.message);
                                }
                              } catch (error) {
                                toast({
                                  variant: "destructive",
                                  title: "删除失败",
                                  description: `删除PDF文件失败: ${error.message}`,
                                });
                              }
                            }
                          }}
                          variant="destructive"
                          size="sm"
                        >
                          🗑️ 删除
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* PDF查看器模态框 */}
      <PdfViewer
        pdf={selectedPdf}
        isOpen={!!selectedPdf}
        onClose={() => setSelectedPdf(null)}
      />

      {/* 编辑库存项模态框 */}
      <Modal
        isOpen={!!editingInventoryId}
        onClose={handleCancel}
        title="编辑库存项"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              物料名称 *
            </label>
            <input
              type="text"
              value={inventoryForm.materialName}
              onChange={(e) =>
                setInventoryForm({
                  ...inventoryForm,
                  materialName: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="请输入物料名称"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                数量 *
              </label>
              <input
                type="number"
                value={inventoryForm.quantity}
                onChange={(e) =>
                  setInventoryForm({
                    ...inventoryForm,
                    quantity: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="请输入数量"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                采购批号 *
              </label>
              <input
                type="text"
                value={inventoryForm.purchaseBatch}
                onChange={(e) =>
                  setInventoryForm({
                    ...inventoryForm,
                    purchaseBatch: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="请输入采购批号"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              商品SKU
            </label>
            <input
              type="text"
              value={inventoryForm.sku}
              onChange={(e) =>
                setInventoryForm({ ...inventoryForm, sku: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="请输入商品SKU"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                单价
              </label>
              <input
                type="number"
                step="0.01"
                value={inventoryForm.unitPrice}
                onChange={(e) =>
                  setInventoryForm({
                    ...inventoryForm,
                    unitPrice: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="请输入单价"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                总价
              </label>
              <input
                type="number"
                step="0.01"
                value={inventoryForm.totalPrice}
                onChange={(e) =>
                  setInventoryForm({
                    ...inventoryForm,
                    totalPrice: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="请输入总价"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                税率 (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={inventoryForm.taxRate}
                onChange={(e) =>
                  setInventoryForm({
                    ...inventoryForm,
                    taxRate: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="请输入税率"
                min="0"
                max="100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                税额
              </label>
              <input
                type="number"
                step="0.01"
                value={inventoryForm.taxAmount}
                onChange={(e) =>
                  setInventoryForm({
                    ...inventoryForm,
                    taxAmount: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="请输入税额"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                仓库
              </label>
              <input
                type="text"
                value={inventoryForm.warehouse}
                onChange={(e) =>
                  setInventoryForm({
                    ...inventoryForm,
                    warehouse: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="请输入仓库"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button onClick={handleCancel} variant="outline">
              取消
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={
                !inventoryForm.materialName ||
                !inventoryForm.quantity ||
                !inventoryForm.purchaseBatch
              }
            >
              保存
            </Button>
          </div>
        </div>
      </Modal>

      {/* 表格导入模态框 */}
      <Modal
        isOpen={isTableImportModalOpen}
        onClose={handleTableImportCancel}
        title="表格导入库存项"
        size="xl"
      >
        <TableImport
          onImportItems={handleTableImport}
          onCancel={handleTableImportCancel}
        />
      </Modal>
    </div>
  );
}
