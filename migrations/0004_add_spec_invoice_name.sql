-- Migration number: 0004

ALTER TABLE product_mappings ADD COLUMN spec TEXT;
ALTER TABLE product_mappings ADD COLUMN invoice_name TEXT;