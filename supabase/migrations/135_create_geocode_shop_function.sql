-- Migration: Create function to geocode a shop's coordinates
-- This function uses the shop's directory_actual_city and directory_postal_code
-- to fetch coordinates from Nominatim (OpenStreetMap)

-- Function to calculate distance between two points (Haversine formula)
-- Returns distance in kilometers
CREATE OR REPLACE FUNCTION calculate_distance_km(
    lat1 NUMERIC,
    lon1 NUMERIC,
    lat2 NUMERIC,
    lon2 NUMERIC
) RETURNS NUMERIC AS $$
DECLARE
    R NUMERIC := 6371; -- Earth radius in km
    dLat NUMERIC;
    dLon NUMERIC;
    a NUMERIC;
    c NUMERIC;
BEGIN
    -- Convert degrees to radians
    dLat := RADIANS(lat2 - lat1);
    dLon := RADIANS(lon2 - lon1);
    
    -- Haversine formula
    a := SIN(dLat / 2) * SIN(dLat / 2) +
         COS(RADIANS(lat1)) * COS(RADIANS(lat2)) *
         SIN(dLon / 2) * SIN(dLon / 2);
    
    c := 2 * ATAN2(SQRT(a), SQRT(1 - a));
    
    RETURN R * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to update shop coordinates (to be called from application code)
-- This is a placeholder - actual geocoding will be done in application code
-- using Nominatim API, then coordinates will be stored via this function
CREATE OR REPLACE FUNCTION update_shop_coordinates(
    p_shop_id UUID,
    p_latitude NUMERIC,
    p_longitude NUMERIC
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE shops
    SET latitude = p_latitude,
        longitude = p_longitude
    WHERE id = p_shop_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to find shops within a radius (in km) of a point
-- Returns shop IDs and distances
CREATE OR REPLACE FUNCTION find_shops_in_radius(
    p_latitude NUMERIC,
    p_longitude NUMERIC,
    p_radius_km NUMERIC,
    p_limit INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0
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
    SELECT 
        s.id AS shop_id,
        calculate_distance_km(p_latitude, p_longitude, s.latitude, s.longitude) AS distance_km,
        s.name,
        s.slug,
        s.directory_city AS city,
        s.directory_actual_city AS actual_city,
        s.directory_postal_code AS postal_code,
        s.logo_url,
        FALSE AS is_premium -- Will be calculated in application code
    FROM shops s
    WHERE s.directory_enabled = TRUE
        AND s.is_active = TRUE
        AND s.latitude IS NOT NULL
        AND s.longitude IS NOT NULL
        AND calculate_distance_km(p_latitude, p_longitude, s.latitude, s.longitude) <= p_radius_km
    ORDER BY 
        distance_km ASC,
        s.name ASC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

