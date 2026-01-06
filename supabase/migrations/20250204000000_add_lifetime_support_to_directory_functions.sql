-- Migration: Ajout du support du plan lifetime dans les fonctions de l'annuaire
-- Le plan lifetime est traité comme équivalent au plan Premium pour l'affichage dans l'annuaire
-- (badge "vérifié", tri prioritaire, filtrage "vérifiés uniquement")

-- 1. Mettre à jour check_premium_profiles pour reconnaître le plan lifetime
CREATE OR REPLACE FUNCTION "public"."check_premium_profiles"(
    "p_profile_ids" "uuid"[], 
    "p_premium_product_id" "text" DEFAULT 'prod_Selcz36pAfV3vV'::"text",
    "p_lifetime_product_id" "text" DEFAULT NULL
) RETURNS "uuid"[]
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
    v_premium_profile_ids UUID[];
BEGIN
    -- Récupérer les profile_ids qui ont un abonnement premium OU lifetime actif
    SELECT ARRAY_AGG(DISTINCT profile_id)
    INTO v_premium_profile_ids
    FROM user_products
    WHERE profile_id = ANY(p_profile_ids)
        AND subscription_status = 'active'
        AND (
            stripe_product_id = p_premium_product_id
            OR (p_lifetime_product_id IS NOT NULL AND stripe_product_id = p_lifetime_product_id)
        );
    
    -- Retourner un array vide si aucun résultat
    RETURN COALESCE(v_premium_profile_ids, ARRAY[]::UUID[]);
END;
$$;

COMMENT ON FUNCTION "public"."check_premium_profiles"("p_profile_ids" "uuid"[], "p_premium_product_id" "text", "p_lifetime_product_id" "text") IS 'Vérifie quels profiles ont un abonnement premium ou lifetime actif. Accessible aux utilisateurs anonymes pour afficher le badge "vérifié". Le plan lifetime est traité comme premium.';

-- 2. Mettre à jour find_shops_in_radius pour reconnaître le plan lifetime
DROP FUNCTION IF EXISTS "public"."find_shops_in_radius"(
    "p_latitude" numeric, 
    "p_longitude" numeric, 
    "p_radius_km" numeric, 
    "p_limit" integer, 
    "p_offset" integer, 
    "p_premium_product_id" "text", 
    "p_verified_only" boolean
);

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
                EXISTS(
                    SELECT 1 
                    FROM user_products up
                    WHERE up.profile_id = s.profile_id
                    AND up.subscription_status = 'active'
                    AND (
                        up.stripe_product_id = p_premium_product_id
                        OR (p_lifetime_product_id IS NOT NULL AND up.stripe_product_id = p_lifetime_product_id)
                    )
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
$$;

COMMENT ON FUNCTION "public"."find_shops_in_radius"("p_latitude" numeric, "p_longitude" numeric, "p_radius_km" numeric, "p_limit" integer, "p_offset" integer, "p_premium_product_id" "text", "p_lifetime_product_id" "text", "p_verified_only" boolean) IS 'Returns shops within radius, sorted by premium/lifetime status, distance, then hash-based random order (changes daily). Uses hashtext() for safe deterministic hashing. The lifetime plan is treated as premium.';

-- 3. Mettre à jour get_shops_sorted_by_premium pour reconnaître le plan lifetime
DROP FUNCTION IF EXISTS "public"."get_shops_sorted_by_premium"(
    "p_premium_product_id" "text", 
    "p_limit" integer, 
    "p_offset" integer, 
    "p_city" "text", 
    "p_cake_type" "text", 
    "p_verified_only" boolean
);

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
                EXISTS(
                    SELECT 1 
                    FROM user_products up
                    WHERE up.profile_id = s.profile_id
                    AND up.subscription_status = 'active'
                    AND (
                        up.stripe_product_id = p_premium_product_id
                        OR (p_lifetime_product_id IS NOT NULL AND up.stripe_product_id = p_lifetime_product_id)
                    )
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
$$;

COMMENT ON FUNCTION "public"."get_shops_sorted_by_premium"("p_premium_product_id" "text", "p_limit" integer, "p_offset" integer, "p_city" "text", "p_cake_type" "text", "p_lifetime_product_id" "text", "p_verified_only" boolean) IS 'Returns shops sorted by premium/lifetime status (premium first) then by hash-based random order (changes daily) then name. Uses SECURITY DEFINER to read user_products for premium status check, bypassing RLS. The lifetime plan is treated as premium.';

-- 4. Mettre à jour get_products_sorted_by_shop_premium pour reconnaître le plan lifetime
DROP FUNCTION IF EXISTS "public"."get_products_sorted_by_shop_premium"(
    "p_premium_product_id" "text", 
    "p_limit" integer, 
    "p_offset" integer, 
    "p_cake_type" "text", 
    "p_shop_ids" "uuid"[], 
    "p_verified_only" boolean,
    "p_min_price" numeric,
    "p_max_price" numeric
);

CREATE OR REPLACE FUNCTION "public"."get_products_sorted_by_shop_premium"(
    "p_premium_product_id" "text" DEFAULT 'prod_Selcz36pAfV3vV'::"text", 
    "p_limit" integer DEFAULT 12, 
    "p_offset" integer DEFAULT 0, 
    "p_cake_type" "text" DEFAULT NULL::"text", 
    "p_shop_ids" "uuid"[] DEFAULT NULL::"uuid"[], 
    "p_lifetime_product_id" "text" DEFAULT NULL,
    "p_verified_only" boolean DEFAULT false,
    "p_min_price" numeric DEFAULT NULL::numeric,
    "p_max_price" numeric DEFAULT NULL::numeric
) RETURNS TABLE("id" "uuid", "name" "text", "description" "text", "image_url" "text", "base_price" numeric, "cake_type" "text", "shop_id" "uuid", "shop_name" "text", "shop_slug" "text", "shop_logo_url" "text", "shop_city" "text", "shop_actual_city" "text", "shop_postal_code" "text", "shop_profile_id" "uuid", "shop_latitude" numeric, "shop_longitude" numeric, "is_shop_premium" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
                    AND up.subscription_status = 'active'
                    AND (
                        up.stripe_product_id = p_premium_product_id
                        OR (p_lifetime_product_id IS NOT NULL AND up.stripe_product_id = p_lifetime_product_id)
                    )
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
        -- Filtrage par prix directement dans la requête SQL
        AND (p_min_price IS NULL OR p.base_price >= p_min_price)
        AND (p_max_price IS NULL OR p.base_price <= p_max_price)
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
        abs(hashtext(pws.id::text || current_date::text)) % 1000 ASC,  -- Hash déterministe avec date (change chaque jour) - basé sur product_id pour mélanger les produits
        pws.name ASC  -- Fallback pour cohérence
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION "public"."get_products_sorted_by_shop_premium"(
    "p_premium_product_id" "text", 
    "p_limit" integer, 
    "p_offset" integer, 
    "p_cake_type" "text", 
    "p_shop_ids" "uuid"[], 
    "p_lifetime_product_id" "text",
    "p_verified_only" boolean,
    "p_min_price" numeric,
    "p_max_price" numeric
) IS 'Returns products sorted by shop premium/lifetime status (premium shop products first) then by hash-based random order (changes daily, based on product_id to mix products across shops) then name. Uses SECURITY DEFINER to read user_products for premium status check, bypassing RLS. Now includes price filtering (p_min_price and p_max_price). The lifetime plan is treated as premium.';

