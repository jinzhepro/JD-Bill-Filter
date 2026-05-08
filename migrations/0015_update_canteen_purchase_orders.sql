-- 更新食堂采购单表结构
ALTER TABLE canteen_purchase_orders ADD COLUMN spec TEXT DEFAULT '';
ALTER TABLE canteen_purchase_orders ADD COLUMN tax_rate REAL DEFAULT 0;