-- ==============================================
-- FIX : Enlever 'trialing' de is_shop_visible
-- ==============================================

-- L'enum subscription_status ne contient que 'active' et 'inactive'
-- Pas besoin de vérifier 'trialing'

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

    -- 2. Vérifier l'abonnement Stripe actif EN PREMIER (prioritaire)
    SELECT EXISTS(
        SELECT 1 FROM user_products
        WHERE profile_id = p_profile_id
        AND subscription_status = 'active'
    ) INTO v_has_active_subscription;

    IF v_has_active_subscription THEN
        RETURN TRUE; -- Abonnement actif = boutique visible
    END IF;

    -- 3. Si pas d'abonnement Stripe, vérifier l'essai gratuit (fallback)
    SELECT trial_ending INTO v_trial_ending
    FROM profiles
    WHERE id = p_profile_id;

    IF v_trial_ending IS NOT NULL AND v_trial_ending > NOW() THEN
        RETURN TRUE; -- Essai actif = boutique visible
    END IF;

    -- 4. Aucun plan actif
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

