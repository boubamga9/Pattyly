-- Function to get paginated shops sorted by premium status then name
-- This allows efficient server-side sorting with premium shops first

CREATE OR REPLACE FUNCTION get_shops_sorted_by_premium(
    p_premium_product_id TEXT DEFAULT 'prod_Selcz36pAfV3vV',
    p_limit INTEGER DEFAULT 12,
    p_offset INTEGER DEFAULT 0,
    p_city TEXT DEFAULT NULL,
    p_cake_type TEXT DEFAULT NULL,
    p_verified_only BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    slug TEXT,
    logo_url TEXT,
    bio TEXT,
    directory_city TEXT,
    directory_actual_city TEXT,
    directory_postal_code TEXT,
    directory_cake_types TEXT[],
    profile_id UUID,
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    is_premium BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH shops_with_premium AS (
        SELECT 
            s.id,
            s.name,
            s.slug,
            s.logo_url,
            s.bio,
            s.directory_city,
            s.directory_actual_city,
            s.directory_postal_code,
            s.directory_cake_types,
            s.profile_id,
            s.latitude,
            s.longitude,
            COALESCE(
                EXISTS(
                    SELECT 1 
                    FROM user_products up
                    WHERE up.profile_id = s.profile_id
                    AND up.stripe_product_id = p_premium_product_id
                    AND up.subscription_status = 'active'
                ),
                FALSE
            ) AS is_premium
        FROM shops s
        WHERE s.directory_enabled = TRUE
        AND s.is_active = TRUE
        AND (p_city IS NULL OR s.directory_city = p_city)
        AND (p_cake_type IS NULL OR s.directory_cake_types @> ARRAY[p_cake_type]::TEXT[])
    )
    SELECT 
        swp.id,
        swp.name,
        swp.slug,
        swp.logo_url,
        swp.bio,
        swp.directory_city,
        swp.directory_actual_city,
        swp.directory_postal_code,
        swp.directory_cake_types,
        swp.profile_id,
        swp.latitude,
        swp.longitude,
        swp.is_premium
    FROM shops_with_premium swp
    WHERE (NOT p_verified_only OR swp.is_premium = TRUE)
    ORDER BY swp.is_premium DESC, swp.name ASC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_shops_sorted_by_premium(TEXT, INTEGER, INTEGER, TEXT, TEXT, BOOLEAN) TO authenticated, anon;

COMMENT ON FUNCTION get_shops_sorted_by_premium(TEXT, INTEGER, INTEGER, TEXT, TEXT, BOOLEAN) IS 'Returns shops sorted by premium status (premium first) then name, with optional filters for city, cake type, and verified only';
