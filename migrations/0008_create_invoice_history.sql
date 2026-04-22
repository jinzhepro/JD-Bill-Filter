-- Migration number: 0008

CREATE TABLE IF NOT EXISTS invoice_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  export_date TEXT NOT NULL,
  invoice_date TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  tax_id TEXT NOT NULL,
  bank_name TEXT,
  bank_account TEXT,
  address TEXT,
  phone TEXT,
  total_amount REAL NOT NULL,
  items_count INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS invoice_history_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  history_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  spec TEXT,
  unit TEXT,
  quantity REAL NOT NULL,
  price REAL NOT NULL,
  tax_rate REAL NOT NULL,
  amount REAL NOT NULL,
  tax REAL NOT NULL,
  total REAL NOT NULL,
  FOREIGN KEY (history_id) REFERENCES invoice_history(id)
);

CREATE INDEX IF NOT EXISTS idx_invoice_history_date ON invoice_history(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoice_history_items_history ON invoice_history_items(history_id);