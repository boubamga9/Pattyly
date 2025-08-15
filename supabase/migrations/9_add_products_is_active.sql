-- Add is_active column to products table
ALTER TABLE products
ADD COLUMN is_active BOOLEAN DEFAULT TRUE;

-- Create index for better performance
CREATE INDEX idx_products_is_active ON products(is_active);

-- Update existing products to be active by default
UPDATE products SET is_active = TRUE WHERE is_active IS NULL; 