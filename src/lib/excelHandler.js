import ExcelJS from "exceljs";

// 读取文件（支持Excel和CSV）
export function readFile(file, fileType) {
  return new Promise((resolve, reject) => {
    if (fileType === "csv") {
      // 对于CSV文件，先尝试UTF-8，如果失败再尝试GBK
      const reader = new FileReader();

      reader.onload = function (e) {
        try {
          const csvText = e?.target?.result;

          // 检查编码问题
          const hasChinese = /[\u4e00-\u9fa5]/.test(csvText);

          if (!hasChinese && csvText.length > 0) {
            // 尝试使用GBK编码重新读取
            tryReadFileWithGBK(file)
              .then((gbkText) => {
                if (gbkText && /[\u4e00-\u9fa5]/.test(gbkText)) {
                  parseCSVText(gbkText, resolve, reject);
                } else {
                  parseCSVText(csvText, resolve, reject);
                }
              })
              .catch((error) => {
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
          const arrayBuffer = e?.target?.result || new ArrayBuffer(0);

          const workbook = new ExcelJS.Workbook();
          workbook.xlsx.load(arrayBuffer).then(() => {
            // 获取第一个工作表
            const worksheet = workbook.worksheets[0];

            if (!worksheet) {
              throw new Error("Excel文件中没有工作表");
            }

            // 转换为JSON格式
            const jsonData = [];
            const headerRow = worksheet.getRow(1);
            const headers = [];

            // 读取表头
            headerRow.eachCell((cell, colNumber) => {
              headers[colNumber - 1] = cell.value;
            });

            // 读取数据行
            worksheet.eachRow((row, rowNumber) => {
              if (rowNumber === 1) return; // 跳过表头

              const rowData = {};
              row.eachCell((cell, colNumber) => {
                const header = headers[colNumber - 1];
                if (header) {
                  let value = cell.value;
                  // 清理 Excel 自动添加的等号前缀
                  if (typeof value === 'string' && value.startsWith('=') && value.includes('"')) {
                    // 匹配格式: ="123456" 或 ="数字"
                    const match = value.match(/^="([^"]+)"$/);
                    if (match) {
                      value = match[1];
                    }
                  }
                  rowData[header] = value;
                }
              });
              jsonData.push(rowData);
            });

            if (jsonData.length === 0) {
              throw new Error("Excel文件中没有数据");
            }

            resolve(jsonData);
          }).catch((error) => {
            console.error("Excel文件解析失败:", error);
            reject(new Error(`Excel文件解析失败: ${error.message}`));
          });
        } catch (error) {
          console.error("Excel文件读取失败:", error);
          reject(new Error(`Excel文件读取失败: ${error.message}`));
        }
      };

      reader.onerror = function (error) {
        console.error("Excel文件读取失败:", error);
        reject(new Error("Excel文件读取失败"));
      };

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
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Data");

    // 解析CSV文本
    const lines = csvText.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length === 0) {
      throw new Error("CSV文件中没有数据");
    }

    // 添加数据到工作表
    lines.forEach((line, index) => {
      const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((v) => {
        // 移除引号
        let value = v.trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1).replace(/""/g, '"');
        }
        return value;
      });

      const row = worksheet.addRow(values);
    });

    // 转换为JSON格式
    const jsonData = [];
    const headerRow = worksheet.getRow(1);
    const headers = headerRow.values;

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // 跳过表头

      const rowData = {};
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber];
        if (header) {
          rowData[header] = cell.value;
        }
      });
      jsonData.push(rowData);
    });

    if (jsonData.length === 0) {
      throw new Error("CSV文件中没有数据");
    }

    resolve(jsonData);
  } catch (error) {
    console.error("CSV解析失败:", error);
    reject(new Error(`CSV解析失败: ${error.message}`));
  }
}

// 下载Excel文件
export async function downloadExcel(data, fileName) {
  try {
    // 创建工作簿
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("处理结果");

    if (!data || data.length === 0) {
      throw new Error("没有数据可导出");
    }

    // 获取表头
    const headers = Object.keys(data[0]);

    // 找到商品编码列的索引
    const productCodeColumnIndex = headers.findIndex(
      (h) => h === "商品编码" || h === "商品编号"
    );

    // 设置列属性
    worksheet.columns = headers.map((header) => ({
      header,
      key: header,
      width: 20,
    }));

    // 找到需要设置为数字格式的列索引
    const numericColumns = ["商品数量", "单价", "总价"];
    const numericColumnIndices = numericColumns
      .map((colName) => headers.indexOf(colName))
      .filter((index) => index !== -1);

    // 在添加数据之前设置列格式
    if (productCodeColumnIndex !== -1) {
      const column = worksheet.getColumn(productCodeColumnIndex + 1);
      column.numFmt = '@'; // '@' 表示文本格式
    }

    // 设置数字列格式
    numericColumnIndices.forEach((colIndex) => {
      const column = worksheet.getColumn(colIndex + 1);
      column.numFmt = '0.00'; // 保留两位小数的数字格式
    });

    // 逐行添加数据，确保各列正确处理
    data.forEach((item) => {
      const rowValues = [];
      headers.forEach((header) => {
        let value = item[header];
        // 如果是商品编码列，确保是字符串类型
        if (header === "商品编码" || header === "商品编号") {
          value = String(value || "");
        }
        // 如果是数字列，转换为数字类型
        else if (numericColumns.includes(header)) {
          // 移除货币符号和其他非数字字符
          if (typeof value === 'string') {
            value = value.replace(/[¥￥$,\s]/g, '');
          }
          value = parseFloat(value) || 0;
        }
        rowValues.push(value);
      });
      worksheet.addRow(rowValues);
    });

    // 再次强制设置商品编码列每个单元格的格式
    if (productCodeColumnIndex !== -1) {
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // 跳过表头
        const cell = row.getCell(productCodeColumnIndex + 1);
        const value = String(data[rowNumber - 2][headers[productCodeColumnIndex]] || "");
        // 强制设置为字符串值
        cell.value = value;
      });
    }

    // 生成文件
    const buffer = await workbook.xlsx.writeBuffer();

    // 创建下载链接
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);

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