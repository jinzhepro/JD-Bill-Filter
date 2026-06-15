/**
 * 认证相关工具函数
 */

// 对密码进行 SHA-256 哈希
export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// 生成随机token
export function generateToken() {
  const array = new Uint8Array(32);
  globalThis.crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

// 验证密码
export async function verifyPassword(password, hash) {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

// 从数据库获取认证设置
export async function getAuthSettings(db) {
  return await db.prepare("SELECT * FROM auth_settings WHERE id = 1").first();
}

// 从数据库获取密码哈希
export async function getPasswordHash(db) {
  const result = await getAuthSettings(db);
  return result?.password_hash || null;
}

// 初始化或更新密码
export async function setPassword(db, password) {
  const hash = await hashPassword(password);
  await db
    .prepare(
      `INSERT INTO auth_settings (id, password_hash, updated_at)
       VALUES (1, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET password_hash = ?, updated_at = datetime('now')`,
    )
    .bind(hash, hash)
    .run();
  return hash;
}

// 创建session token
export async function createSession(db) {
  const token = generateToken();
  const expiresAt = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 30天

  await db
    .prepare(
      `UPDATE auth_settings SET session_token = ?, token_expires_at = ?, updated_at = datetime('now') WHERE id = 1`,
    )
    .bind(token, expiresAt)
    .run();

  return token;
}

// 验证session token
export async function validateSession(db, token) {
  if (!token) return false;

  const settings = await getAuthSettings(db);
  if (!settings?.session_token) return false;

  // 检查token是否匹配且未过期
  const isValid =
    settings.session_token === token &&
    settings.token_expires_at &&
    new Date(settings.token_expires_at) > new Date();

  return isValid;
}

// 清除session
export async function clearSession(db) {
  await db
    .prepare(
      `UPDATE auth_settings SET session_token = NULL, token_expires_at = NULL, updated_at = datetime('now') WHERE id = 1`,
    )
    .run();
}
