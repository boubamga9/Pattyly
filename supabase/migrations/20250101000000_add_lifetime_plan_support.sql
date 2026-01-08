-- Migration: Ajout du support du plan à vie
-- Le plan à vie est traité comme équivalent au plan Premium pour toutes les permissions

-- 1. Mettre à jour get_user_plan pour reconnaître le plan à vie
CREATE OR REPLACE FUNCTION "public"."get_user_plan"(
    "p_profile_id" "uuid", 
    "premium_product_id" "text" DEFAULT 'prod_Selcz36pAfV3vV'::"text", 
    "basic_product_id" "text" DEFAULT 'prod_Selbd3Ne2plHqG'::"text",
    "lifetime_product_id" "text" DEFAULT NULL
) RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_is_free BOOLEAN;
  v_product_id TEXT;
BEGIN
  -- Vérifie si l'utilisateur est exempt
  SELECT is_stripe_free
  INTO v_is_free
  FROM profiles
  WHERE id = p_profile_id;

  IF v_is_free THEN
    RETURN 'exempt';
  END IF;

  -- Récupère SEULEMENT l'abonnement ACTIF (pas inactive)
  SELECT stripe_product_id
  INTO v_product_id
  FROM user_products
  WHERE profile_id = p_profile_id
  AND subscription_status = 'active'  -- ✅ Seulement les abonnements actifs
  LIMIT 1;

  IF v_product_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Comparaison avec les paramètres
  -- ✅ Le plan à vie est traité comme Premium
  IF v_product_id = premium_product_id OR (lifetime_product_id IS NOT NULL AND v_product_id = lifetime_product_id) THEN
    RETURN 'premium';
  ELSIF v_product_id = basic_product_id THEN
    RETURN 'basic';
  ELSE
    RETURN NULL;
  END IF;
END;
$$;

-- 2. Mettre à jour get_user_permissions_complete pour reconnaître le plan à vie
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
    WHERE p.id = p_profile_id
    LIMIT 1;
    
    -- 2. Déterminer le plan
    IF v_is_stripe_free THEN
        v_plan := 'exempt';
    ELSE
        -- Récupérer l'abonnement actif
        SELECT stripe_product_id
        INTO v_stripe_product_id
        FROM user_products
        WHERE profile_id = p_profile_id
        AND subscription_status = 'active'
        LIMIT 1;
        
        IF v_stripe_product_id IS NULL THEN
            -- Si pas d'abonnement actif, retourner 'free' (plan gratuit permanent)
            v_plan := 'free';
        ELSIF v_stripe_product_id = p_premium_product_id OR (p_lifetime_product_id IS NOT NULL AND v_stripe_product_id = p_lifetime_product_id) THEN
            -- ✅ Le plan à vie est traité comme Premium
            v_plan := 'premium';
        ELSIF v_stripe_product_id = p_basic_product_id THEN
            v_plan := 'basic';
        ELSE
            -- Produit inconnu, retourner 'free'
            v_plan := 'free';
        END IF;
    END IF;
    
    -- ✅ CORRIGÉ : Compter TOUS les produits du shop (actifs ET désactivés)
    -- Cela permet d'afficher le bon comptage dans l'UI et empêche le bypass de la limite
    SELECT COUNT(*)
    INTO v_product_count
    FROM products p
    JOIN shops s ON s.id = p.shop_id
    WHERE s.profile_id = p_profile_id;
    -- Suppression de la condition "AND p.is_active = true" pour compter tous les produits
    
    -- S'assurer que v_plan n'est pas NULL (fallback sur 'free')
    IF v_plan IS NULL THEN
        v_plan := 'free';
    END IF;
    
    -- 4. Obtenir la limite de produits selon le plan (utilise la fonction get_product_limit)
    SELECT get_product_limit(v_plan)
    INTO v_product_limit;
    
    -- 5. Vérifier si l'utilisateur a une méthode de paiement
    SELECT EXISTS(
        SELECT 1 
        FROM payment_links 
        WHERE profile_id = p_profile_id
    ) INTO v_has_payment_method;
    
    -- 6. Vérifier si l'utilisateur a déjà eu un abonnement
    SELECT EXISTS(
        SELECT 1 
        FROM user_products 
        WHERE profile_id = p_profile_id
    ) INTO v_has_ever_had_subscription;
    
    -- 7. Construire le résultat JSON avec toutes les données du shop
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
        'canHandleCustomRequests', v_plan IN ('premium', 'exempt'),
        'canManageCustomForms', v_plan IN ('premium', 'exempt'),
        'canAddMoreProducts', COALESCE(v_product_count, 0) < v_product_limit,
        'needsSubscription', v_plan = 'free',
        'isExempt', v_plan = 'exempt',
        'canAccessDashboard', true, -- Tous les utilisateurs avec un shop peuvent accéder au dashboard
        'has_payment_method', v_has_payment_method,
        'has_ever_had_subscription', v_has_ever_had_subscription,
        'has_shop', v_shop_id IS NOT NULL
    ) INTO result;
    
    RETURN result;
END;
$$;

-- Commentaires
COMMENT ON FUNCTION "public"."get_user_plan"("p_profile_id" "uuid", "premium_product_id" "text", "basic_product_id" "text", "lifetime_product_id" "text") IS 'Get user plan. Returns: free, basic, premium, or exempt. The lifetime plan is treated as premium.';
COMMENT ON FUNCTION "public"."get_user_permissions_complete"("p_profile_id" "uuid", "p_premium_product_id" "text", "p_basic_product_id" "text", "p_lifetime_product_id" "text") IS 'Get all user permissions in a single optimized query. The lifetime plan is treated as premium for all permissions.';




