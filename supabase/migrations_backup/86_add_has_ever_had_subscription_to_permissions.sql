-- ==============================================
-- AMÉLIORATION : Ajouter has_ever_had_subscription à get_user_permissions
-- ==============================================

-- Évite de refaire une requête dans getUserPlan()
-- Tout est centralisé dans un seul RPC

DROP FUNCTION IF EXISTS get_user_permissions(UUID);

CREATE OR REPLACE FUNCTION get_user_permissions(p_profile_id UUID)
RETURNS TABLE (
    has_shop BOOLEAN,
    has_payment_method BOOLEAN,
    trial_ending TIMESTAMP WITH TIME ZONE,
    has_ever_had_subscription BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        EXISTS(SELECT 1 FROM shops WHERE profile_id = p_profile_id) as has_shop,
        EXISTS(SELECT 1 FROM payment_links WHERE profile_id = p_profile_id) as has_payment_method,
        p.trial_ending,
        EXISTS(SELECT 1 FROM user_products WHERE profile_id = p_profile_id) as has_ever_had_subscription
    FROM profiles p
    WHERE p.id = p_profile_id;
END;
$$ LANGUAGE plpgsql;

