-- 重建食堂采购单表，确保字段一致
DROP TABLE IF EXISTS canteen_purchase_orders;

CREATE TABLE IF NOT EXISTS canteen_purchase_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_no TEXT NOT NULL,
  product_name TEXT NOT NULL,
  spec TEXT DEFAULT '',
  unit TEXT DEFAULT '',
  quantity REAL NOT NULL,
  unit_price REAL NOT NULL,
  total_amount REAL NOT NULL,
  tax_rate REAL DEFAULT 0,
  tax_amount REAL DEFAULT 0,
  canteen_name TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_canteen_purchase_orders_batch ON canteen_purchase_orders(batch_no);
CREATE INDEX IF NOT EXISTS idx_canteen_purchase_orders_product ON canteen_purchase_orders(product_name);
CREATE INDEX IF NOT EXISTS idx_canteen_purchase_orders_canteen ON canteen_purchase_orders(canteen_name);