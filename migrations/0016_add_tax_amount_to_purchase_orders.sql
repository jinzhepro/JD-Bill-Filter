-- 给食堂采购单表添加税额字段
ALTER TABLE canteen_purchase_orders ADD COLUMN tax_amount REAL DEFAULT 0;