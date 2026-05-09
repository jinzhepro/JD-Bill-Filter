-- 删除食堂采购单表中的订单含税金额字段
ALTER TABLE canteen_purchase_orders DROP COLUMN order_amount_with_tax;