-- ==============================================
-- FIX : is_shop_visible doit prendre en compte is_stripe_free (version finale)
-- ==============================================

-- Les utilisateurs exempt (is_stripe_free = true) doivent avoir leur boutique visible
-- même sans abonnement Stripe actif
-- Cette migration écrase la version précédente pour s'assurer que is_stripe_free est pris en compte

CREATE OR REPLACE FUNCTION is_shop_visible(
    p_profile_id UUID,
    p_is_active BOOLEAN
)
RETURNS BOOLEAN AS $$
DECLARE
    v_trial_ending TIMESTAMP WITH TIME ZONE;
    v_has_active_subscription BOOLEAN;
    v_has_ever_had_subscription BOOLEAN;
    v_is_stripe_free BOOLEAN;
BEGIN
    -- 1. Si la boutique est manuellement désactivée par l'admin
    IF NOT p_is_active THEN
        RETURN FALSE;
    END IF;

    -- 2. ✅ PRIORITÉ ABSOLUE : Vérifier si l'utilisateur est exempt
    SELECT is_stripe_free
    INTO v_is_stripe_free
    FROM profiles
    WHERE id = p_profile_id;

    IF v_is_stripe_free THEN
        RETURN TRUE; -- Utilisateur exempt = boutique toujours visible
    END IF;

    -- 3. Vérifier si l'utilisateur a déjà eu un abonnement (actif ou inactif)
    SELECT EXISTS(
        SELECT 1 FROM user_products
        WHERE profile_id = p_profile_id
    ) INTO v_has_ever_had_subscription;

    -- 4. Vérifier l'abonnement Stripe actif
    SELECT EXISTS(
        SELECT 1 FROM user_products
        WHERE profile_id = p_profile_id
        AND subscription_status = 'active'
    ) INTO v_has_active_subscription;

    IF v_has_active_subscription THEN
        RETURN TRUE; -- Abonnement actif = boutique visible
    END IF;

    -- 5. Si l'utilisateur a déjà eu un abonnement, il ne peut plus utiliser l'essai gratuit
    IF v_has_ever_had_subscription THEN
        RETURN FALSE; -- A déjà payé → pas d'essai gratuit
    END IF;

    -- 6. Si jamais eu d'abonnement, vérifier l'essai gratuit (fallback)
    SELECT trial_ending INTO v_trial_ending
    FROM profiles
    WHERE id = p_profile_id;

    IF v_trial_ending IS NOT NULL AND v_trial_ending > NOW() THEN
        RETURN TRUE; -- Essai actif = boutique visible
    END IF;

    -- 7. Aucun plan actif
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Commentaire
COMMENT ON FUNCTION is_shop_visible(UUID, BOOLEAN) IS 'Check if shop is visible - FINAL VERSION with is_stripe_free support for exempt users';


