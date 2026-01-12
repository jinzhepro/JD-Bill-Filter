"use client";

import React, { useState } from "react";
import { useSupplier } from "@/context/SupplierContext";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";

export default function SupplierManager() {
  const { suppliers, convertTextToSuppliers } = useSupplier();
  const { toast } = useToast();

  const [inputText, setInputText] = useState("");
  const [results, setResults] = useState([]);

  // 执行转换
  const handleConvert = () => {
    if (!inputText.trim()) {
      toast({
        variant: "destructive",
        title: "输入为空",
        description: "请输入需要转换的文本",
      });
      return;
    }

    const conversionResults = convertTextToSuppliers(inputText);
    setResults(conversionResults);

    const matchedCount = conversionResults.filter((r) => r.matched).length;
    const totalCount = conversionResults.length;

    toast({
      title: "转换完成",
      description: `共转换 ${totalCount} 条，匹配 ${matchedCount} 条`,
    });
  };

  // 清空输入
  const handleClear = () => {
    setInputText("");
    setResults([]);
  };

  // 复制结果（只复制ID）
  const handleCopyResults = () => {
    const resultText = results
      .map((r) => {
        if (r.matched) {
          return r.supplier.supplierId;
        }
        return "未匹配";
      })
      .join("\n");

    navigator.clipboard.writeText(resultText).then(() => {
      toast({
        title: "复制成功",
        description: "供应商ID已复制到剪贴板",
      });
    });
  };

  return (
    <div className="space-y-6">
      {/* 供应商列表展示 */}
      <section className="bg-card rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          供应商列表（共 {suppliers.length} 个）
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          供应商数据在 <code className="bg-muted px-2 py-1 rounded">src/data/suppliers.js</code>{" "}
          文件中维护
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  供应商名称
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  供应商ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  匹配字符串
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {suppliers.map((supplier) => (
                <tr key={supplier.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {supplier.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {supplier.supplierId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {supplier.matchString}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 供应商转换工具 */}
      <section className="bg-card rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          供应商转换工具
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          输入包含供应商信息的文本，系统会自动匹配并转换为供应商名称和ID
        </p>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="inputText"
              className="block text-sm font-medium text-foreground mb-2"
            >
              输入文本
            </label>
            <textarea
              id="inputText"
              rows={10}
              className="w-full px-4 py-2 border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-transparent"
              placeholder="请输入需要转换的文本，每行一条记录"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleConvert} className="bg-primary text-primary-foreground hover:bg-primary/90">
              开始转换
            </Button>
            <Button onClick={handleClear} variant="outline">
              清空
            </Button>
          </div>

          {results.length > 0 && (
            <>
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-foreground">
                    转换结果（共 {results.length} 条）
                  </h4>
                  <Button onClick={handleCopyResults} variant="outline" size="sm">
                    复制结果
                  </Button>
                </div>
                <div className="bg-muted rounded-lg p-4 max-h-96 overflow-y-auto">
                  {results.map((result, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between py-2 px-3 mb-2 rounded ${
                        result.matched ? "bg-primary/10" : "bg-destructive/10"
                      }`}
                    >
                      <span className="text-sm text-foreground">
                        {result.originalText}
                      </span>
                      <span
                        className={`text-sm font-medium ${
                          result.matched
                            ? "text-primary"
                            : "text-destructive"
                        }`}
                      >
                        {result.matched
                          ? `${result.supplier.name} (${result.supplier.supplierId})`
                          : "未匹配"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 统计信息 */}
              <div className="mt-4 p-4 bg-primary/10 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">总记录数：</span>
                    <span className="font-semibold text-foreground ml-2">
                      {results.length}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">匹配成功：</span>
                    <span className="font-semibold text-primary ml-2">
                      {results.filter((r) => r.matched).length}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">未匹配：</span>
                    <span className="font-semibold text-destructive ml-2">
                      {results.filter((r) => !r.matched).length}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">匹配率：</span>
                    <span className="font-semibold text-foreground ml-2">
                      {(
                        (results.filter((r) => r.matched).length /
                          results.length) *
                        100
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
