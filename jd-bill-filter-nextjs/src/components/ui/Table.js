import React from "react";

export default function Table({
  headers = [],
  data = [],
  className = "",
  maxHeight = "400px",
  striped = true,
  hover = true,
  compact = false,
}) {
  const paddingClasses = compact ? "px-3 py-2" : "px-4 py-3";
  const fontSizeClasses = compact ? "text-sm" : "text-base";

  if (!data || data.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        暂无数据
      </div>
    );
  }

  return (
    <div className={`table-container ${className}`}>
      <table className="preview-table w-full">
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th
                key={index}
                className={`${paddingClasses} ${fontSizeClasses} font-semibold text-left`}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className={`
                ${striped && rowIndex % 2 === 1 ? "bg-gray-50" : ""}
                ${hover ? "hover:bg-gray-100" : ""}
                transition-colors duration-150
              `}
            >
              {headers.map((header, cellIndex) => (
                <td
                  key={cellIndex}
                  className={`${paddingClasses} ${fontSizeClasses} border-t border-gray-200`}
                >
                  {row[header] || ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// 数据预览表格组件
export function PreviewTable({ data = [], maxRows = 100, className = "" }) {
  if (!data || data.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        暂无数据
      </div>
    );
  }

  const previewData = data.slice(0, maxRows);
  const headers = Object.keys(previewData[0] || {});

  // 计算总价总计
  const calculateTotalPrice = (data) => {
    return data.reduce((sum, row) => {
      const price = parseFloat(row["总价"]) || 0;
      return sum + price;
    }, 0);
  };

  const totalPrice = calculateTotalPrice(data);

  return (
    <div className={className}>
      <div className="mb-4 text-sm text-gray-600">
        显示前 {Math.min(maxRows, data.length)} 行，共 {data.length} 行数据
      </div>
      <Table
        headers={headers}
        data={previewData}
        maxHeight="400px"
        striped
        hover
      />

      {/* 总计行 */}
      <div className="mt-4 border-t-2 border-gray-300 pt-2">
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-green-200">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-700">
              预览数据总价总计：
            </span>
            <span className="text-lg font-bold text-green-600">
              ¥{totalPrice.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// 统计信息表格组件
export function StatsTable({ stats = {}, className = "" }) {
  const statsItems = [
    { label: "原始数据行数", value: stats.originalCount || 0 },
    { label: "处理后数据行数", value: stats.processedCount || 0 },
    { label: "过滤数据行数", value: stats.filteredCount || 0 },
    { label: "过滤率", value: `${stats.filterRate || 0}%` },
    { label: "原始订单数", value: stats.originalOrders || 0 },
    { label: "处理后订单数", value: stats.processedOrders || 0 },
  ];

  return (
    <div className={`bg-primary-50 rounded-lg p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-primary-900 mb-4">处理统计</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {statsItems.map((item, index) => (
          <div
            key={index}
            className="flex justify-between items-center p-3 bg-white rounded-lg"
          >
            <span className="text-sm font-medium text-gray-600">
              {item.label}
            </span>
            <span className="text-lg font-bold text-primary-600">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// 单价输入表格组件
export function PriceInputTable({
  products = [],
  onPriceChange,
  onStatusChange,
  className = "",
}) {
  const handleInputChange = (productCode, value) => {
    const numValue = parseFloat(value);
    const isValid = !isNaN(numValue) && numValue >= 0 && numValue <= 999999.99;

    onPriceChange(productCode, value, isValid);
    onStatusChange(
      productCode,
      isValid ? "valid" : value ? "invalid" : "pending"
    );
  };

  const getStatusText = (status, hasDefault = false) => {
    const statusMap = {
      pending: "待输入",
      valid: hasDefault ? "默认单价" : "已输入",
      invalid: "格式错误",
    };
    return statusMap[status] || "未知";
  };

  const getStatusClasses = (status) => {
    const baseClasses =
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    const statusClasses = {
      pending: "bg-yellow-100 text-yellow-800",
      valid: "bg-green-100 text-green-800",
      invalid: "bg-red-100 text-red-800",
    };
    return `${baseClasses} ${
      statusClasses[status] || "bg-gray-100 text-gray-800"
    }`;
  };

  return (
    <div
      className={`overflow-hidden border border-gray-200 rounded-lg ${className}`}
    >
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              商品编号
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              商品名称
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              单价（元）
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              状态
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {products.map((product, index) => (
            <tr
              key={`${product.productCode}-${index}`}
              className="hover:bg-gray-50"
            >
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {product.productCode}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {product.productName || "-"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="999999.99"
                    placeholder="0.00"
                    value={product.unitPrice || ""}
                    onChange={(e) =>
                      handleInputChange(
                        product.productCode,
                        e?.target?.value || ""
                      )
                    }
                    className={`
                      w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500
                      ${
                        product.status === "valid"
                          ? "border-green-500 bg-green-50"
                          : ""
                      }
                      ${
                        product.status === "invalid"
                          ? "border-red-500 bg-red-50"
                          : ""
                      }
                      ${product.status === "pending" ? "border-gray-300" : ""}
                    `}
                  />
                  {product.hasDefaultPrice && (
                    <div className="mt-1 text-xs text-gray-500">
                      默认: {product.unitPrice}
                    </div>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={getStatusClasses(product.status)}>
                  {getStatusText(product.status, product.hasDefaultPrice)}
                  {product.hasDefaultPrice && (
                    <span className="ml-1 text-xs">(默认)</span>
                  )}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
