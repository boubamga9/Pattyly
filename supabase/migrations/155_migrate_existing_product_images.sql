-- Migration: Migrate existing product images from products.image_url to product_images table
-- This preserves existing images while moving to the new multi-image system

-- Migrate existing images to product_images table
INSERT INTO product_images (product_id, image_url, display_order)
SELECT 
  id as product_id,
  image_url,
  0 as display_order
FROM products
WHERE image_url IS NOT NULL AND image_url != '';

-- Note: We keep image_url in products table for backward compatibility
-- It can be removed in a future migration if needed

