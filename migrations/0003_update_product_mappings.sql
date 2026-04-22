-- Migration number: 0003

CREATE TABLE IF NOT EXISTS product_mappings_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku TEXT NOT NULL UNIQUE,
  product_name TEXT NOT NULL,
  warehouse TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

INSERT INTO product_mappings_new (id, sku, product_name, created_at, updated_at)
SELECT id, sku, product_name, created_at, updated_at FROM product_mappings;

DROP TABLE product_mappings;

ALTER TABLE product_mappings_new RENAME TO product_mappings;

CREATE INDEX IF NOT EXISTS idx_product_mappings_sku ON product_mappings(sku);
CREATE INDEX IF NOT EXISTS idx_product_mappings_name ON product_mappings(product_name);