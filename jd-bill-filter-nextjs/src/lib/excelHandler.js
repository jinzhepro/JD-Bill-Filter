import * as XLSX from "xlsx";

// 读取文件（支持Excel和CSV）
export function readFile(file, fileType) {
  return new Promise((resolve, reject) => {
    console.log("=== 文件读取开始 ===");
    console.log("文件名:", file.name);
    console.log("文件类型:", fileType);
    console.log("文件大小:", file.size, "字节");
    console.log("文件MIME类型:", file.type);

    // 检查XLSX库是否可用
    if (typeof XLSX === "undefined") {
      reject(new Error("XLSX库未加载，请刷新页面重试"));
      return;
    }

    if (fileType === "csv") {
      // 对于CSV文件，先尝试UTF-8，如果失败再尝试GBK
      console.log("使用UTF-8编码读取CSV文件");
      const reader = new FileReader();

      reader.onload = function (e) {
        try {
          const csvText = e?.target?.result;
          console.log("CSV文本长度:", csvText.length);
          console.log("CSV前100个字符:", csvText.substring(0, 100));

          // 检查编码问题
          const hasChinese = /[\u4e00-\u9fa5]/.test(csvText);
          console.log("CSV包含中文字符:", hasChinese);

          if (!hasChinese && csvText.length > 0) {
            console.log("检测到可能的编码问题，尝试GBK编码...");
            // 尝试使用GBK编码重新读取
            tryReadFileWithGBK(file)
              .then((gbkText) => {
                if (gbkText && /[\u4e00-\u9fa5]/.test(gbkText)) {
                  console.log("GBK编码读取成功，包含中文字符");
                  parseCSVText(gbkText, resolve, reject);
                } else {
                  console.log("GBK编码也失败，使用原始文本");
                  parseCSVText(csvText, resolve, reject);
                }
              })
              .catch((error) => {
                console.log("GBK编码读取失败，使用原始文本:", error);
                parseCSVText(csvText, resolve, reject);
              });
          } else {
            parseCSVText(csvText, resolve, reject);
          }
        } catch (error) {
          console.error("CSV文件读取失败:", error);
          reject(new Error(`CSV文件读取失败: ${error.message}`));
        }
      };

      reader.onerror = function () {
        reject(new Error("CSV文件读取失败"));
      };

      reader.readAsText(file, "UTF-8");
    } else {
      // 处理Excel文件
      const reader = new FileReader();

      reader.onload = function (e) {
        try {
          console.log("文件读取完成，开始解析Excel文件...");
          const data = new Uint8Array(e?.target?.result || new ArrayBuffer(0));
          console.log("Excel数据长度:", data.length);

          const workbook = XLSX.read(data, { type: "array" });
          console.log(
            "工作簿解析完成，工作表数量:",
            workbook.SheetNames.length
          );
          console.log("工作表名称:", workbook.SheetNames);

          // 获取第一个工作表
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          console.log("使用工作表:", firstSheetName);

          // 转换为JSON格式
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          console.log("Excel转换为JSON完成，行数:", jsonData.length);

          if (jsonData.length === 0) {
            throw new Error("Excel文件中没有数据");
          }

          console.log("文件解析成功，返回数据");
          console.log("=== 文件读取完成 ===");
          resolve(jsonData);
        } catch (error) {
          console.error("Excel文件解析失败:", error);
          reject(new Error(`Excel文件解析失败: ${error.message}`));
        }
      };

      reader.onerror = function (error) {
        console.error("Excel文件读取失败:", error);
        reject(new Error("Excel文件读取失败"));
      };

      console.log("使用ArrayBuffer读取Excel文件");
      reader.readAsArrayBuffer(file);
    }
  });
}

// 尝试使用GBK编码读取文件
function tryReadFileWithGBK(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = function (e) {
      try {
        // 使用TextDecoder尝试GBK解码
        const buffer = e?.target?.result || new ArrayBuffer(0);
        const decoder = new TextDecoder("gbk", { fatal: false });
        const gbkText = decoder.decode(buffer);
        resolve(gbkText);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = function () {
      reject(new Error("GBK编码读取失败"));
    };

    reader.readAsArrayBuffer(file);
  });
}

// 解析CSV文本
function parseCSVText(csvText, resolve, reject) {
  try {
    console.log("开始解析CSV文本...");
    const workbook = XLSX.read(csvText, { type: "string" });
    console.log("工作簿解析完成，工作表数量:", workbook.SheetNames.length);
    console.log("工作表名称:", workbook.SheetNames);

    // 获取第一个工作表
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    console.log("使用工作表:", firstSheetName);

    // 转换为JSON格式
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    console.log("CSV转换为JSON完成，行数:", jsonData.length);

    if (jsonData.length === 0) {
      throw new Error("CSV文件中没有数据");
    }

    console.log("文件解析成功，返回数据");
    console.log("=== 文件读取完成 ===");
    resolve(jsonData);
  } catch (error) {
    console.error("CSV解析失败:", error);
    reject(new Error(`CSV文件解析失败: ${error.message}`));
  }
}

// 下载Excel文件
export function downloadExcel(data, fileName) {
  try {
    console.log("开始创建Excel文件...");

    // 创建工作簿
    const workbook = XLSX.utils.book_new();
    console.log("工作簿创建成功");

    // 创建工作表
    const worksheet = XLSX.utils.json_to_sheet(data);
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

    // 下载文件
    XLSX.writeFile(workbook, fileName);
    console.log("文件下载调用成功");

    return true;
  } catch (error) {
    console.error("下载过程中发生错误:", error);
    throw new Error(`文件下载失败: ${error.message}`);
  }
}

// 验证文件类型
export function validateFileType(file) {
  const validTypes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
    "application/vnd.ms-excel", // .xls
    "text/csv", // .csv
    "application/csv", // .csv (某些MIME类型)
  ];

  return (
    validTypes.includes(file.type) || file.name.match(/\.(xlsx|xls|csv)$/i)
  );
}

// 验证文件大小
export function validateFileSize(file, maxSize = 50 * 1024 * 1024) {
  return file.size <= maxSize;
}
