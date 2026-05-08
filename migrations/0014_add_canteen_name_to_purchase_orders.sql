-- 给食堂采购单表添加食堂名称字段
ALTER TABLE canteen_purchase_orders ADD COLUMN canteen_name TEXT DEFAULT '';