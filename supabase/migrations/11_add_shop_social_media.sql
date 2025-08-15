-- Add social media fields to shops table
ALTER TABLE shops
ADD COLUMN instagram TEXT,
ADD COLUMN tiktok TEXT,
ADD COLUMN website TEXT;

-- Add comments for documentation
COMMENT ON COLUMN shops.instagram IS 'Shop Instagram handle (optional)';
COMMENT ON COLUMN shops.tiktok IS 'Shop TikTok handle (optional)';
COMMENT ON COLUMN shops.website IS 'Shop website URL (optional)'; 