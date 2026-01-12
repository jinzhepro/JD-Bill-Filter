// 静态供应商数据配置
// 直接在此文件中维护供应商信息

export const SUPPLIERS = [
  {
    id: "supplier-001",
    name: "兰州青开隆宇建设发展有限公司",
    supplierId: "S2@@029206",
    matchString: "JK-GQ-250130",
  },
  {
    id: "supplier-002",
    name: "青岛山君林泉供应链有限公司",
    supplierId: "S2@@027934",
    matchString: "JK-GQ-250042",
  },
  {
    id: "supplier-003",
    name: "新疆青开建投发展有限公司",
    supplierId: "S2@@029174",
    matchString: "JK-GQ-250135",
  },
];

// 根据匹配字符串查找供应商
export function findSupplierByMatchString(text) {
  if (!text) return null;

  return SUPPLIERS.find((supplier) => {
    if (!supplier.matchString || supplier.matchString.trim() === "") {
      return false;
    }
    return text.includes(supplier.matchString.trim());
  });
}

// 批量转换文本为供应商信息
export function convertTextToSuppliers(text) {
  if (!text) return [];

  // 按行分割文本
  const lines = text.split("\n").filter((line) => line.trim() !== "");

  const results = lines.map((line) => {
    const trimmedLine = line.trim();
    const supplier = findSupplierByMatchString(trimmedLine);

    return {
      originalText: trimmedLine,
      supplier: supplier,
      matched: !!supplier,
    };
  });

  return results;
}
