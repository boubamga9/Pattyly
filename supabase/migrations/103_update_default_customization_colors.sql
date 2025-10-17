-- Update default colors for shop customizations
-- This migration updates the default values for new shops and existing shops without customizations

-- Update the table defaults for new shops
ALTER TABLE shop_customizations 
ALTER COLUMN button_color SET DEFAULT '#ff6f61',
ALTER COLUMN button_text_color SET DEFAULT '#ffffff',
ALTER COLUMN text_color SET DEFAULT '#333333',
ALTER COLUMN icon_color SET DEFAULT '#6b7280',
ALTER COLUMN secondary_text_color SET DEFAULT '#333333',
ALTER COLUMN background_color SET DEFAULT '#ffe8d6';

-- Update existing shops that still have the old default colors
UPDATE shop_customizations 
SET 
    button_color = '#ff6f61',
    button_text_color = '#ffffff',
    text_color = '#333333',
    icon_color = '#6b7280',
    secondary_text_color = '#333333',
    background_color = '#ffe8d6',
    updated_at = NOW()
WHERE 
    button_color = '#000000' 
    AND button_text_color = '#ffffff'
    AND text_color = '#000000'
    AND icon_color = '#6b7280'
    AND secondary_text_color = '#6b7280'
    AND background_color = '#ffffff';

-- Update the function to use new defaults
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
        '#ffe8d6'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
