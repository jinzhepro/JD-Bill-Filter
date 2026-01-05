"use client";

import React, { useState } from "react";
import {
  testConnection,
  createInventoryTable,
  createProductTable,
  createSupplierTable,
  createUserTable,
  createPdfTable,
} from "@/lib/mysqlConnection";
import { MainLayout } from "@/components/MainLayout";

export default function TestPage() {
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userInitLoading, setUserInitLoading] = useState(false);
  const [pdfTableLoading, setPdfTableLoading] = useState(false);

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

  const runInventoryTableTest = async () => {
    setIsLoading(true);
    const startTime = Date.now();

    try {
      const result = await createInventoryTable();
      const duration = Date.now() - startTime;
      addResult("库存表创建测试", result.success, result.message, duration);
    } catch (error) {
      const duration = Date.now() - startTime;
      addResult("库存表创建测试", false, error.message, duration);
    } finally {
      setIsLoading(false);
    }
  };

  const runProductTableTest = async () => {
    setIsLoading(true);
    const startTime = Date.now();

    try {
      const result = await createProductTable();
      const duration = Date.now() - startTime;
      addResult("商品表创建测试", result.success, result.message, duration);
    } catch (error) {
      const duration = Date.now() - startTime;
      addResult("商品表创建测试", false, error.message, duration);
    } finally {
      setIsLoading(false);
    }
  };

  const runSupplierTableTest = async () => {
    setIsLoading(true);
    const startTime = Date.now();

    try {
      const result = await createSupplierTable();
      const duration = Date.now() - startTime;
      addResult("供应商表创建测试", result.success, result.message, duration);
    } catch (error) {
      const duration = Date.now() - startTime;
      addResult("供应商表创建测试", false, error.message, duration);
    } finally {
      setIsLoading(false);
    }
  };

  const runUserTableTest = async () => {
    setUserInitLoading(true);
    const startTime = Date.now();

    try {
      const result = await createUserTable();
      const duration = Date.now() - startTime;
      addResult("用户表创建测试", result.success, result.message, duration);
    } catch (error) {
      const duration = Date.now() - startTime;
      addResult("用户表创建测试", false, error.message, duration);
    } finally {
      setUserInitLoading(false);
    }
  };

  const runPdfTableTest = async () => {
    setPdfTableLoading(true);
    const startTime = Date.now();

    try {
      const result = await createPdfTable();
      const duration = Date.now() - startTime;
      addResult("PDF表创建测试", result.success, result.message, duration);
    } catch (error) {
      const duration = Date.now() - startTime;
      addResult("PDF表创建测试", false, error.message, duration);
    } finally {
      setPdfTableLoading(false);
    }
  };

  const runAllTests = async () => {
    setResults([]);
    await runConnectionTest();
    await new Promise((resolve) => setTimeout(resolve, 500));
    await runInventoryTableTest();
    await new Promise((resolve) => setTimeout(resolve, 500));
    await runProductTableTest();
    await new Promise((resolve) => setTimeout(resolve, 500));
    await runSupplierTableTest();
    await new Promise((resolve) => setTimeout(resolve, 500));
    await runUserTableTest();
    await new Promise((resolve) => setTimeout(resolve, 500));
    await runPdfTableTest();
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            MySQL连接与表创建测试
          </h1>
          <p className="text-gray-600 mb-6">
            测试MySQL数据库连接并创建必要的表结构（库存表、商品表、供应商表和用户表）。
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
              onClick={runConnectionTest}
              disabled={isLoading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "测试中..." : "MySQL连接测试"}
            </button>
            <button
              onClick={runInventoryTableTest}
              disabled={isLoading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "测试中..." : "库存表创建测试"}
            </button>
            <button
              onClick={runProductTableTest}
              disabled={isLoading}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "测试中..." : "商品表创建测试"}
            </button>
            <button
              onClick={runSupplierTableTest}
              disabled={isLoading}
              className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "测试中..." : "供应商表创建测试"}
            </button>
            <button
              onClick={runUserTableTest}
              disabled={isLoading || userInitLoading}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {userInitLoading ? "初始化中..." : "用户表初始化"}
            </button>
            <button
              onClick={runPdfTableTest}
              disabled={isLoading || pdfTableLoading}
              className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pdfTableLoading ? "测试中..." : "PDF表创建测试"}
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
              <strong>MySQL连接测试失败：</strong>
              <ul className="ml-4 mt-1 list-disc">
                <li>确认MySQL服务正在运行</li>
                <li>检查数据库连接配置（主机、用户名、密码、数据库名）</li>
                <li>确认数据库"testdb"存在</li>
                <li>检查MySQL用户权限</li>
              </ul>
            </div>
            <div>
              <strong>表创建测试失败：</strong>
              <ul className="ml-4 mt-1 list-disc">
                <li>检查MySQL用户权限</li>
                <li>确认数据库"testdb"存在</li>
                <li>验证表创建SQL语法</li>
                <li>检查字符集设置</li>
              </ul>
            </div>
            <div>
              <strong>常见解决方案：</strong>
              <ul className="ml-4 mt-1 list-disc">
                <li>重启MySQL服务：`sudo systemctl restart mysql`</li>
                <li>检查MySQL状态：`sudo systemctl status mysql`</li>
                <li>创建数据库：`CREATE DATABASE testdb;`</li>
                <li>
                  手动创建表：`CREATE TABLE inventory (...)`、`CREATE TABLE
                  inventory_batches (...)` 和 `CREATE TABLE suppliers (...)`
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
