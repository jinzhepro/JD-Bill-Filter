"use client";

import React, { useState } from "react";
import { useSupplier } from "@/context/SupplierContext";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  ChevronDown, 
  RefreshCcw, 
  Trash2, 
  Copy 
} from "lucide-react";

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

  const [showSuppliers, setShowSuppliers] = useState(false);

  return (
    <div className="space-y-4">
      {/* 供应商列表展示 - 可折叠 */}
      <section className="bg-card rounded-lg shadow-sm border border-border">
        <button
          onClick={() => setShowSuppliers(!showSuppliers)}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-muted/50 transition-colors"
        >
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              供应商列表（共 {suppliers.length} 个）
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              数据在 <code className="bg-muted px-1.5 py-0.5 rounded text-xs">src/data/suppliers.js</code> 维护
            </p>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform ${
              showSuppliers ? "rotate-180" : ""
            }`}
          />
        </button>
        
        {showSuppliers && (
          <div className="px-4 pb-4 pt-0">
            <div className="max-h-64 overflow-y-auto border-t border-border pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {suppliers.map((supplier) => (
                  <div
                    key={supplier.id}
                    className="bg-muted/50 rounded-md p-3 text-xs"
                  >
                    <div className="font-medium text-foreground mb-1">
                      {supplier.name}
                    </div>
                    <div className="text-muted-foreground">
                      <div>ID: {supplier.supplierId}</div>
                    </div>
                    <div className="text-muted-foreground mt-1 truncate" title={supplier.matchString}>
                      匹配: {supplier.matchString}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 供应商转换工具 */}
      <section className="bg-card rounded-lg shadow-sm border border-border p-4">
        <h3 className="text-sm font-semibold text-foreground mb-2">
          供应商转换工具
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          输入文本自动匹配供应商信息
        </p>

        <div className="space-y-3">
          <div>
            <Textarea
              id="inputText"
              rows={6}
              className="text-sm"
              placeholder="每行一条记录"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleConvert}>
              <RefreshCcw className="w-4 h-4 mr-2" />
              开始转换
            </Button>
            <Button variant="outline" onClick={handleClear}>
              <Trash2 className="w-4 h-4 mr-2" />
              清空
            </Button>
          </div>

          {results.length > 0 && (
            <>
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-medium text-foreground">
                    转换结果（{results.length} 条）
                  </h4>
                  <Button onClick={handleCopyResults} variant="outline" size="sm" className="h-7 text-xs px-2">
                    <Copy className="w-3 h-3 mr-1" />
                    复制
                  </Button>
                </div>
                <div className="bg-muted rounded-md p-3 max-h-64 overflow-y-auto">
                  {results.map((result, index) => (
                    <div
                      key={`${result.originalText}-${index}`}
                      className={`flex items-center justify-between py-1.5 px-2 mb-1.5 rounded text-xs ${
                        result.matched ? "bg-primary/10" : "bg-destructive/10"
                      }`}
                    >
                      <span className="text-foreground truncate flex-1 mr-2">
                        {result.originalText}
                      </span>
                      <span
                        className={`font-medium shrink-0 ${
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
              <div className="flex gap-4 text-xs bg-primary/5 rounded-md p-2">
                <div>
                  <span className="text-muted-foreground">总数：</span>
                  <span className="font-semibold text-foreground ml-1">
                    {results.length}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">匹配：</span>
                  <span className="font-semibold text-primary ml-1">
                    {results.filter((r) => r.matched).length}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">未匹配：</span>
                  <span className="font-semibold text-destructive ml-1">
                    {results.filter((r) => !r.matched).length}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">匹配率：</span>
                  <span className="font-semibold text-foreground ml-1">
                    {(
                      (results.filter((r) => r.matched).length /
                        results.length) *
                      100
                    ).toFixed(1)}
                    %
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
