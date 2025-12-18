-- Migration: Add inspiration_photos column to orders table
-- This column will store an array of URLs for inspiration photos uploaded by clients

-- Add the inspiration_photos column to the orders table
ALTER TABLE orders 
ADD COLUMN inspiration_photos TEXT[] DEFAULT '{}';

-- Add a comment to document the column
COMMENT ON COLUMN orders.inspiration_photos IS 'Array of URLs to inspiration photos uploaded by clients for custom orders';

-- Create an index for better performance when querying orders with inspiration photos
CREATE INDEX idx_orders_inspiration_photos ON orders USING GIN (inspiration_photos) WHERE inspiration_photos IS NOT NULL AND array_length(inspiration_photos, 1) > 0;
