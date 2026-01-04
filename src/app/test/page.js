"use client";

import React, { useState } from "react";
import {
  healthCheck,
  testConnection,
  getInventoryBatches,
  createInventoryTable,
} from "@/lib/mysqlConnection";
import { MainLayout } from "@/components/MainLayout";

export default function TestPage() {
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (test, success, message, duration = 0) => {
    setResults((prev) => [
      ...prev,
      {
        id: Date.now(),
        test,
        success,
        message,
        duration,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  };

  const runHealthCheck = async () => {
    setIsLoading(true);
    const startTime = Date.now();

    try {
      const result = await healthCheck();
      const duration = Date.now() - startTime;
      addResult("API健康检查", result.success, result.message, duration);
    } catch (error) {
      const duration = Date.now() - startTime;
      addResult("API健康检查", false, error.message, duration);
    } finally {
      setIsLoading(false);
    }
  };

  const runConnectionTest = async () => {
    setIsLoading(true);
    const startTime = Date.now();

    try {
      const result = await testConnection();
      const duration = Date.now() - startTime;
      addResult("MySQL连接测试", result.success, result.message, duration);
    } catch (error) {
      const duration = Date.now() - startTime;
      addResult("MySQL连接测试", false, error.message, duration);
    } finally {
      setIsLoading(false);
    }
  };

  const runBatchTest = async () => {
    setIsLoading(true);
    const startTime = Date.now();

    try {
      const result = await getInventoryBatches();
      const duration = Date.now() - startTime;

      if (result.success) {
        const batchInfo = result.data
          .map(
            (batch) =>
              `${batch.batchName} (${batch.totalItems}项, ${batch.totalQuantity}件)`
          )
          .join(", ");
        addResult(
          "库存批次测试",
          true,
          `获取到 ${result.data.length} 个批次: ${batchInfo}`,
          duration
        );
      } else {
        addResult("库存批次测试", false, result.message, duration);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      addResult("库存批次测试", false, error.message, duration);
    } finally {
      setIsLoading(false);
    }
  };

  const runTableTest = async () => {
    setIsLoading(true);
    const startTime = Date.now();

    try {
      const result = await createInventoryTable();
      const duration = Date.now() - startTime;
      addResult("表创建测试", result.success, result.message, duration);
    } catch (error) {
      const duration = Date.now() - startTime;
      addResult("表创建测试", false, error.message, duration);
    } finally {
      setIsLoading(false);
    }
  };

  const runAllTests = async () => {
    setResults([]);
    await runHealthCheck();
    await new Promise((resolve) => setTimeout(resolve, 500));
    await runConnectionTest();
    await new Promise((resolve) => setTimeout(resolve, 500));
    await runTableTest();
    await new Promise((resolve) => setTimeout(resolve, 500));
    await runBatchTest();
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            MySQL连接诊断工具
          </h1>
          <p className="text-gray-600 mb-6">
            使用此工具诊断MySQL
            API连接问题。首先运行API健康检查，然后测试MySQL连接。
          </p>

          <div className="flex flex-wrap gap-3 mb-6">
            <button
              onClick={runAllTests}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "运行中..." : "运行所有测试"}
            </button>
            <button
              onClick={runHealthCheck}
              disabled={isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "检查中..." : "API健康检查"}
            </button>
            <button
              onClick={runConnectionTest}
              disabled={isLoading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "测试中..." : "MySQL连接测试"}
            </button>
            <button
              onClick={runTableTest}
              disabled={isLoading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "测试中..." : "表创建测试"}
            </button>
            <button
              onClick={runBatchTest}
              disabled={isLoading}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "测试中..." : "库存批次测试"}
            </button>
            <button
              onClick={clearResults}
              disabled={isLoading}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              清除结果
            </button>
          </div>

          {results.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-800">测试结果</h2>
              <div className="space-y-2">
                {results.map((result) => (
                  <div
                    key={result.id}
                    className={`p-4 rounded-lg border ${
                      result.success
                        ? "bg-green-50 border-green-200"
                        : "bg-red-50 border-red-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            result.success ? "bg-green-500" : "bg-red-500"
                          }`}
                        />
                        <span className="font-medium text-gray-800">
                          {result.test}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {result.timestamp} ({result.duration}ms)
                      </div>
                    </div>
                    <p
                      className={`mt-2 text-sm ${
                        result.success ? "text-green-700" : "text-red-700"
                      }`}
                    >
                      {result.message}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            故障排除指南
          </h2>
          <div className="space-y-3 text-sm text-gray-600">
            <div>
              <strong>API健康检查失败：</strong>
              <ul className="ml-4 mt-1 list-disc">
                <li>检查Next.js开发服务器是否正在运行</li>
                <li>检查浏览器控制台是否有网络错误</li>
                <li>尝试重启开发服务器</li>
              </ul>
            </div>
            <div>
              <strong>MySQL连接测试失败：</strong>
              <ul className="ml-4 mt-1 list-disc">
                <li>确认MySQL服务正在运行</li>
                <li>检查数据库连接配置（主机、用户名、密码、数据库名）</li>
                <li>确认数据库&quot;testdb&quot;存在</li>
                <li>检查MySQL用户权限</li>
              </ul>
            </div>
            <div>
              <strong>表创建测试失败：</strong>
              <ul className="ml-4  mt-1 list-disc">
                <li>检查MySQL用户权限</li>
                <li>确认数据库&quot;testdb&quot;存在</li>
                <li>验证表创建SQL语法</li>
                <li>检查字符集设置</li>
              </ul>
            </div>
            <div>
              <strong>库存批次测试失败：</strong>
              <ul className="ml-4 mt-1 list-disc">
                <li>检查inventory_batches表是否存在</li>
                <li>确认批次名称不为空</li>
                <li>检查批次统计信息更新是否正常</li>
                <li>验证库存数据中的purchaseBatch字段</li>
              </ul>
            </div>
            <div>
              <strong>常见解决方案：</strong>
              <ul className="ml-4 mt-1 list-disc">
                <li>重启MySQL服务：`sudo systemctl restart mysql`</li>
                <li>检查MySQL状态：`sudo systemctl status mysql`</li>
                <li>创建数据库：`CREATE DATABASE testdb;`</li>
                <li>检查端口：MySQL默认使用3306端口</li>
                <li>
                  手动创建表：`CREATE TABLE inventory (...)` 和 `CREATE TABLE
                  inventory_batches (...)`
                </li>
                <li>检查表格导入数据中的采购批号字段</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
