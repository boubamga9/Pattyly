-- Amélioration du hash pour les produits dans /gateaux
-- Utilisation d'un hash combiné (ID + name) au lieu d'un simple modulo 1000

-- Mettre à jour get_products_sorted_by_shop_premium
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
                    FROM profiles pr
                    WHERE pr.id = s.profile_id
                    AND pr.is_stripe_free = true
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
        pws.is_shop_premium DESC,  -- Premium/Exempt shop products en premier
        -- Hash combiné avec ID et name pour réduire les collisions (change chaque jour)
        -- Utiliser bigint pour éviter le dépassement d'entier
        ((abs(hashtext(pws.id::text || current_date::text))::bigint * 1000000 + 
          abs(hashtext(pws.name::text || current_date::text))::bigint) % 2147483647)::integer ASC
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
) IS 'Returns products sorted by shop premium/lifetime/exempt status (premium shop products first) then by combined hash-based order (ID + name, changes daily). Les utilisateurs exempts (is_stripe_free = true) sont traités comme premium.';

