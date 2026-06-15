#!/usr/bin/env node

/**
 * 初始化密码脚本
 * 用法: node scripts/init-password.mjs <密码> [--remote]
 */

import { execSync } from "child_process";
import { createHash } from "crypto";

const args = process.argv.slice(2);
const password = args[0];
const isRemote = args.includes("--remote");

if (!password) {
  console.error("请提供密码作为参数");
  console.error("用法: node scripts/init-password.mjs <密码> [--remote]");
  process.exit(1);
}

// 生成 SHA-256 哈希
const hash = createHash("sha256").update(password).digest("hex");

const flag = isRemote ? "--remote" : "--local";
const sql = `INSERT INTO auth_settings (id, password_hash) VALUES (1, '${hash}')
  ON CONFLICT(id) DO UPDATE SET password_hash = '${hash}', updated_at = datetime('now')`;

try {
  console.log(`正在${isRemote ? "远程" : "本地"}设置密码...`);
  execSync(`npx wrangler d1 execute jd ${flag} --command="${sql}"`, {
    stdio: "inherit",
  });
  console.log("密码设置成功！");
} catch (error) {
  console.error("密码设置失败:", error.message);
  process.exit(1);
}
