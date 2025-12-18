-- ==============================================
-- MISE À JOUR : LOGIQUE DE VISIBILITÉ BOUTIQUE
-- ==============================================

-- Au lieu de vérifier seulement is_active, on vérifie :
-- 1. is_active (admin peut couper manuellement)
-- 2. trial_ending (essai gratuit actif ?)
-- 3. Stripe subscription active

-- ==============================================
-- FONCTION : is_shop_visible
-- ==============================================

-- Fonction helper pour centraliser la logique de visibilité
CREATE OR REPLACE FUNCTION is_shop_visible(
    p_profile_id UUID,
    p_is_active BOOLEAN
)
RETURNS BOOLEAN AS $$
DECLARE
    v_trial_ending TIMESTAMP WITH TIME ZONE;
    v_has_active_subscription BOOLEAN;
BEGIN
    -- 1. Si la boutique est manuellement désactivée par l'admin
    IF NOT p_is_active THEN
        RETURN FALSE;
    END IF;

    -- 2. Vérifier l'essai gratuit
    SELECT trial_ending INTO v_trial_ending
    FROM profiles
    WHERE id = p_profile_id;

    IF v_trial_ending IS NOT NULL AND v_trial_ending > NOW() THEN
        RETURN TRUE; -- Essai actif = boutique visible
    END IF;

    -- 3. Vérifier l'abonnement Stripe actif
    SELECT EXISTS(
        SELECT 1 FROM user_products
        WHERE profile_id = p_profile_id
        AND stripe_subscription_status IN ('active', 'trialing')
    ) INTO v_has_active_subscription;

    RETURN v_has_active_subscription;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- METTRE À JOUR get_order_data
-- ==============================================

CREATE OR REPLACE FUNCTION get_order_data(
    p_slug VARCHAR(100),
    p_product_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_shop RECORD;
    v_product RECORD;
    v_custom_form RECORD;
    v_custom_fields JSONB;
    v_availabilities JSONB;
    v_unavailabilities JSONB;
    v_dates_with_limit_reached JSONB;
    v_is_shop_visible BOOLEAN;
BEGIN
    -- Récupérer la boutique
    SELECT * INTO v_shop
    FROM shops
    WHERE slug = p_slug;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    -- Vérifier la visibilité de la boutique
    v_is_shop_visible := is_shop_visible(v_shop.profile_id, v_shop.is_active);

    -- Si produit demandé, le récupérer
    IF p_product_id IS NOT NULL THEN
        SELECT * INTO v_product
        FROM products
        WHERE id = p_product_id AND profile_id = v_shop.profile_id AND is_active = TRUE;
    END IF;

    -- Récupérer le formulaire custom
    SELECT * INTO v_custom_form
    FROM custom_forms
    WHERE profile_id = v_shop.profile_id
    LIMIT 1;

    -- Récupérer les champs custom
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', cf.id,
                'label', cf.label,
                'field_type', cf.field_type,
                'is_required', cf.is_required,
                'options', cf.options,
                'order_index', cf.order_index
            )
            ORDER BY cf.order_index
        ),
        '[]'::jsonb
    ) INTO v_custom_fields
    FROM custom_form_fields cf
    WHERE (p_product_id IS NOT NULL AND cf.product_id = p_product_id)
       OR (p_product_id IS NULL AND cf.custom_form_id = v_custom_form.id);

    -- Récupérer les disponibilités
    SELECT COALESCE(jsonb_agg(a.*), '[]'::jsonb) INTO v_availabilities
    FROM availabilities a
    WHERE a.profile_id = v_shop.profile_id;

    -- Récupérer les indisponibilités
    SELECT COALESCE(jsonb_agg(u.*), '[]'::jsonb) INTO v_unavailabilities
    FROM unavailabilities u
    WHERE u.profile_id = v_shop.profile_id;

    -- Récupérer les dates avec limite atteinte
    SELECT COALESCE(jsonb_agg(DISTINCT o.pickup_date), '[]'::jsonb) INTO v_dates_with_limit_reached
    FROM orders o
    JOIN profiles p ON o.profile_id = p.id
    WHERE o.profile_id = v_shop.profile_id
      AND o.pickup_date >= CURRENT_DATE
      AND o.status NOT IN ('cancelled', 'rejected')
    GROUP BY o.pickup_date, p.daily_cake_limit
    HAVING COUNT(o.id) >= p.daily_cake_limit;

    -- Retourner tout en JSONB
    RETURN jsonb_build_object(
        'shop', to_jsonb(v_shop.*) || jsonb_build_object('is_visible', v_is_shop_visible),
        'product', to_jsonb(v_product.*),
        'customForm', to_jsonb(v_custom_form.*),
        'customFields', v_custom_fields,
        'availabilities', v_availabilities,
        'unavailabilities', v_unavailabilities,
        'datesWithLimitReached', v_dates_with_limit_reached
    );
END;
$$ LANGUAGE plpgsql;

