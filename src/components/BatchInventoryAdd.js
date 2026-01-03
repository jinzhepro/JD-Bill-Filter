"use client";

import React, { useState } from "react";
import Button from "./ui/Button";
import {
  validateMultipleInventoryForms,
  createMultipleInventoryItems,
} from "@/lib/inventoryStorage";

// 生成唯一ID的函数
const generateId = () => {
  return `batch-row-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export function BatchInventoryAdd({ onAddItems, onCancel }) {
  const [rows, setRows] = useState([
    {
      id: generateId(),
      materialName: "",
      quantity: "",
      purchaseBatch: "",
      sku: "",
      unitPrice: "",
      totalPrice: "",
      taxRate: "13",
      taxAmount: "",
      invoiceNumber: "",
      invoiceDate: "",
    },
  ]);
  const [errors, setErrors] = useState({});
  const [globalErrors, setGlobalErrors] = useState([]);

  // 添加新行
  const addRow = () => {
    setRows([
      ...rows,
      {
        id: generateId(),
        materialName: "",
        quantity: "",
        purchaseBatch: "",
        sku: "",
        unitPrice: "",
        totalPrice: "",
        taxRate: "13",
        taxAmount: "",
        invoiceNumber: "",
        invoiceDate: "",
      },
    ]);
  };

  // 删除行
  const removeRow = (index) => {
    if (rows.length <= 1) return;
    const newRows = [...rows];
    newRows.splice(index, 1);
    setRows(newRows);
    // 清除对应行的错误
    const newErrors = { ...errors };
    delete newErrors[index];
    setErrors(newErrors);
  };

  // 更新行数据
  const updateRow = (index, field, value) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: value };
    setRows(newRows);

    // 清除对应行的错误
    if (errors[index]) {
      const newErrors = { ...errors };
      delete newErrors[index];
      setErrors(newErrors);
    }
  };

  // 验证并提交
  const handleSubmit = (e) => {
    e.preventDefault();

    // 验证表单
    const validation = validateMultipleInventoryForms(rows);
    if (!validation.isValid) {
      setErrors(validation.itemErrors);
      setGlobalErrors(validation.errors);
      return;
    }

    setErrors({});
    setGlobalErrors([]);

    try {
      // 创建多个库存项
      const newItems = createMultipleInventoryItems(rows);
      onAddItems(newItems);
    } catch (error) {
      setGlobalErrors([`批量添加库存项失败: ${error.message}`]);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 animate-fade-in">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        批量添加库存项
      </h2>

      {globalErrors.length > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          {globalErrors.map((error, index) => (
            <div key={index} className="text-red-600 text-sm">
              {error}
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="overflow-x-auto max-w-full">
          <table className="w-full min-w-max border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-2 py-2 text-left font-semibold text-primary-600 border whitespace-nowrap">
                  物料名称 *
                </th>
                <th className="px-2 py-2 text-left font-semibold text-primary-600 border whitespace-nowrap">
                  数量 *
                </th>
                <th className="px-2 py-2 text-left font-semibold text-primary-600 border whitespace-nowrap">
                  采购批号 *
                </th>
                <th className="px-2 py-2 text-left font-semibold text-primary-600 border whitespace-nowrap">
                  单价
                </th>
                <th className="px-2 py-2 text-left font-semibold text-primary-600 border whitespace-nowrap">
                  总价
                </th>
                <th className="px-2 py-2 text-left font-semibold text-primary-600 border whitespace-nowrap">
                  税率 (%)
                </th>
                <th className="px-2 py-2 text-left font-semibold text-primary-600 border whitespace-nowrap">
                  税额
                </th>
                <th className="px-2 py-2 text-left font-semibold text-primary-600 border whitespace-nowrap">
                  发票号码
                </th>
                <th className="px-2 py-2 text-left font-semibold text-primary-600 border whitespace-nowrap">
                  开票日期
                </th>
                <th className="px-2 py-2 text-left font-semibold text-primary-600 border whitespace-nowrap">
                  商品SKU
                </th>
                <th className="px-2 py-2 text-left font-semibold text-primary-600 border whitespace-nowrap">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={row.id}
                  className={`border ${
                    errors[index] ? "bg-red-50" : "hover:bg-gray-50"
                  }`}
                >
                  <td className="px-2 py-2 border whitespace-nowrap">
                    <input
                      type="text"
                      value={row.materialName}
                      onChange={(e) =>
                        updateRow(index, "materialName", e.target.value)
                      }
                      className={`w-32 px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-primary-500 text-sm ${
                        errors[index]?.includes("物料名称不能为空")
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                      required
                    />
                    {errors[index]?.includes("物料名称不能为空") && (
                      <div className="text-red-500 text-xs mt-1">
                        物料名称不能为空
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-2 border whitespace-nowrap">
                    <input
                      type="number"
                      value={row.quantity}
                      onChange={(e) =>
                        updateRow(index, "quantity", e.target.value)
                      }
                      min="0"
                      className={`w-20 px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-primary-500 text-sm ${
                        errors[index]?.includes("数量必须是非负整数")
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                      required
                    />
                    {errors[index]?.includes("数量必须是非负整数") && (
                      <div className="text-red-500 text-xs mt-1">
                        数量必须是非负整数
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-2 border whitespace-nowrap">
                    <input
                      type="text"
                      value={row.purchaseBatch}
                      onChange={(e) =>
                        updateRow(index, "purchaseBatch", e.target.value)
                      }
                      className={`w-24 px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-primary-500 text-sm ${
                        errors[index]?.includes("采购批号不能为空")
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                      required
                    />
                    {errors[index]?.includes("采购批号不能为空") && (
                      <div className="text-red-500 text-xs mt-1">
                        采购批号不能为空
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-2 border whitespace-nowrap">
                    <input
                      type="number"
                      value={row.unitPrice}
                      onChange={(e) =>
                        updateRow(index, "unitPrice", e.target.value)
                      }
                      min="0"
                      step="0.01"
                      className={`w-20 px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-primary-500 text-sm ${
                        errors[index]?.includes("单价必须是非负数")
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                      placeholder="可选"
                    />
                    {errors[index]?.includes("单价必须是非负数") && (
                      <div className="text-red-500 text-xs mt-1">
                        单价必须是非负数
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-2 border whitespace-nowrap">
                    <input
                      type="number"
                      value={row.totalPrice}
                      onChange={(e) =>
                        updateRow(index, "totalPrice", e.target.value)
                      }
                      min="0"
                      step="0.01"
                      className={`w-20 px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-primary-500 text-sm ${
                        errors[index]?.includes("总价必须是非负数")
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                      placeholder="可选"
                    />
                    {errors[index]?.includes("总价必须是非负数") && (
                      <div className="text-red-500 text-xs mt-1">
                        总价必须是非负数
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-2 border whitespace-nowrap">
                    <input
                      type="number"
                      value={row.taxRate}
                      onChange={(e) =>
                        updateRow(index, "taxRate", e.target.value)
                      }
                      min="0"
                      max="100"
                      step="0.01"
                      className={`w-16 px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-primary-500 text-sm ${
                        errors[index]?.includes("税率必须是0-100之间的数字")
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                      placeholder="可选"
                    />
                    {errors[index]?.includes("税率必须是0-100之间的数字") && (
                      <div className="text-red-500 text-xs mt-1">
                        税率必须是0-100之间的数字
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-2 border whitespace-nowrap">
                    <input
                      type="number"
                      value={row.taxAmount}
                      onChange={(e) =>
                        updateRow(index, "taxAmount", e.target.value)
                      }
                      min="0"
                      step="0.01"
                      className={`w-20 px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-primary-500 text-sm ${
                        errors[index]?.includes("税额必须是非负数")
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                      placeholder="可选"
                    />
                    {errors[index]?.includes("税额必须是非负数") && (
                      <div className="text-red-500 text-xs mt-1">
                        税额必须是非负数
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-2 border whitespace-nowrap">
                    <input
                      type="text"
                      value={row.invoiceNumber}
                      onChange={(e) =>
                        updateRow(index, "invoiceNumber", e.target.value)
                      }
                      className="w-24 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 text-sm"
                      placeholder="可选"
                    />
                  </td>
                  <td className="px-2 py-2 border whitespace-nowrap">
                    <input
                      type="date"
                      value={row.invoiceDate}
                      onChange={(e) =>
                        updateRow(index, "invoiceDate", e.target.value)
                      }
                      className="w-28 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 text-sm"
                    />
                  </td>
                  <td className="px-2 py-2 border whitespace-nowrap">
                    <input
                      type="text"
                      value={row.sku}
                      onChange={(e) => updateRow(index, "sku", e.target.value)}
                      className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 text-sm"
                      placeholder="可选"
                    />
                  </td>
                  <td className="px-2 py-2 border whitespace-nowrap">
                    <Button
                      type="button"
                      onClick={() => removeRow(index)}
                      className="px-2 py-1 text-xs bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
                      disabled={rows.length <= 1}
                    >
                      删除
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex gap-3 justify-between">
          <Button
            type="button"
            onClick={addRow}
            className="bg-green-600 text-white hover:bg-green-700"
          >
            添加行
          </Button>
          <div className="flex gap-3">
            <Button
              type="button"
              onClick={onCancel}
              className="bg-gray-200 text-gray-700 hover:bg-gray-300"
            >
              取消
            </Button>
            <Button type="submit">批量添加</Button>
          </div>
        </div>
      </form>
    </div>
  );
}
