-- 重新添加含税金额字段
ALTER TABLE canteen_purchase_orders ADD COLUMN amount_with_tax REAL DEFAULT 0;
