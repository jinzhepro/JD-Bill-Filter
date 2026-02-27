/**
 * 文件验证工具函数
 * 用于验证文件类型、大小等
 */

/**
 * 验证文件扩展名是否有效
 * @param {string} fileName - 文件名
 * @returns {boolean} 是否有效
 * @throws {Error} 当文件名无效时抛出错误
 */
export function isValidFileExtension(fileName) {
  if (!fileName || typeof fileName !== "string") {
    throw new Error("文件名无效");
  }

  const lowerName = fileName.toLowerCase();
  const isValid =
    lowerName.endsWith(".xlsx") ||
    lowerName.endsWith(".xls") ||
    lowerName.endsWith(".csv");

  if (!isValid) {
    throw new Error(
      `不支持的文件格式：${fileName}。支持的格式：.xlsx, .xls, .csv`
    );
  }

  return true;
}

/**
 * 验证文件大小是否在限制范围内
 * @param {File} file - 文件对象
 * @param {number} maxSize - 最大文件大小（字节），默认 50MB
 * @returns {boolean} 是否有效
 * @throws {Error} 当文件大小超过限制时抛出错误
 */
export function isValidFileSize(file, maxSize = 50 * 1024 * 1024) {
  if (!file) {
    throw new Error("文件对象无效");
  }

  if (typeof file.size !== "number") {
    throw new Error("文件大小无效");
  }

  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(0);
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    throw new Error(
      `文件过大：${file.name} (${fileSizeMB}MB)。最大支持 ${maxSizeMB}MB`
    );
  }

  return true;
}
