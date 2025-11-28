-- Migration: Update default background_color for shop customizations
-- Change from #ffe8d6 to #fafafa to match the UI design

-- Update the table default for new shops
ALTER TABLE shop_customizations 
ALTER COLUMN background_color SET DEFAULT '#fafafa';

-- Update the function to use new default
CREATE OR REPLACE FUNCTION create_default_shop_customizations()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO shop_customizations (
        shop_id,
        button_color,
        button_text_color,
        text_color,
        icon_color,
        secondary_text_color,
        background_color
    )
    VALUES (
        NEW.id,
        '#ff6f61',
        '#ffffff',
        '#333333',
        '#6b7280',
        '#333333',
        '#fafafa'  -- ✅ Updated from #ffe8d6 to #fafafa
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update existing shops that have the old default background color
UPDATE shop_customizations 
SET 
    background_color = '#fafafa',
    updated_at = NOW()
WHERE 
    background_color = '#ffe8d6'  -- Old default
    OR background_color IS NULL;  -- Also update NULL values

-- Add comment
COMMENT ON COLUMN shop_customizations.background_color IS 'Background color for shop pages - default is #fafafa';

