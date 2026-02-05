import ExcelJS from "exceljs";
import {
  FILE_SIZE_LIMIT,
  VALID_FILE_TYPES,
  VALID_FILE_EXTENSIONS,
  NUMERIC_COLUMNS,
  PRODUCT_CODE_COLUMNS,
  EXPORT_NUMERIC_FORMAT,
  PRODUCT_CODE_FORMAT,
} from "./constants";
import { cleanProductCode, cleanAmount } from "./utils";
import { logger } from "./logger";

function getCellValue(cell) {
  const value = cell.value;
  
  if (value === null || value === undefined) {
    return "";
  }
  
  // 处理公式对象 { formula: '...', result: ... }
  if (typeof value === 'object' && 'result' in value) {
    return value.result;
  }
  
  // 处理日期对象
  if (value instanceof Date) {
    return value.toLocaleDateString('zh-CN');
  }
  
  return value;
}

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
          logger.error("CSV文件读取失败:", error);
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
                  let value = getCellValue(cell);
                  // 清理 Excel 自动添加的等号前缀
                  value = cleanProductCode(value);
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
            logger.error("Excel文件解析失败:", error);
            reject(new Error(`Excel文件解析失败: ${error.message}`));
          });
        } catch (error) {
          logger.error("Excel文件读取失败:", error);
          reject(new Error(`Excel文件读取失败: ${error.message}`));
        }
      };

      reader.onerror = function (error) {
        logger.error("Excel文件读取失败:", error);
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
          rowData[header] = getCellValue(cell);
        }
      });
      jsonData.push(rowData);
    });

    if (jsonData.length === 0) {
      throw new Error("CSV文件中没有数据");
    }

    resolve(jsonData);
} catch (error) {
      logger.error("CSV解析失败:", error);
      reject(new Error(`CSV解析失败: ${error.message}`));
    }
}

// 下载Excel文件
export async function downloadExcel(data, fileName, totals = null, dataChanges = null) {
  let url = null;
  let link = null;

  try {
    // 创建工作簿
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("处理结果");

    if (!data || data.length === 0) {
      throw new Error("没有数据可导出");
    }

    // 获取表头
    const headers = Object.keys(data[0]);

    // 列名映射：显示名称
    const columnMapping = {
      "应结金额": "货款",
      "净结金额": "收入",
    };

    // 映射后的表头
    const displayHeaders = headers.map((h) => columnMapping[h] || h);

    // 找到商品编码列的索引
    const productCodeColumnIndex = headers.findIndex((h) =>
      PRODUCT_CODE_COLUMNS.includes(h)
    );

    // 设置列属性（使用映射后的表头）
    worksheet.columns = displayHeaders.map((header) => ({
      header,
      key: header,
      width: 20,
    }));

    // 找到需要设置为数字格式的列索引
    const numericColumnIndices = NUMERIC_COLUMNS.map((colName) =>
      headers.indexOf(colName)
    ).filter((index) => index !== -1);

    // 在添加数据之前先设置商品编码列为文本格式
    if (productCodeColumnIndex !== -1) {
      const column = worksheet.getColumn(productCodeColumnIndex + 1);
      column.numFmt = "@";
      // 使用 type 设置为字符串类型
      column.type = "string";
    }

    // 设置数字列格式
    numericColumnIndices.forEach((colIndex) => {
      const column = worksheet.getColumn(colIndex + 1);
      column.numFmt = EXPORT_NUMERIC_FORMAT;
    });

    // 逐行添加数据，确保各列正确处理
    data.forEach((item) => {
      const rowValues = [];
      headers.forEach((header, index) => {
        const displayHeader = displayHeaders[index];
        let value = item[header];
        if (PRODUCT_CODE_COLUMNS.includes(header)) {
          value = String(value || "");
        } else if (NUMERIC_COLUMNS.includes(header)) {
          value = cleanAmount(value);
        }
        rowValues.push(value);
      });
      const row = worksheet.addRow(rowValues);
      // 设置数据行边框
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        };
      });
    });

    // 设置表头样式
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };
      cell.alignment = { horizontal: "center" };
      cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // 添加总计行
    if (totals && typeof totals === "object") {
      const totalRow = [];
      headers.forEach((header, index) => {
        const displayHeader = displayHeaders[index];
        if (header === "商品编号") {
          totalRow.push("总计");
        } else if (totals[header] !== undefined) {
          const value = cleanAmount(totals[header]);
          totalRow.push(value);
        } else {
          totalRow.push("");
        }
      });
      const totalRowObj = worksheet.addRow(totalRow);
      // 设置总计行样式
      totalRowObj.eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE0E0E0" },
        };
        cell.alignment = { horizontal: "right" };
        cell.border = {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        };
      });
      // 第一个单元格（总计文字）左对齐
      totalRowObj.getCell(1).alignment = { horizontal: "left" };
    }

    // 添加减去的数据行
    if (dataChanges && typeof dataChanges === "object" && Object.keys(dataChanges).length > 0) {
      // 添加空行
      worksheet.addRow([]);
      
      // 添加标题行
      const titleRow = worksheet.addRow(["下游开票记录"]);
      titleRow.eachCell((cell) => {
        cell.font = { bold: true, size: 12 };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE0E0E0" },
        };
        cell.alignment = { horizontal: "left" };
        cell.border = {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        };
      });
      // 合并单元格
      worksheet.mergeCells(titleRow.number, 1, titleRow.number, displayHeaders.length);

      // 添加减去的数据行
      Object.entries(dataChanges).forEach(([sku, change]) => {
        const { deducted } = change;
        const row = worksheet.addRow([
          sku,
          deducted.应结金额 || 0,
          deducted.数量 || 0,
          deducted.直营服务费 || 0,
        ]);
        row.eachCell((cell) => {
          cell.border = {
            top: { style: "thin" },
            bottom: { style: "thin" },
            left: { style: "thin" },
            right: { style: "thin" },
          };
          // 金额列右对齐
          if (cell.col > 2) {
            cell.alignment = { horizontal: "right" };
          }
        });
      });
    }

    // 添加空行
    worksheet.addRow([]);

    // 添加签字区域
    const signRow = worksheet.addRow(["经办人：", "", "审核人：", ""]);
    signRow.eachCell((cell) => {
      cell.font = { size: 11 };
      cell.alignment = { horizontal: "center", vertical: "bottom" };
    });
    // 合并单元格
    worksheet.mergeCells(signRow.number, 1, signRow.number, 2);
    worksheet.mergeCells(signRow.number, 3, signRow.number, 4);

    // 生成文件
    const buffer = await workbook.xlsx.writeBuffer();

    // 创建下载链接
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    url = URL.createObjectURL(blob);
    link = document.createElement("a");
    link.href = url;
    link.download = fileName;

    // 使用一次性事件监听器确保清理
    const cleanup = () => {
      requestAnimationFrame(() => {
        URL.revokeObjectURL(url);
        link?.remove();
      });
    };

    link.addEventListener("click", cleanup, { once: true });
    link.click();

    return true;
  } catch (error) {
    logger.error("下载过程中发生错误:", error);
    throw new Error(`文件下载失败: ${error.message}`);
  } finally {
    // 确保在任何情况下都清理资源
    if (url) {
      URL.revokeObjectURL(url);
    }
    if (link) {
      link.remove();
    }
  }
}

// 验证文件类型
export function validateFileType(file) {
  return (
    VALID_FILE_TYPES.includes(file.type) ||
    VALID_FILE_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))
  );
}

// 验证文件大小
export function validateFileSize(file) {
  return file.size <= FILE_SIZE_LIMIT;
}