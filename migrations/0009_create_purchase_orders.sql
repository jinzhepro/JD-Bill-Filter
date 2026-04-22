-- Migration number: 0009

CREATE TABLE IF NOT EXISTS purchase_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_no TEXT NOT NULL,
  sku TEXT NOT NULL,
  product_name TEXT NOT NULL,
  tax_rate REAL NOT NULL,
  quantity REAL NOT NULL,
  unit_price REAL NOT NULL,
  total_amount REAL NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_batch ON purchase_orders(batch_no);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_sku ON purchase_orders(sku);