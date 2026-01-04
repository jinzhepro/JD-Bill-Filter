"use client";

import React, { useState, useEffect } from "react";
import Button from "./ui/Button";
import {
  getDeductionRecords,
  rollbackDeductionRecords,
} from "@/lib/mysqlConnection";

export function DeductionRecords({ onClose }) {
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [error, setError] = useState("");

  // 加载库存扣减记录
  const loadRecords = async () => {
    setIsLoading(true);
    setError("");

    try {
      const result = await getDeductionRecords();
      if (result.success) {
        setRecords(result.data);
      } else {
        setError(result.message || "加载库存扣减记录失败");
      }
    } catch (err) {
      setError(`加载库存扣减记录失败: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 组件挂载时加载记录
  useEffect(() => {
    loadRecords();
  }, []);

  // 格式化时间戳
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "-";
    try {
      const date = new Date(timestamp);
      return date.toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch (error) {
      return timestamp;
    }
  };

  // 格式化完整时间戳（用于分组标题）
  const formatFullTimestamp = (timestamp) => {
    if (!timestamp) return "-";
    try {
      const date = new Date(timestamp);
      return date.toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch (error) {
      return timestamp;
    }
  };

  // 按完整时间戳分组记录（精确到秒）
  const groupedRecords = records.reduce((groups, record) => {
    const timestamp = formatFullTimestamp(record.timestamp);
    if (!groups[timestamp]) {
      groups[timestamp] = [];
    }
    groups[timestamp].push(record);
    return groups;
  }, {});

  // 按时间戳倒序排列
  const sortedTimestamps = Object.keys(groupedRecords).sort((a, b) => {
    return new Date(b) - new Date(a);
  });

  // 处理撤回扣减记录
  const handleRollback = async (timestamp) => {
    if (
      !window.confirm(
        `确定要撤回 ${timestamp} 的所有扣减记录吗？此操作将恢复相应的库存数量，且无法撤销！`
      )
    ) {
      return;
    }

    setIsRollingBack(true);
    setError("");

    try {
      const result = await rollbackDeductionRecords(timestamp);
      if (result.success) {
        // 重新加载记录
        await loadRecords();
        alert(`成功撤回 ${result.recordsCount} 条扣减记录`);
      } else {
        setError(result.message || "撤回扣减记录失败");
      }
    } catch (err) {
      setError(`撤回扣减记录失败: ${err.message}`);
    } finally {
      setIsRollingBack(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">
          库存扣减记录 ({records.length})
        </h2>
        <div className="flex gap-3">
          <Button
            onClick={loadRecords}
            disabled={isLoading}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            {isLoading ? "刷新中..." : "刷新"}
          </Button>
          <Button
            onClick={onClose}
            className="bg-gray-200 text-gray-700 hover:bg-gray-300"
          >
            关闭
          </Button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-red-600 text-sm">{error}</div>
        </div>
      )}

      {/* 记录列表 */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-500">
          正在加载库存扣减记录...
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-8 text-gray-500">暂无库存扣减记录</div>
      ) : (
        <div className="space-y-6">
          {sortedTimestamps.map((timestamp) => (
            <div
              key={timestamp}
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              {/* 时间戳标题 */}
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-gray-800">{timestamp}</h3>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm text-gray-600">
                      <div>
                        共 {groupedRecords[timestamp].length} 条扣减记录
                      </div>
                      <div className="mt-1">
                        总扣减数量:{" "}
                        {groupedRecords[timestamp].reduce(
                          (sum, record) => sum + record.deductedQuantity,
                          0
                        )}{" "}
                        件
                      </div>
                    </div>
                    <Button
                      onClick={() => handleRollback(timestamp)}
                      disabled={isRollingBack}
                      className="bg-red-600 text-white hover:bg-red-700 px-3 py-1 text-sm"
                    >
                      {isRollingBack ? "撤回中..." : "撤回"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* 该时间戳下的记录列表 */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-3 py-3 text-left font-semibold text-primary-600">
                        商品SKU
                      </th>
                      <th className="px-3 py-3 text-left font-semibold text-primary-600">
                        物料名称
                      </th>
                      <th className="px-3 py-3 text-left font-semibold text-primary-600">
                        采购批号
                      </th>
                      <th className="px-3 py-3 text-right font-semibold text-primary-600">
                        原始库存
                      </th>
                      <th className="px-3 py-3 text-right font-semibold text-primary-600">
                        扣减数量
                      </th>
                      <th className="px-3 py-3 text-right font-semibold text-primary-600">
                        剩余库存
                      </th>
                      <th className="px-3 py-3 text-right font-semibold text-primary-600">
                        订单数量
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedRecords[timestamp].map((record) => (
                      <tr
                        key={record.id}
                        className="border-b border-gray-200 hover:bg-gray-50"
                      >
                        <td className="px-3 py-3 truncate" title={record.sku}>
                          {record.sku}
                        </td>
                        <td
                          className="px-3 py-3 truncate"
                          title={record.materialName}
                        >
                          {record.materialName}
                        </td>
                        <td
                          className="px-3 py-3 truncate"
                          title={record.purchaseBatch}
                        >
                          {record.purchaseBatch}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {record.originalQuantity}
                        </td>
                        <td className="px-3 py-3 text-right text-red-600 font-semibold">
                          -{record.deductedQuantity}
                        </td>
                        <td className="px-3 py-3 text-right text-green-600 font-semibold">
                          {record.remainingQuantity}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {record.orderCount}
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
    </div>
  );
}
