-- Mettre à jour la fonction get_user_permissions_complete pour inclure Stripe Connect
-- dans la vérification has_payment_method

CREATE OR REPLACE FUNCTION "public"."get_user_permissions_complete"(
    "p_profile_id" "uuid", 
    "p_premium_product_id" "text" DEFAULT 'prod_Selcz36pAfV3vV'::"text", 
    "p_basic_product_id" "text" DEFAULT 'prod_Selbd3Ne2plHqG'::"text",
    "p_lifetime_product_id" "text" DEFAULT NULL
) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
    result JSON;
    v_shop_id UUID;
    v_shop_slug TEXT;
    v_shop_name TEXT;
    v_shop_bio TEXT;
    v_shop_logo_url TEXT;
    v_shop_instagram TEXT;
    v_shop_tiktok TEXT;
    v_shop_website TEXT;
    v_shop_is_active BOOLEAN;
    v_shop_is_custom_accepted BOOLEAN;
    v_plan TEXT;
    v_product_count INTEGER;
    v_is_stripe_free BOOLEAN;
    v_stripe_product_id TEXT;
    v_has_payment_method BOOLEAN;
    v_has_ever_had_subscription BOOLEAN;
    v_product_limit INTEGER;
BEGIN
    -- 1. Récupérer les infos du shop et du profil en une seule requête
    SELECT 
        s.id,
        s.slug,
        s.name,
        s.bio,
        s.logo_url,
        s.instagram,
        s.tiktok,
        s.website,
        s.is_active,
        s.is_custom_accepted,
        p.is_stripe_free
    INTO 
        v_shop_id,
        v_shop_slug,
        v_shop_name,
        v_shop_bio,
        v_shop_logo_url,
        v_shop_instagram,
        v_shop_tiktok,
        v_shop_website,
        v_shop_is_active,
        v_shop_is_custom_accepted,
        v_is_stripe_free
    FROM profiles p
    LEFT JOIN shops s ON s.profile_id = p.id
    WHERE p.id = p_profile_id;

    -- 2. Récupérer le plan de l'utilisateur (première subscription active trouvée)
    SELECT COALESCE(up.stripe_product_id, NULL)
    INTO v_stripe_product_id
    FROM user_products up
    WHERE up.profile_id = p_profile_id
        AND up.subscription_status = 'active'
    ORDER BY 
        CASE 
            WHEN up.stripe_product_id = p_premium_product_id THEN 1
            WHEN up.stripe_product_id = p_basic_product_id THEN 2
            WHEN up.stripe_product_id = p_lifetime_product_id THEN 3
            ELSE 4
        END
    LIMIT 1;

    -- 3. Déterminer le plan basé sur le produit Stripe
    IF v_stripe_product_id = p_premium_product_id THEN
        v_plan := 'premium';
    ELSIF v_stripe_product_id = p_basic_product_id THEN
        v_plan := 'basic';
    ELSIF v_stripe_product_id = p_lifetime_product_id THEN
        v_plan := 'lifetime';
    ELSIF v_is_stripe_free = true THEN
        v_plan := 'free';
    ELSE
        v_plan := 'free';
    END IF;

    -- 4. Compter les produits actifs de la boutique
    SELECT COUNT(*)
    INTO v_product_count
    FROM products
    WHERE shop_id = v_shop_id
        AND is_active = true;
    -- Suppression de la condition "AND p.is_active = true" pour compter tous les produits
    
    -- S'assurer que v_plan n'est pas NULL (fallback sur 'free')
    IF v_plan IS NULL THEN
        v_plan := 'free';
    END IF;
    
    -- 5. Obtenir la limite de produits selon le plan (utilise la fonction get_product_limit)
    SELECT get_product_limit(v_plan)
    INTO v_product_limit;
    
    -- 6. Vérifier si l'utilisateur a une méthode de paiement
    -- Vérifier dans payment_links OU dans stripe_connect_accounts (actif et charges_enabled)
    SELECT EXISTS(
        SELECT 1 
        FROM payment_links 
        WHERE profile_id = p_profile_id
            AND is_active = true
        UNION
        SELECT 1
        FROM stripe_connect_accounts
        WHERE profile_id = p_profile_id
            AND is_active = true
            AND charges_enabled = true
    ) INTO v_has_payment_method;
    
    -- 7. Vérifier si l'utilisateur a déjà eu un abonnement
    SELECT EXISTS(
        SELECT 1 
        FROM user_products 
        WHERE profile_id = p_profile_id
    ) INTO v_has_ever_had_subscription;
    
    -- 8. Construire le résultat JSON avec toutes les données du shop
    SELECT json_build_object(
        'shopId', v_shop_id,
        'shopSlug', v_shop_slug,
        'shop', CASE 
            WHEN v_shop_id IS NOT NULL THEN json_build_object(
                'id', v_shop_id,
                'name', v_shop_name,
                'slug', v_shop_slug,
                'bio', v_shop_bio,
                'logo_url', v_shop_logo_url,
                'instagram', v_shop_instagram,
                'tiktok', v_shop_tiktok,
                'website', v_shop_website,
                'is_active', v_shop_is_active,
                'is_custom_accepted', v_shop_is_custom_accepted
            )
            ELSE NULL
        END,
        'plan', COALESCE(v_plan, 'free'),
        'productCount', COALESCE(v_product_count, 0),
        'productLimit', v_product_limit,
        'canAddMoreProducts', COALESCE(v_product_count, 0) < v_product_limit,
        'canHandleCustomRequests', v_plan IN ('premium', 'basic', 'lifetime') OR v_is_stripe_free = true,
        'canManageCustomForms', v_plan IN ('premium', 'basic', 'lifetime') OR v_is_stripe_free = true,
        'isExempt', v_is_stripe_free = true,
        'has_payment_method', v_has_payment_method,
        'has_ever_had_subscription', v_has_ever_had_subscription,
        'has_shop', v_shop_id IS NOT NULL
    ) INTO result;
    
    RETURN result;
END;
$$;


