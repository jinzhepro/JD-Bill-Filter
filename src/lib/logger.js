/**
 * 统一日志工具
 * - 开发环境：输出完整日志到控制台
 * - 生产环境：仅输出 warn/error，且过滤敏感信息
 */

const isDev = process.env.NODE_ENV !== "production";

/**
 * 脱敏处理：移除可能的敏感信息
 * - 移除 token、password、cookie 等关键词附近的值
 * - 截断过长的错误堆栈
 */
function sanitize(msg) {
  if (typeof msg !== "string") return msg;
  // 隐藏 token/password 等敏感字段值
  return msg
    .replace(
      /(token|password|cookie|secret|authorization)[=:]\s*\S+/gi,
      "$1=***",
    )
    .slice(0, 2000); // 截断过长消息
}

function formatArgs(args) {
  return args.map((a) => {
    if (a instanceof Error) {
      return isDev ? a : sanitize(a.message);
    }
    if (typeof a === "string") return sanitize(a);
    return a;
  });
}

const logger = {
  error(...args) {
    console.error(...formatArgs(args));
  },

  warn(...args) {
    if (isDev) {
      console.warn(...formatArgs(args));
    }
  },

  info(...args) {
    if (isDev) {
      console.log(...formatArgs(args));
    }
  },

  debug(...args) {
    if (isDev) {
      console.log("[DEBUG]", ...formatArgs(args));
    }
  },
};

export default logger;
