-- Migration: Add directory fields to shops table for annuaire
-- This allows shops to register in the directory with location and cake type information

-- Add directory fields to shops table
ALTER TABLE shops
ADD COLUMN IF NOT EXISTS directory_city TEXT,
ADD COLUMN IF NOT EXISTS directory_actual_city TEXT,
ADD COLUMN IF NOT EXISTS directory_postal_code TEXT,
ADD COLUMN IF NOT EXISTS directory_cake_types TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS directory_enabled BOOLEAN DEFAULT FALSE;

-- Add constraints
ALTER TABLE shops
ADD CONSTRAINT shops_directory_city_check CHECK (
    directory_city IS NULL OR char_length(directory_city) <= 100
),
ADD CONSTRAINT shops_directory_actual_city_check CHECK (
    directory_actual_city IS NULL OR char_length(directory_actual_city) <= 100
),
ADD CONSTRAINT shops_directory_postal_code_check CHECK (
    directory_postal_code IS NULL OR directory_postal_code ~ '^[0-9]{5}$'
);

-- Add comments for documentation
COMMENT ON COLUMN shops.directory_city IS 'Grande ville la plus proche pour l''annuaire (ex: Paris, Lyon)';
COMMENT ON COLUMN shops.directory_actual_city IS 'Vraie ville avec autocomplétion (ex: Montreuil, Villeurbanne)';
COMMENT ON COLUMN shops.directory_postal_code IS 'Code postal (5 chiffres)';
COMMENT ON COLUMN shops.directory_cake_types IS 'Types de gâteaux proposés pour l''annuaire (array)';
COMMENT ON COLUMN shops.directory_enabled IS 'Si true, la boutique apparaît dans l''annuaire';

-- Create index for directory searches
CREATE INDEX IF NOT EXISTS idx_shops_directory_city ON shops(directory_city) WHERE directory_enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_shops_directory_cake_types ON shops USING GIN(directory_cake_types) WHERE directory_enabled = TRUE;

