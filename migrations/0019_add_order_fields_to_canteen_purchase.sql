-- 删除单独的订单表
DROP TABLE IF EXISTS canteen_order_items;

-- 给食堂采购单表添加订单相关字段
ALTER TABLE canteen_purchase_orders ADD COLUMN order_name TEXT DEFAULT '';
ALTER TABLE canteen_purchase_orders ADD COLUMN order_amount_with_tax REAL DEFAULT 0;