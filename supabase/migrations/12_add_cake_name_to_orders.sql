-- Add cake name to orders table to preserve order history when products are deleted
ALTER TABLE orders
ADD COLUMN cake_name TEXT;

-- Add comment for documentation
COMMENT ON COLUMN orders.cake_name IS 'Name of the cake at the time of order (preserved when product is deleted)';

-- Update existing orders to have cake_name from related products
UPDATE orders 
SET cake_name = (
    SELECT p.name 
    FROM products p 
    WHERE p.id = orders.product_id
)
WHERE cake_name IS NULL AND product_id IS NOT NULL; 