/**
 * 文件验证工具函数
 * 用于验证文件类型、大小等
 */

/**
 * 验证文件扩展名是否有效
 * @param {string} fileName - 文件名
 * @returns {boolean} 是否有效
 */
export function isValidFileExtension(fileName) {
  if (!fileName || typeof fileName !== "string") return false;
  const lowerName = fileName.toLowerCase();
  return (
    lowerName.endsWith(".xlsx") ||
    lowerName.endsWith(".xls") ||
    lowerName.endsWith(".csv")
  );
}

/**
 * 验证文件大小是否在限制范围内
 * @param {File} file - 文件对象
 * @param {number} maxSize - 最大文件大小（字节），默认 50MB
 * @returns {boolean} 是否有效
 */
export function isValidFileSize(file, maxSize = 50 * 1024 * 1024) {
  if (!file) return false;
  return file.size <= maxSize;
}

/**
 * 从文件名中提取文件类型
 * @param {string} fileName - 文件名
 * @returns {string|null} 文件类型（xlsx/xls/csv）或 null
 */
export function getFileType(fileName) {
  if (!fileName || typeof fileName !== "string") return null;
  const match = fileName.match(/\.(xlsx|xls|csv)$/i);
  return match ? match[1].toLowerCase() : null;
}

/**
 * 过滤有效文件
 * @param {File[]} files - 文件数组
 * @returns {File[]} 有效的文件数组
 */
export function filterValidFiles(files) {
  if (!Array.isArray(files)) return [];
  return files.filter((file) => isValidFileExtension(file.name));
}

/**
 * 生成文件唯一标识
 * @param {File} file - 文件对象
 * @returns {string} 文件唯一标识
 */
export function getFileKey(file) {
  if (!file) return "";
  return `${file.name}-${file.size}`;
}