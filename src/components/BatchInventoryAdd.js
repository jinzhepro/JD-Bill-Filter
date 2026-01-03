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
      specification: "",
      quantity: "",
      purchaseBatch: "",
      sku: "",
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
        specification: "",
        quantity: "",
        purchaseBatch: "",
        sku: "",
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
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-left font-semibold text-primary-600 border">
                  物料名称 *
                </th>
                <th className="px-3 py-2 text-left font-semibold text-primary-600 border">
                  规格
                </th>
                <th className="px-3 py-2 text-left font-semibold text-primary-600 border">
                  数量 *
                </th>
                <th className="px-3 py-2 text-left font-semibold text-primary-600 border">
                  采购批号 *
                </th>
                <th className="px-3 py-2 text-left font-semibold text-primary-600 border">
                  商品SKU
                </th>
                <th className="px-3 py-2 text-left font-semibold text-primary-600 border">
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
                  <td className="px-3 py-2 border">
                    <input
                      type="text"
                      value={row.materialName}
                      onChange={(e) =>
                        updateRow(index, "materialName", e.target.value)
                      }
                      className={`w-full px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-primary-500 ${
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
                  <td className="px-3 py-2 border">
                    <input
                      type="text"
                      value={row.specification}
                      onChange={(e) =>
                        updateRow(index, "specification", e.target.value)
                      }
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </td>
                  <td className="px-3 py-2 border">
                    <input
                      type="number"
                      value={row.quantity}
                      onChange={(e) =>
                        updateRow(index, "quantity", e.target.value)
                      }
                      min="0"
                      className={`w-full px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-primary-500 ${
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
                  <td className="px-3 py-2 border">
                    <input
                      type="text"
                      value={row.purchaseBatch}
                      onChange={(e) =>
                        updateRow(index, "purchaseBatch", e.target.value)
                      }
                      className={`w-full px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-primary-500 ${
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
                  <td className="px-3 py-2 border">
                    <input
                      type="text"
                      value={row.sku}
                      onChange={(e) => updateRow(index, "sku", e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                      placeholder="可选"
                    />
                  </td>
                  <td className="px-3 py-2 border">
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
