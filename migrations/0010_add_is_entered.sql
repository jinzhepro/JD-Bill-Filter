-- Migration number: 0010

ALTER TABLE purchase_orders ADD COLUMN is_entered INTEGER DEFAULT 0;