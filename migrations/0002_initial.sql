-- Migration number: 0002 	 2026-04-22T04:58:31.363Z

CREATE TABLE IF NOT EXISTS product_mappings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku TEXT NOT NULL UNIQUE,
  product_name TEXT NOT NULL,
  brand_name TEXT NOT NULL,
  spec TEXT,
  unit TEXT DEFAULT '箱',
  tax_rate REAL DEFAULT 0.13,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_product_mappings_sku ON product_mappings(sku);
CREATE INDEX IF NOT EXISTS idx_product_mappings_name ON product_mappings(product_name);