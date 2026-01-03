"use client";

/**
 * 解析PDF发票文件，提取库存信息
 * @param {File} file PDF文件对象
 * @returns {Promise<Array>} 解析出的库存项列表
 */
export const parseInvoicePDF = async (file) => {
  try {
    // 检查文件类型
    if (file.type !== "application/pdf") {
      throw new Error("请上传PDF格式的发票文件");
    }

    // 检查文件大小 (限制为10MB)
    if (file.size > 10 * 1024 * 1024) {
      throw new Error("文件大小不能超过10MB");
    }

    // 动态导入pdfjs-dist
    const pdfjsLib = await import("pdfjs-dist");

    // 设置worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

    // 读取文件内容
    const arrayBuffer = await file.arrayBuffer();

    // 加载PDF文档
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    // 提取所有页面的文本
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item) => item.str).join(" ");
      fullText += pageText + "\n";
    }

    // 提取库存信息
    const inventoryItems = extractInventoryFromText(fullText);

    return inventoryItems;
  } catch (error) {
    console.error("PDF解析失败:", error);
    throw new Error(`PDF解析失败: ${error.message}`);
  }
};

/**
 * 从PDF文本中提取库存信息
 * @param {string} text PDF解析出的文本
 * @returns {Array} 提取的库存项列表
 */
const extractInventoryFromText = (text) => {
  const items = [];

  // 按行分割文本
  const lines = text.split("\n").filter((line) => line.trim());

  // 尝试匹配不同的发票格式
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // 格式1: 物料名称 规格 数量 单价 金额
    const match1 = line.match(
      /^(.+?)\s+(\S*?)\s+(\d+)\s+(\d+\.?\d*)\s+(\d+\.?\d*)$/
    );
    if (match1) {
      items.push({
        materialName: match1[1].trim(),
        specification: match1[2].trim(),
        quantity: parseInt(match1[3]),
        purchaseBatch: extractBatchFromText(text),
        sku: "",
      });
      continue;
    }

    // 格式2: 商品编码 商品名称 数量
    const match2 = line.match(/^(\S+)\s+(.+?)\s+(\d+)$/);
    if (match2) {
      items.push({
        materialName: match2[2].trim(),
        specification: "",
        quantity: parseInt(match2[3]),
        purchaseBatch: extractBatchFromText(text),
        sku: match2[1].trim(),
      });
      continue;
    }

    // 格式3: 只包含物料名称和数量
    const match3 = line.match(/^(.+?)\s+(\d+)$/);
    if (
      match3 &&
      !line.includes("元") &&
      !line.includes("￥") &&
      !line.includes("¥")
    ) {
      items.push({
        materialName: match3[1].trim(),
        specification: "",
        quantity: parseInt(match3[2]),
        purchaseBatch: extractBatchFromText(text),
        sku: "",
      });
    }
  }

  // 如果没有找到任何项目，尝试更宽松的匹配
  if (items.length === 0) {
    // 查找包含数字的行，可能是数量信息
    for (const line of lines) {
      const numbers = line.match(/\d+/g);
      if (numbers && numbers.length > 0) {
        // 提取可能的物料名称（数字前的文本）
        const textBeforeNumber = line
          .substring(0, line.indexOf(numbers[0]))
          .trim();
        if (textBeforeNumber.length > 2) {
          items.push({
            materialName: textBeforeNumber,
            specification: "",
            quantity: parseInt(numbers[0]),
            purchaseBatch: extractBatchFromText(text),
            sku: "",
          });
        }
      }
    }
  }

  return items;
};

/**
 * 从文本中提取采购批号
 * @param {string} text PDF文本
 * @returns {string} 采购批号
 */
const extractBatchFromText = (text) => {
  // 尝试匹配常见的批号格式
  const batchPatterns = [
    /批号[：:]\s*(\w+)/,
    /批次[：:]\s*(\w+)/,
    /采购批号[：:]\s*(\w+)/,
    /订单号[：:]\s*(\w+)/,
    /合同号[：:]\s*(\w+)/,
    /发票号[：:]\s*(\w+)/,
  ];

  for (const pattern of batchPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
  }

  // 如果没有找到批号，使用日期作为默认批号
  const dateMatch = text.match(/(\d{4}[-年]\d{1,2}[-月]\d{1,2}[日]?)/);
  if (dateMatch) {
    return dateMatch[1].replace(/[年月日]/g, "-").replace(/-$/, "");
  }

  // 生成默认批号
  return `BATCH-${new Date().toISOString().split("T")[0]}`;
};

/**
 * 验证解析出的库存项
 * @param {Array} items 库存项列表
 * @returns {Array} 验证后的库存项列表
 */
export const validateParsedItems = (items) => {
  return items.filter((item) => {
    // 过滤掉无效的项目
    return (
      item.materialName &&
      item.materialName.length > 1 &&
      item.quantity &&
      item.quantity > 0
    );
  });
};
