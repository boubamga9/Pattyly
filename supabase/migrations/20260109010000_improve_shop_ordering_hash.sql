-- Amélioration du hash pour réduire les collisions et éviter l'ordre alphabétique
-- Utilisation d'un hash combiné (ID + slug) au lieu d'un simple modulo 1000

-- 1. Mettre à jour get_shops_sorted_by_premium
CREATE OR REPLACE FUNCTION "public"."get_shops_sorted_by_premium"(
    "p_premium_product_id" "text" DEFAULT 'prod_Selcz36pAfV3vV'::"text", 
    "p_limit" integer DEFAULT 12, 
    "p_offset" integer DEFAULT 0, 
    "p_city" "text" DEFAULT NULL::"text", 
    "p_cake_type" "text" DEFAULT NULL::"text", 
    "p_lifetime_product_id" "text" DEFAULT NULL,
    "p_verified_only" boolean DEFAULT false
) RETURNS TABLE("id" "uuid", "name" "text", "slug" "text", "logo_url" "text", "bio" "text", "directory_city" "text", "directory_actual_city" "text", "directory_postal_code" "text", "directory_cake_types" "text"[], "profile_id" "uuid", "latitude" numeric, "longitude" numeric, "is_premium" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
                -- Vérifier si le shop a un abonnement premium/lifetime actif OU si le profil est exempt
                EXISTS(
                    SELECT 1 
                    FROM user_products up
                    WHERE up.profile_id = s.profile_id
                    AND up.subscription_status = 'active'
                    AND (
                        up.stripe_product_id = p_premium_product_id
                        OR (p_lifetime_product_id IS NOT NULL AND up.stripe_product_id = p_lifetime_product_id)
                    )
                )
                OR EXISTS(
                    SELECT 1
                    FROM profiles p
                    WHERE p.id = s.profile_id
                    AND p.is_stripe_free = true
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
        swp.is_premium DESC,  -- Premium/Exempt en premier
        -- Hash combiné avec ID et slug pour réduire les collisions (change chaque jour)
        -- Utiliser bigint pour éviter le dépassement d'entier
        ((abs(hashtext(swp.id::text || current_date::text))::bigint * 1000000 + 
          abs(hashtext(swp.slug::text || current_date::text))::bigint) % 2147483647)::integer ASC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION "public"."get_shops_sorted_by_premium"("p_premium_product_id" "text", "p_limit" integer, "p_offset" integer, "p_city" "text", "p_cake_type" "text", "p_lifetime_product_id" "text", "p_verified_only" boolean) IS 'Returns shops sorted by premium/lifetime/exempt status (premium first) then by combined hash-based order (ID + slug, changes daily). Les utilisateurs exempts (is_stripe_free = true) sont traités comme premium.';

-- 2. Mettre à jour find_shops_in_radius
CREATE OR REPLACE FUNCTION "public"."find_shops_in_radius"(
    "p_latitude" numeric, 
    "p_longitude" numeric, 
    "p_radius_km" numeric, 
    "p_limit" integer DEFAULT 100, 
    "p_offset" integer DEFAULT 0, 
    "p_premium_product_id" "text" DEFAULT 'prod_Selcz36pAfV3vV'::"text", 
    "p_lifetime_product_id" "text" DEFAULT NULL,
    "p_verified_only" boolean DEFAULT false
) RETURNS TABLE("shop_id" "uuid", "distance_km" numeric, "name" "text", "slug" "text", "city" "text", "actual_city" "text", "postal_code" "text", "logo_url" "text", "is_premium" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
                -- Vérifier si le shop a un abonnement premium/lifetime actif OU si le profil est exempt
                EXISTS(
                    SELECT 1 
                    FROM user_products up
                    WHERE up.profile_id = s.profile_id
                    AND up.subscription_status = 'active'
                    AND (
                        up.stripe_product_id = p_premium_product_id
                        OR (p_lifetime_product_id IS NOT NULL AND up.stripe_product_id = p_lifetime_product_id)
                    )
                )
                OR EXISTS(
                    SELECT 1
                    FROM profiles p
                    WHERE p.id = s.profile_id
                    AND p.is_stripe_free = true
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
        swp.is_premium DESC,  -- Premium/Exempt en premier
        swp.distance_km ASC,  -- Puis par distance (plus proche d'abord)
        -- Hash combiné avec ID et slug pour réduire les collisions (change chaque jour)
        -- Utiliser bigint pour éviter le dépassement d'entier
        ((abs(hashtext(swp.shop_id::text || current_date::text))::bigint * 1000000 + 
          abs(hashtext(swp.slug::text || current_date::text))::bigint) % 2147483647)::integer ASC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION "public"."find_shops_in_radius"("p_latitude" numeric, "p_longitude" numeric, "p_radius_km" numeric, "p_limit" integer, "p_offset" integer, "p_premium_product_id" "text", "p_lifetime_product_id" "text", "p_verified_only" boolean) IS 'Returns shops within radius, sorted by premium/lifetime/exempt status, distance, then combined hash-based order (ID + slug, changes daily). Les utilisateurs exempts (is_stripe_free = true) sont traités comme premium.';

