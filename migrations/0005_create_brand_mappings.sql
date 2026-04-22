-- Migration number: 0005

CREATE TABLE IF NOT EXISTS brand_mappings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  brand_keywords TEXT NOT NULL,
  invoice_name TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_brand_mappings_keywords ON brand_mappings(brand_keywords);