-- Create shop_customizations table for boutique styling
CREATE TABLE shop_customizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    button_color TEXT DEFAULT '#000000',
    button_text_color TEXT DEFAULT '#ffffff', 
    text_color TEXT DEFAULT '#000000',
    icon_color TEXT DEFAULT '#6b7280',
    secondary_text_color TEXT DEFAULT '#6b7280',
    background_color TEXT DEFAULT '#ffffff',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(shop_id)
);

-- Add RLS policies
ALTER TABLE shop_customizations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own shop customizations
CREATE POLICY "Users can access their own shop customizations" ON shop_customizations
    FOR ALL USING (
        shop_id IN (
            SELECT id FROM shops WHERE profile_id = auth.uid()
        )
    );

-- Grant permissions
GRANT ALL ON shop_customizations TO authenticated;

-- Create function to automatically create customizations when a shop is created
CREATE OR REPLACE FUNCTION create_default_shop_customizations()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO shop_customizations (shop_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create customizations for new shops
CREATE TRIGGER create_shop_customizations_trigger
    AFTER INSERT ON shops
    FOR EACH ROW
    EXECUTE FUNCTION create_default_shop_customizations();

-- Create default customizations for existing shops
INSERT INTO shop_customizations (shop_id)
SELECT id FROM shops
WHERE id NOT IN (SELECT shop_id FROM shop_customizations);

-- Add function to get shop with customizations
CREATE OR REPLACE FUNCTION get_shop_with_customizations(p_slug TEXT)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'shop', (
            SELECT json_build_object(
                'id', s.id,
                'name', s.name,
                'slug', s.slug,
                'bio', s.bio,
                'logo_url', s.logo_url,
                'instagram', s.instagram,
                'tiktok', s.tiktok,
                'website', s.website,
                'is_custom_accepted', s.is_custom_accepted,
                'is_active', s.is_active,
                'created_at', s.created_at
            )
            FROM shops s
            WHERE s.slug = p_slug
        ),
        'customizations', (
            SELECT json_build_object(
                'button_color', sc.button_color,
                'button_text_color', sc.button_text_color,
                'text_color', sc.text_color,
                'icon_color', sc.icon_color,
                'secondary_text_color', sc.secondary_text_color,
                'background_color', sc.background_color
            )
            FROM shop_customizations sc
            JOIN shops s ON s.id = sc.shop_id
            WHERE s.slug = p_slug
        )
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_shop_with_customizations(TEXT) TO authenticated;
