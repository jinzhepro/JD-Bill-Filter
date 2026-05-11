-- 删除订单相关字段
ALTER TABLE canteen_purchase_orders DROP COLUMN order_name;
ALTER TABLE canteen_purchase_orders DROP COLUMN amount_with_tax;
