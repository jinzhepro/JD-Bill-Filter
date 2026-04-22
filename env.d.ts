interface CloudflareEnv {
  DB: D1Database;
}

declare global {
  interface ProcessEnv extends CloudflareEnv {}
}

export {};