/**
 * 日志工具 - 区分开发和生产环境
 * 在生产环境中移除 console.log 以提升性能和安全性
 */

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * 创建条件日志对象
 * @returns {Object} 日志对象
 */
function createLogger() {
  if (isDevelopment) {
    return {
      log: console.log.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      info: console.info.bind(console),
      debug: console.debug.bind(console),
    };
  }

  // 生产环境：只保留警告和错误，移除普通日志
  return {
    log: () => {}, // 移除普通日志
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    info: () => {}, // 移除信息日志（生产环境通常不需要）
    debug: () => {}, // 移除调试日志
  };
}

export const logger = createLogger();

export default logger;