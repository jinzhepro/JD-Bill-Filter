-- 食堂供应商管理表
CREATE TABLE IF NOT EXISTS canteen_suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  contract_no TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建唯一索引，确保供应商名称不重复
CREATE UNIQUE INDEX IF NOT EXISTS idx_canteen_suppliers_name ON canteen_suppliers(name);