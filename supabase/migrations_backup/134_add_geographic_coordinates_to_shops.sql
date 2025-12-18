-- Migration: Add geographic coordinates (latitude/longitude) to shops table
-- This enables server-side geographic filtering and distance calculations

-- Add latitude and longitude columns
ALTER TABLE shops
ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 8),
ADD COLUMN IF NOT EXISTS longitude NUMERIC(11, 8);

-- Add constraints for valid coordinates
ALTER TABLE shops
ADD CONSTRAINT shops_latitude_check CHECK (
    latitude IS NULL OR (latitude >= -90 AND latitude <= 90)
),
ADD CONSTRAINT shops_longitude_check CHECK (
    longitude IS NULL OR (longitude >= -180 AND longitude <= 180)
);

-- Add comments for documentation
COMMENT ON COLUMN shops.latitude IS 'Latitude GPS (WGS84) pour le filtrage géographique';
COMMENT ON COLUMN shops.longitude IS 'Longitude GPS (WGS84) pour le filtrage géographique';

-- Create index for geographic queries (using GiST for spatial queries if PostGIS is available)
-- For now, using B-tree indexes for simple distance calculations
CREATE INDEX IF NOT EXISTS idx_shops_latitude ON shops(latitude) WHERE latitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shops_longitude ON shops(longitude) WHERE longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shops_geo_coords ON shops(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND directory_enabled = TRUE;

