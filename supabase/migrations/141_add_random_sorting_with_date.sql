-- Migration: Add random sorting with date for better equality of chances
-- Description: Replace alphabetical sorting with hash-based random sorting that changes daily
-- Uses hashtext() for safe deterministic hashing (avoids UUID::bigint cast issues)
-- Functions marked as VOLATILE because they use current_date (not STABLE)
-- This provides fair rotation while maintaining excellent performance

-- Drop existing functions first (required when changing return types or ORDER BY)
DROP FUNCTION IF EXISTS get_shops_sorted_by_premium(TEXT, INTEGER, INTEGER, TEXT, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS get_products_sorted_by_shop_premium(TEXT, INTEGER, INTEGER, TEXT, UUID[], BOOLEAN);

-- Update get_shops_sorted_by_premium with Option 3: modulo + date
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
    ORDER BY 
        swp.is_premium DESC,  -- Premium en premier
        abs(hashtext(swp.id::text || current_date::text)) % 1000 ASC,  -- Hash déterministe avec date (change chaque jour)
        swp.name ASC  -- Fallback pour cohérence
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Update get_products_sorted_by_shop_premium with Option 3: modulo + date
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
    ORDER BY 
        pws.is_shop_premium DESC,  -- Premium shop products en premier
        abs(hashtext(pws.shop_id::text || current_date::text)) % 1000 ASC,  -- Hash déterministe avec date (change chaque jour)
        pws.name ASC  -- Fallback pour cohérence
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_shops_sorted_by_premium(TEXT, INTEGER, INTEGER, TEXT, TEXT, BOOLEAN) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_products_sorted_by_shop_premium(TEXT, INTEGER, INTEGER, TEXT, UUID[], BOOLEAN) TO authenticated, anon;

-- Update find_shops_in_radius to use Option 3 for shops at same distance
-- Note: For geographic search, we keep distance as primary sort, but add hash for shops at same distance
CREATE OR REPLACE FUNCTION find_shops_in_radius(
    p_latitude NUMERIC,
    p_longitude NUMERIC,
    p_radius_km NUMERIC,
    p_limit INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0,
    p_premium_product_id TEXT DEFAULT 'prod_Selcz36pAfV3vV',
    p_verified_only BOOLEAN DEFAULT FALSE
) RETURNS TABLE (
    shop_id UUID,
    distance_km NUMERIC,
    name TEXT,
    slug TEXT,
    city TEXT,
    actual_city TEXT,
    postal_code TEXT,
    logo_url TEXT,
    is_premium BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH shops_with_premium AS (
        SELECT 
            s.id AS shop_id,
            calculate_distance_km(p_latitude, p_longitude, s.latitude, s.longitude) AS distance_km,
            s.name,
            s.slug,
            s.directory_city AS city,
            s.directory_actual_city AS actual_city,
            s.directory_postal_code AS postal_code,
            s.logo_url,
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
            AND s.latitude IS NOT NULL
            AND s.longitude IS NOT NULL
            AND calculate_distance_km(p_latitude, p_longitude, s.latitude, s.longitude) <= p_radius_km
    )
    SELECT 
        swp.shop_id,
        swp.distance_km,
        swp.name,
        swp.slug,
        swp.city,
        swp.actual_city,
        swp.postal_code,
        swp.logo_url,
        swp.is_premium
    FROM shops_with_premium swp
    WHERE (NOT p_verified_only OR swp.is_premium = TRUE)
    ORDER BY 
        swp.is_premium DESC,  -- Premium en premier
        swp.distance_km ASC,  -- Puis par distance (plus proche d'abord)
        abs(hashtext(swp.shop_id::text || current_date::text)) % 1000 ASC,  -- Hash déterministe avec date pour shops à même distance
        swp.name ASC          -- Fallback pour cohérence
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION find_shops_in_radius(NUMERIC, NUMERIC, NUMERIC, INTEGER, INTEGER, TEXT, BOOLEAN) TO authenticated, anon;

COMMENT ON FUNCTION find_shops_in_radius(NUMERIC, NUMERIC, NUMERIC, INTEGER, INTEGER, TEXT, BOOLEAN) IS 'Returns shops within radius, sorted by premium status, distance, then hash-based random order (changes daily). Uses hashtext() for safe deterministic hashing.';

-- Add comments
COMMENT ON FUNCTION get_shops_sorted_by_premium(TEXT, INTEGER, INTEGER, TEXT, TEXT, BOOLEAN) IS 'Returns shops sorted by premium status (premium first) then by hash-based random order (changes daily) then name. Uses hashtext() for safe deterministic hashing with excellent performance.';
COMMENT ON FUNCTION get_products_sorted_by_shop_premium(TEXT, INTEGER, INTEGER, TEXT, UUID[], BOOLEAN) IS 'Returns products sorted by shop premium status (premium shop products first) then by hash-based random order (changes daily) then name. Uses hashtext() for safe deterministic hashing with excellent performance.';

