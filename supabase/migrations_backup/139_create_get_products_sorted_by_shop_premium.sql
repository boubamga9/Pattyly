-- Function to get products sorted by shop premium status then name
-- This allows efficient server-side sorting with premium shop products first

CREATE OR REPLACE FUNCTION get_products_sorted_by_shop_premium(
    p_premium_product_id TEXT DEFAULT 'prod_Selcz36pAfV3vV',
    p_limit INTEGER DEFAULT 12,
    p_offset INTEGER DEFAULT 0,
    p_cake_type TEXT DEFAULT NULL,
    p_shop_ids UUID[] DEFAULT NULL,
    p_verified_only BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    image_url TEXT,
    base_price NUMERIC,
    cake_type TEXT,
    shop_id UUID,
    shop_name TEXT,
    shop_slug TEXT,
    shop_logo_url TEXT,
    shop_city TEXT,
    shop_actual_city TEXT,
    shop_postal_code TEXT,
    shop_profile_id UUID,
    shop_latitude NUMERIC(10, 8),
    shop_longitude NUMERIC(11, 8),
    is_shop_premium BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH products_with_shop_premium AS (
        SELECT 
            p.id,
            p.name,
            p.description,
            p.image_url,
            p.base_price,
            p.cake_type,
            p.shop_id,
            s.name AS shop_name,
            s.slug AS shop_slug,
            s.logo_url AS shop_logo_url,
            s.directory_city AS shop_city,
            s.directory_actual_city AS shop_actual_city,
            s.directory_postal_code AS shop_postal_code,
            s.profile_id AS shop_profile_id,
            s.latitude AS shop_latitude,
            s.longitude AS shop_longitude,
            COALESCE(
                EXISTS(
                    SELECT 1 
                    FROM user_products up
                    WHERE up.profile_id = s.profile_id
                    AND up.stripe_product_id = p_premium_product_id
                    AND up.subscription_status = 'active'
                ),
                FALSE
            ) AS is_shop_premium
        FROM products p
        INNER JOIN shops s ON p.shop_id = s.id
        WHERE p.is_active = TRUE
        AND s.is_active = TRUE
        AND s.directory_enabled = TRUE
        AND (p_cake_type IS NULL OR p.cake_type = p_cake_type)
        AND (p_shop_ids IS NULL OR p.shop_id = ANY(p_shop_ids))
    )
    SELECT 
        pws.id,
        pws.name,
        pws.description,
        pws.image_url,
        pws.base_price,
        pws.cake_type,
        pws.shop_id,
        pws.shop_name,
        pws.shop_slug,
        pws.shop_logo_url,
        pws.shop_city,
        pws.shop_actual_city,
        pws.shop_postal_code,
        pws.shop_profile_id,
        pws.shop_latitude,
        pws.shop_longitude,
        pws.is_shop_premium
    FROM products_with_shop_premium pws
    WHERE (NOT p_verified_only OR pws.is_shop_premium = TRUE)
    ORDER BY pws.is_shop_premium DESC, pws.name ASC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_products_sorted_by_shop_premium(TEXT, INTEGER, INTEGER, TEXT, UUID[], BOOLEAN) TO authenticated, anon;

COMMENT ON FUNCTION get_products_sorted_by_shop_premium(TEXT, INTEGER, INTEGER, TEXT, UUID[], BOOLEAN) IS 'Returns products sorted by shop premium status (premium shop products first) then name, with optional filters';

