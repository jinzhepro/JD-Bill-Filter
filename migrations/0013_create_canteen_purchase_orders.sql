-- 食堂采购单表
CREATE TABLE IF NOT EXISTS canteen_purchase_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_no TEXT NOT NULL,
  product_name TEXT NOT NULL,
  unit TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit_price REAL NOT NULL,
  total_amount REAL NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_canteen_purchase_orders_batch ON canteen_purchase_orders(batch_no);
CREATE INDEX IF NOT EXISTS idx_canteen_purchase_orders_product ON canteen_purchase_orders(product_name);