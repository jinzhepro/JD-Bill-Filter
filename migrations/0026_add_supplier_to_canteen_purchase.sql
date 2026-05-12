-- 给食堂采购单表添加供应商关联字段
ALTER TABLE canteen_purchase_orders ADD COLUMN supplier_id INTEGER;

-- 创建索引，便于按供应商查询
CREATE INDEX IF NOT EXISTS idx_canteen_purchase_orders_supplier ON canteen_purchase_orders(supplier_id);