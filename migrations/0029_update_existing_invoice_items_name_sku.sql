-- Migration number: 0029

UPDATE invoice_history_items 
SET name_sku = (
  SELECT REPLACE(product_name, ' ', '') || '_' || invoice_history_items.sku
  FROM product_mappings 
  WHERE product_mappings.sku = invoice_history_items.sku
)
WHERE sku IS NOT NULL 
  AND name_sku IS NULL
  AND EXISTS (
    SELECT 1 
    FROM product_mappings 
    WHERE product_mappings.sku = invoice_history_items.sku
  );