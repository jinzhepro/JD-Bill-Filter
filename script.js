// 全局变量
let uploadedFile = null;
let originalData = [];
let processedData = [];
let uniqueProducts = [];
let productPrices = {};
let priceInputStatus = "pending"; // 'pending', 'inputting', 'completed'

// DOM元素
const uploadArea = document.getElementById("uploadArea");
const fileInput = document.getElementById("fileInput");
const uploadBtn = document.getElementById("uploadBtn");
const fileInfo = document.getElementById("fileInfo");
const fileName = document.getElementById("fileName");
const removeFileBtn = document.getElementById("removeFileBtn");
const controlSection = document.getElementById("controlSection");
const processBtn = document.getElementById("processBtn");
const resetBtn = document.getElementById("resetBtn");
const progressSection = document.getElementById("progressSection");
const progressFill = document.getElementById("progressFill");
const progressText = document.getElementById("progressText");
const logArea = document.getElementById("logArea");
const resultSection = document.getElementById("resultSection");
const resultStats = document.getElementById("resultStats");
const downloadBtn = document.getElementById("downloadBtn");
const previewBtn = document.getElementById("previewBtn");
const previewArea = document.getElementById("previewArea");
const previewTable = document.getElementById("previewTable");
const loadingOverlay = document.getElementById("loadingOverlay");
const errorModal = document.getElementById("errorModal");
const errorMessage = document.getElementById("errorMessage");
const modalCloseBtn = document.getElementById("modalCloseBtn");

// 商品单价相关DOM元素
const priceInputSection = document.getElementById("priceInputSection");
const priceProgressText = document.getElementById("priceProgressText");
const priceProgressFill = document.getElementById("priceProgressFill");
const priceInputTable = document.getElementById("priceInputTable");
const priceInputTableBody = document.getElementById("priceInputTableBody");
const batchPriceBtn = document.getElementById("batchPriceBtn");
const resetPriceBtn = document.getElementById("resetPriceBtn");
const confirmPriceBtn = document.getElementById("confirmPriceBtn");
const cancelPriceBtn = document.getElementById("cancelPriceBtn");
const batchPriceModal = document.getElementById("batchPriceModal");
const batchPriceInput = document.getElementById("batchPriceInput");
const batchPriceOverride = document.getElementById("batchPriceOverride");
const batchPriceConfirmBtn = document.getElementById("batchPriceConfirmBtn");
const batchPriceCancelBtn = document.getElementById("batchPriceCancelBtn");

// 初始化事件监听器
function initializeEventListeners() {
  console.log("Initializing event listeners...");
  console.log("downloadBtn:", downloadBtn);
  console.log("previewBtn:", previewBtn);

  // 文件上传相关事件
  uploadBtn.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", handleFileSelect);
  removeFileBtn.addEventListener("click", removeFile);

  // 拖拽上传事件
  uploadArea.addEventListener("dragover", handleDragOver);
  uploadArea.addEventListener("dragleave", handleDragLeave);
  uploadArea.addEventListener("drop", handleDrop);

  // 处理控制事件
  processBtn.addEventListener("click", processData);

  // 重置按钮事件（如果存在）
  if (resetBtn) {
    resetBtn.addEventListener("click", resetApplication);
  }

  // 结果操作事件
  downloadBtn.addEventListener("click", downloadResult);
  previewBtn.addEventListener("click", togglePreview);

  // 模态框事件
  modalCloseBtn.addEventListener("click", closeModal);
  errorModal.addEventListener("click", (e) => {
    if (e.target === errorModal) closeModal();
  });

  // 商品单价相关事件
  batchPriceBtn.addEventListener("click", showBatchPriceModal);
  resetPriceBtn.addEventListener("click", resetAllPrices);

  // confirmPriceBtn 在HTML中不存在，使用 processBtn 代替
  if (confirmPriceBtn) {
    confirmPriceBtn.addEventListener("click", confirmPrices);
  }

  cancelPriceBtn.addEventListener("click", cancelPriceInput);
  batchPriceConfirmBtn.addEventListener("click", applyBatchPrice);
  batchPriceCancelBtn.addEventListener("click", hideBatchPriceModal);
  batchPriceModal.addEventListener("click", (e) => {
    if (e.target === batchPriceModal) hideBatchPriceModal();
  });

  console.log("Event listeners initialized successfully");
}

// 文件选择处理
function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) {
    validateAndSetFile(file);
  }
}

// 拖拽处理
function handleDragOver(event) {
  event.preventDefault();
  uploadArea.classList.add("dragover");
}

function handleDragLeave(event) {
  event.preventDefault();
  uploadArea.classList.remove("dragover");
}

function handleDrop(event) {
  event.preventDefault();
  uploadArea.classList.remove("dragover");

  const files = event.dataTransfer.files;
  if (files.length > 0) {
    validateAndSetFile(files[0]);
  }
}

// 文件验证和设置
function validateAndSetFile(file) {
  // 检查文件类型
  const validTypes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
    "application/vnd.ms-excel", // .xls
    "text/csv", // .csv
    "application/csv", // .csv (某些MIME类型)
  ];

  if (
    !validTypes.includes(file.type) &&
    !file.name.match(/\.(xlsx|xls|csv)$/i)
  ) {
    showError("请选择有效的文件（.xlsx, .xls 或 .csv 格式）");
    return;
  }

  // 检查文件大小（限制为50MB）
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) {
    showError("文件大小不能超过50MB");
    return;
  }

  uploadedFile = file;
  displayFileInfo();
  showControlSection();
  addLog(`文件 "${file.name}" 上传成功`, "success");
}

// 显示文件信息
function displayFileInfo() {
  fileName.textContent = uploadedFile.name;
  fileInfo.style.display = "flex";
}

// 移除文件
function removeFile() {
  uploadedFile = null;
  originalData = [];
  processedData = [];
  uniqueProducts = [];
  productPrices = {};
  priceInputStatus = "pending";
  fileInfo.style.display = "none";

  // controlSection 可能为 null（如果HTML中不存在该元素）
  if (controlSection) {
    controlSection.style.display = "none";
  }

  progressSection.style.display = "none";
  priceInputSection.style.display = "none";
  resultSection.style.display = "none";
  previewArea.style.display = "none";
  fileInput.value = "";
  clearLog();
}

// 显示控制区域
function showControlSection() {
  // 不再显示控制区域，直接显示单价输入界面
  showPriceInputSection();
}

// 处理数据
async function processData() {
  if (!originalData || originalData.length === 0) {
    showError("没有可处理的数据，请重新上传文件");
    return;
  }

  try {
    // 首先收集单价数据（相当于调用 confirmPrices）
    console.log("收集单价数据...");
    collectProductPrices();

    if (Object.keys(productPrices).length === 0) {
      showError("请先为商品设置单价");
      return;
    }

    // 显示进度区域
    progressSection.style.display = "block";
    processBtn.disabled = true;
    clearLog();

    // 步骤1：按订单编号分组
    updateProgress(20, "正在按订单编号分组...");
    const groupedData = groupByOrderNumber(originalData);
    addLog(
      `按订单编号分组完成，共 ${Object.keys(groupedData).length} 个订单组`,
      "info"
    );

    // 步骤2：应用业务规则
    updateProgress(40, "正在应用业务规则...");
    processedData = applyBusinessRules(groupedData);
    addLog("业务规则处理完成", "success");

    // 步骤3：应用单价到数据
    updateProgress(60, "正在应用单价到数据...");
    console.log("应用单价前的 productPrices:", productPrices);
    processedData = applyUnitPrices(processedData, productPrices);
    console.log("应用单价后的 processedData 样本:", processedData.slice(0, 2));
    addLog("单价应用完成", "success");

    // 步骤4：生成统计信息
    updateProgress(80, "正在生成统计信息...");
    const stats = generateStatistics(originalData, processedData);
    displayStatistics(stats);
    addLog("统计信息生成完成", "success");

    // 步骤5：完成处理
    updateProgress(100, "处理完成！");
    addLog("所有数据处理完成", "success");

    // 显示结果区域
    setTimeout(() => {
      priceInputStatus = "completed";
      resultSection.style.display = "block";
      downloadBtn.disabled = false;
      processBtn.disabled = false;

      // 确保预览按钮也可用
      previewBtn.disabled = false;

      console.log("Processing completed - button states:");
      console.log("downloadBtn.disabled:", downloadBtn.disabled);
      console.log("previewBtn.disabled:", previewBtn.disabled);
      console.log("processedData.length:", processedData.length);

      addLog("处理完成，可以下载和预览数据", "success");
    }, 500);
  } catch (error) {
    addLog(`处理失败: ${error.message}`, "error");
    showError(`数据处理失败: ${error.message}`);
    processBtn.disabled = false;
  }
}

// 读取文件（支持Excel和CSV）
function readFile(file, fileType) {
  return new Promise((resolve, reject) => {
    // 检查XLSX库是否可用
    if (typeof XLSX === "undefined") {
      reject(new Error("XLSX库未加载，请刷新页面重试"));
      return;
    }

    const reader = new FileReader();

    reader.onload = function (e) {
      try {
        let jsonData;

        if (fileType === "csv") {
          // 处理CSV文件
          const csvText = e.target.result;
          const workbook = XLSX.read(csvText, { type: "string" });

          // 获取第一个工作表
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          // 转换为JSON格式
          jsonData = XLSX.utils.sheet_to_json(worksheet);

          if (jsonData.length === 0) {
            throw new Error("CSV文件中没有数据");
          }
        } else {
          // 处理Excel文件
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });

          // 获取第一个工作表
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          // 转换为JSON格式
          jsonData = XLSX.utils.sheet_to_json(worksheet);

          if (jsonData.length === 0) {
            throw new Error("Excel文件中没有数据");
          }
        }

        resolve(jsonData);
      } catch (error) {
        const fileTypeName = fileType === "csv" ? "CSV" : "Excel";
        reject(new Error(`${fileTypeName}文件解析失败: ${error.message}`));
      }
    };

    reader.onerror = function () {
      reject(new Error("文件读取失败"));
    };

    // 根据文件类型选择读取方式
    if (fileType === "csv") {
      reader.readAsText(file, "UTF-8");
    } else {
      reader.readAsArrayBuffer(file);
    }
  });
}

// 验证数据结构
function validateDataStructure(data) {
  if (data.length === 0) {
    throw new Error("数据为空");
  }

  const firstRow = data[0];
  const requiredColumns = [
    "订单编号",
    "单据类型",
    "费用项",
    "商品编号",
    "商品数量",
  ];

  for (const column of requiredColumns) {
    if (!(column in firstRow)) {
      throw new Error(`缺少必要的列: ${column}`);
    }
  }

  addLog("数据结构验证: 包含所有必要的列", "info");
}

// 按订单编号分组
function groupByOrderNumber(data) {
  const grouped = {};

  for (const row of data) {
    const orderNumber = row["订单编号"];
    if (!orderNumber) {
      addLog("发现空订单编号，跳过该行", "warning");
      continue;
    }

    if (!grouped[orderNumber]) {
      grouped[orderNumber] = [];
    }
    grouped[orderNumber].push(row);
  }

  return grouped;
}

// 应用业务规则
function applyBusinessRules(groupedData) {
  const result = [];
  let processedGroups = 0;
  let filteredGroups = 0;
  let filteredRows = 0;

  for (const [orderNumber, group] of Object.entries(groupedData)) {
    processedGroups++;

    // 获取该订单组的所有单据类型
    const documentTypes = group.map((row) => row["单据类型"]);
    const uniqueTypes = [...new Set(documentTypes)];

    // 检查是否包含取消退款单
    const hasRefund = uniqueTypes.includes("取消退款单");

    if (hasRefund) {
      // 如果包含取消退款单，过滤整个订单组
      addLog(
        `订单 ${orderNumber}: 包含取消退款单，过滤整个订单组 (${group.length} 行)`,
        "info"
      );
      filteredGroups++;
      filteredRows += group.length;
      continue;
    }

    // 检查是否全是订单
    const allOrders = uniqueTypes.length === 1 && uniqueTypes[0] === "订单";

    if (allOrders) {
      // 如果全是订单，过滤掉费用项为直营服务费的行
      const filteredGroup = group.filter(
        (row) => row["费用项"] !== "直营服务费"
      );
      const removedCount = group.length - filteredGroup.length;

      if (removedCount > 0) {
        addLog(
          `订单 ${orderNumber}: 过滤掉 ${removedCount} 行直营服务费`,
          "info"
        );
        filteredRows += removedCount;
      }

      result.push(...filteredGroup);
    } else {
      // 其他情况，保留所有行
      addLog(
        `订单 ${orderNumber}: 混合单据类型，保留所有行 (${group.length} 行)`,
        "info"
      );
      result.push(...group);
    }
  }

  addLog(
    `处理完成: 共处理 ${processedGroups} 个订单组，过滤 ${filteredGroups} 个订单组，过滤 ${filteredRows} 行数据`,
    "success"
  );

  return result;
}

// 生成统计信息
function generateStatistics(originalData, processedData) {
  const originalCount = originalData.length;
  const processedCount = processedData.length;
  const filteredCount = originalCount - processedCount;

  // 按订单编号统计
  const originalOrders = new Set(originalData.map((row) => row["订单编号"]))
    .size;
  const processedOrders = new Set(processedData.map((row) => row["订单编号"]))
    .size;

  // 按单据类型统计
  const originalTypes = {};
  const processedTypes = {};

  originalData.forEach((row) => {
    const type = row["单据类型"];
    originalTypes[type] = (originalTypes[type] || 0) + 1;
  });

  processedData.forEach((row) => {
    const type = row["单据类型"];
    processedTypes[type] = (processedTypes[type] || 0) + 1;
  });

  return {
    originalCount,
    processedCount,
    filteredCount,
    originalOrders,
    processedOrders,
    originalTypes,
    processedTypes,
    filterRate: ((filteredCount / originalCount) * 100).toFixed(2),
  };
}

// 显示统计信息
function displayStatistics(stats) {
  resultStats.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">原始数据行数:</span>
            <span class="stat-value">${stats.originalCount}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">处理后数据行数:</span>
            <span class="stat-value">${stats.processedCount}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">过滤数据行数:</span>
            <span class="stat-value">${stats.filteredCount}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">过滤率:</span>
            <span class="stat-value">${stats.filterRate}%</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">原始订单数:</span>
            <span class="stat-value">${stats.originalOrders}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">处理后订单数:</span>
            <span class="stat-value">${stats.processedOrders}</span>
        </div>
    `;
}

// 下载结果
function downloadResult() {
  console.log("downloadResult called");
  console.log("processedData.length:", processedData.length);
  console.log("downloadBtn.disabled:", downloadBtn.disabled);
  console.log("XLSX available:", typeof XLSX !== "undefined");

  if (processedData.length === 0) {
    showError("没有可下载的数据");
    return;
  }

  // 检查XLSX库是否可用
  if (typeof XLSX === "undefined") {
    console.error("XLSX库未加载");
    addLog("XLSX库未加载，无法下载文件", "error");
    showError("XLSX库未加载，请刷新页面重试");
    return;
  }

  try {
    console.log("开始创建Excel文件...");

    // 创建工作簿
    const workbook = XLSX.utils.book_new();
    console.log("工作簿创建成功");

    // 创建工作表
    const worksheet = XLSX.utils.json_to_sheet(processedData);
    console.log("工作表创建成功");

    // 设置商品编码列为文本格式，避免科学计数法
    const range = XLSX.utils.decode_range(worksheet["!ref"]);
    for (let col = 0; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      const headerCell = worksheet[cellAddress];
      if (headerCell && headerCell.v === "商品编码") {
        // 设置整列为文本格式
        for (let row = 1; row <= range.e.r; row++) {
          const dataCellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          const dataCell = worksheet[dataCellAddress];
          if (dataCell) {
            dataCell.t = "s"; // 设置为字符串类型
            dataCell.w = String(dataCell.v); // 设置显示格式
          }
        }
        break;
      }
    }

    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(workbook, worksheet, "处理结果");
    console.log("工作表添加到工作簿成功");

    // 生成简洁的文件名
    const originalName = uploadedFile.name.replace(/\.[^/.]+$/, "");
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const fileName = `${originalName}_已处理_${date}.xlsx`;
    console.log("文件名生成成功:", fileName);

    // 下载文件
    XLSX.writeFile(workbook, fileName);
    console.log("文件下载调用成功");

    addLog(`文件 "${fileName}" 下载成功`, "success");
  } catch (error) {
    console.error("下载过程中发生错误:", error);
    addLog(`下载失败: ${error.message}`, "error");
    showError(`文件下载失败: ${error.message}`);
  }
}

// 切换预览
function togglePreview() {
  console.log(
    "togglePreview called, previewArea.style.display:",
    previewArea.style.display
  );
  console.log("previewBtn.disabled:", previewBtn.disabled);
  console.log("processedData.length:", processedData.length);

  if (previewArea.style.display === "none") {
    showPreview();
    previewBtn.textContent = "隐藏预览";
  } else {
    previewArea.style.display = "none";
    previewBtn.textContent = "预览数据";
  }
}

// 显示预览
function showPreview() {
  if (processedData.length === 0) {
    showError("没有可预览的数据");
    return;
  }

  // 限制预览行数
  const previewData = processedData.slice(0, 100);

  // 创建表头
  const headers = Object.keys(previewData[0]);
  const headerRow = headers.map((header) => `<th>${header}</th>`).join("");

  // 创建数据行
  const dataRows = previewData
    .map((row) => {
      const cells = headers
        .map((header) => `<td>${row[header] || ""}</td>`)
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  // 设置表格HTML
  previewTable.innerHTML = `
        <thead>
            <tr>${headerRow}</tr>
        </thead>
        <tbody>
            ${dataRows}
        </tbody>
    `;

  previewArea.style.display = "block";

  if (processedData.length > 100) {
    addLog(`预览显示前100行，共${processedData.length}行数据`, "info");
  }
}

// 重置应用
function resetApplication() {
  removeFile();
  addLog("应用已重置", "info");
}

// 更新进度
function updateProgress(percent, text) {
  progressFill.style.width = `${percent}%`;
  progressText.textContent = text;
}

// 添加日志
function addLog(message, type = "info") {
  const timestamp = new Date().toLocaleTimeString();
  const logEntry = document.createElement("div");
  logEntry.className = `log-entry ${type}`;
  logEntry.textContent = `[${timestamp}] ${message}`;
  logArea.appendChild(logEntry);
  logArea.scrollTop = logArea.scrollHeight;
}

// 清空日志
function clearLog() {
  logArea.innerHTML = "";
}

// 显示错误
function showError(message) {
  errorMessage.textContent = message;
  errorModal.style.display = "flex";
}

// 关闭模态框
function closeModal() {
  errorModal.style.display = "none";
}

// 页面加载完成后初始化
document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM加载完成，开始初始化...");

  // 检查XLSX库是否加载
  if (typeof XLSX === "undefined") {
    console.error("XLSX库未加载");
    addLog("警告：XLSX库未加载，Excel功能将不可用", "error");
    showError("XLSX库加载失败，请刷新页面重试");
  } else {
    console.log("XLSX库加载成功");
    addLog("XLSX库加载成功", "success");
  }

  initializeEventListeners();
  addLog("京东万商对帐单处理系统已就绪", "success");
});

// 防止页面刷新时的数据丢失
window.addEventListener("beforeunload", function (e) {
  if (
    uploadedFile ||
    processedData.length > 0 ||
    priceInputStatus === "inputting"
  ) {
    e.preventDefault();
    e.returnValue = "您有未保存的处理结果，确定要离开吗？";
  }
});

// ========== 商品单价相关功能 ==========

// 提取唯一商品
function extractUniqueProducts(data) {
  const productMap = new Map();

  data.forEach((row) => {
    const productCode = row["商品编号"];
    const productName = row["商品名称"] || "";

    if (productCode && !productMap.has(productCode)) {
      productMap.set(productCode, {
        productCode,
        productName,
        unitPrice: null,
        status: "pending",
      });
    }
  });

  return Array.from(productMap.values());
}

// 显示商品单价输入界面
async function showPriceInputSection() {
  if (!uploadedFile) {
    showError("请先上传文件");
    return;
  }

  try {
    priceInputStatus = "inputting";
    priceInputSection.style.display = "block";
    progressSection.style.display = "none";

    addLog("正在读取文件并提取商品信息...", "info");

    // 读取文件
    const fileType = uploadedFile.name
      .match(/\.(xlsx|xls|csv)$/i)[1]
      .toLowerCase();
    const data = await readFile(uploadedFile, fileType);
    originalData = data;

    // 验证数据结构
    validateDataStructure(data);
    addLog("数据结构验证通过", "info");

    // 提取唯一商品
    uniqueProducts = extractUniqueProducts(data);
    addLog(`提取到 ${uniqueProducts.length} 个唯一商品`, "info");

    // 渲染单价输入表格
    renderPriceInputTable();
    updatePriceProgress();

    addLog("商品单价输入界面已显示，请设置单价", "success");
  } catch (error) {
    addLog(`读取文件失败: ${error.message}`, "error");
    showError(`文件读取失败: ${error.message}`);
    // 隐藏单价输入界面，回到文件上传状态
    priceInputSection.style.display = "none";
  }
}

// 渲染单价输入表格
function renderPriceInputTable() {
  priceInputTableBody.innerHTML = "";

  uniqueProducts.forEach((product, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${product.productCode}</td>
      <td>${product.productName}</td>
      <td class="price-input-cell">
        <input type="number"
               class="price-input-field"
               data-product-code="${product.productCode}"
               data-index="${index}"
               step="0.01"
               min="0"
               max="999999.99"
               placeholder="0.00"
               value="${product.unitPrice || ""}">
      </td>
      <td>
        <span class="price-status ${product.status}" id="status-${
      product.productCode
    }">
          ${getStatusText(product.status)}
        </span>
      </td>
    `;
    priceInputTableBody.appendChild(row);

    // 添加输入事件监听器
    const inputField = row.querySelector(".price-input-field");
    inputField.addEventListener("input", (e) =>
      handlePriceInput(e, product.productCode)
    );
    inputField.addEventListener("blur", (e) =>
      handlePriceBlur(e, product.productCode)
    );
  });
}

// 处理单价输入
function handlePriceInput(event, productCode) {
  const inputField = event.target;
  const value = inputField.value;

  if (value === "") {
    updateProductStatus(productCode, "pending");
    inputField.classList.remove("valid", "invalid");
  } else if (validateUnitPrice(value)) {
    updateProductStatus(productCode, "valid");
    inputField.classList.remove("invalid");
    inputField.classList.add("valid");
  } else {
    updateProductStatus(productCode, "invalid");
    inputField.classList.remove("valid");
    inputField.classList.add("invalid");
  }

  updatePriceProgress();
}

// 处理单价输入失焦
function handlePriceBlur(event, productCode) {
  const inputField = event.target;
  const value = inputField.value;

  if (value && !validateUnitPrice(value)) {
    showError("请输入有效的单价（0-999999.99）");
    inputField.focus();
  }
}

// 验证单价
function validateUnitPrice(price) {
  if (price === "" || price === null) return false;

  const numPrice = parseFloat(price);
  return !isNaN(numPrice) && numPrice >= 0 && numPrice <= 999999.99;
}

// 更新商品状态
function updateProductStatus(productCode, status) {
  const product = uniqueProducts.find((p) => p.productCode === productCode);
  if (product) {
    product.status = status;
    const statusElement = document.getElementById(`status-${productCode}`);
    if (statusElement) {
      statusElement.className = `price-status ${status}`;
      statusElement.textContent = getStatusText(status);
    }
  }
}

// 获取状态文本
function getStatusText(status) {
  const statusMap = {
    pending: "待输入",
    valid: "已输入",
    invalid: "格式错误",
  };
  return statusMap[status] || "未知";
}

// 更新单价进度
function updatePriceProgress() {
  const totalProducts = uniqueProducts.length;
  const validProducts = uniqueProducts.filter(
    (p) => p.status === "valid"
  ).length;
  const progressPercent =
    totalProducts > 0 ? (validProducts / totalProducts) * 100 : 0;

  priceProgressText.textContent = `${validProducts}/${totalProducts} 商品已设置单价`;
  priceProgressFill.style.width = `${progressPercent}%`;

  // 更新确认按钮状态
  processBtn.disabled = validProducts !== totalProducts;
}

// 显示批量设置单价模态框
function showBatchPriceModal() {
  batchPriceModal.style.display = "flex";
  batchPriceInput.value = "";
  batchPriceOverride.checked = false;
  batchPriceInput.focus();
}

// 隐藏批量设置单价模态框
function hideBatchPriceModal() {
  batchPriceModal.style.display = "none";
}

// 应用批量单价
function applyBatchPrice() {
  const batchPrice = batchPriceInput.value;
  const override = batchPriceOverride.checked;

  if (!batchPrice) {
    showError("请输入单价");
    return;
  }

  if (!validateUnitPrice(batchPrice)) {
    showError("请输入有效的单价（0-999999.99）");
    return;
  }

  const numPrice = parseFloat(batchPrice);
  let updatedCount = 0;

  uniqueProducts.forEach((product) => {
    if (override || product.status !== "valid") {
      const inputField = document.querySelector(
        `[data-product-code="${product.productCode}"]`
      );
      if (inputField) {
        inputField.value = numPrice.toFixed(2);
        inputField.classList.remove("invalid");
        inputField.classList.add("valid");
        updateProductStatus(product.productCode, "valid");
        updatedCount++;
      }
    }
  });

  hideBatchPriceModal();
  updatePriceProgress();
  addLog(`批量设置单价完成，更新了 ${updatedCount} 个商品`, "success");
}

// 重置所有单价
function resetAllPrices() {
  if (!confirm("确定要重置所有商品的单价吗？")) {
    return;
  }

  uniqueProducts.forEach((product) => {
    const inputField = document.querySelector(
      `[data-product-code="${product.productCode}"]`
    );
    if (inputField) {
      inputField.value = "";
      inputField.classList.remove("valid", "invalid");
      updateProductStatus(product.productCode, "pending");
    }
  });

  updatePriceProgress();
  addLog("所有商品单价已重置", "info");
}

// 收集单价数据
function collectProductPrices() {
  // 收集所有单价数据
  productPrices = {};
  uniqueProducts.forEach((product) => {
    const inputField = document.querySelector(
      `[data-product-code="${product.productCode}"]`
    );
    if (inputField && inputField.value) {
      productPrices[product.productCode] = {
        productCode: product.productCode,
        productName: product.productName,
        unitPrice: parseFloat(inputField.value),
      };
    }
  });

  console.log("收集到的单价数据:", productPrices);
  addLog(
    `单价设置完成，共为 ${Object.keys(productPrices).length} 个商品设置了单价`,
    "success"
  );
}

// 确认单价设置
function confirmPrices() {
  // 收集所有单价数据
  collectProductPrices();

  addLog("开始数据处理...", "info");

  // 隐藏单价输入界面，显示进度区域
  priceInputSection.style.display = "none";
  progressSection.style.display = "block";

  // 开始数据处理
  processData();
}

// 取消单价输入
function cancelPriceInput() {
  if (!confirm("确定要取消单价输入吗？这将返回到数据处理结果。")) {
    return;
  }

  priceInputStatus = "pending";
  priceInputSection.style.display = "none";
  resultSection.style.display = "block";
  downloadBtn.disabled = false;

  addLog("已取消单价输入", "info");
}

// 应用单价到数据行
function applyUnitPrices(data, productPrices) {
  return data.map((row) => {
    const productCode = row["商品编号"];
    const productName = row["商品名称"] || "";
    const priceInfo = productPrices[productCode];
    const unitPrice = priceInfo ? priceInfo.unitPrice : null;
    const quantity = parseFloat(row["商品数量"]) || 0;

    // 计算总价
    const totalPrice = unitPrice !== null ? unitPrice * quantity : null;

    // 返回简化的数据结构：商品名、商品编码、单价、数量、总价
    // 将商品编码转换为字符串以避免Excel中的科学计数法
    return {
      商品名: productName,
      商品编码: String(productCode),
      单价: unitPrice,
      数量: quantity,
      总价: totalPrice,
    };
  });
}
