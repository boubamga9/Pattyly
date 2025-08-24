-- Add catalog_version column to shops table for cache invalidation
ALTER TABLE shops 
ADD COLUMN catalog_version INTEGER DEFAULT 1;

-- Add comment for documentation
COMMENT ON COLUMN shops.catalog_version IS 'Version number for catalog cache invalidation. Incremented when shop or products are modified.';

-- Create index for performance
CREATE INDEX idx_shops_catalog_version ON shops(catalog_version);
