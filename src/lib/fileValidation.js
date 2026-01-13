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
      `不支持的文件格式: ${fileName}。支持的格式: .xlsx, .xls, .csv`
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
      `文件过大: ${file.name} (${fileSizeMB}MB)。最大支持 ${maxSizeMB}MB`
    );
  }

  return true;
}

/**
 * 从文件名中提取文件类型
 * @param {string} fileName - 文件名
 * @returns {string} 文件类型（xlsx/xls/csv）
 * @throws {Error} 当无法提取文件类型时抛出错误
 */
export function getFileType(fileName) {
  if (!fileName || typeof fileName !== "string") {
    throw new Error("文件名无效");
  }

  const match = fileName.match(/\.(xlsx|xls|csv)$/i);
  if (!match) {
    throw new Error(
      `无法从文件名提取文件类型: ${fileName}。支持的格式: .xlsx, .xls, .csv`
    );
  }

  return match[1].toLowerCase();
}

/**
 * 过滤有效文件
 * @param {File[]} files - 文件数组
 * @returns {File[]} 有效的文件数组
 * @throws {Error} 当输入不是数组时抛出错误
 */
export function filterValidFiles(files) {
  if (!Array.isArray(files)) {
    throw new Error("输入必须是文件数组");
  }

  return files.filter((file) => {
    try {
      isValidFileExtension(file.name);
      return true;
    } catch (error) {
      console.warn(`跳过无效文件: ${file.name} - ${error.message}`);
      return false;
    }
  });
}

/**
 * 生成文件唯一标识
 * @param {File} file - 文件对象
 * @returns {string} 文件唯一标识
 * @throws {Error} 当文件对象无效时抛出错误
 */
export function getFileKey(file) {
  if (!file) {
    throw new Error("文件对象无效");
  }

  if (!file.name || typeof file.size !== "number") {
    throw new Error("文件信息不完整");
  }

  return `${file.name}-${file.size}`;
}

/**
 * 综合验证文件
 * @param {File} file - 文件对象
 * @param {number} maxSize - 最大文件大小（字节），默认 50MB
 * @returns {boolean} 验证通过
 * @throws {Error} 当验证失败时抛出详细错误信息
 */
export function validateFile(file, maxSize = 50 * 1024 * 1024) {
  if (!file) {
    throw new Error("文件不能为空");
  }

  isValidFileExtension(file.name);
  isValidFileSize(file, maxSize);

  return true;
}