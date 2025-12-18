-- ==============================================
-- FONCTION : check_premium_profiles
-- ==============================================
-- Permet de vérifier quels profiles ont un abonnement premium actif
-- Accessible aux utilisateurs anonymes (pour afficher le badge "vérifié")
-- Utilise SECURITY DEFINER pour contourner les RLS policies

CREATE OR REPLACE FUNCTION check_premium_profiles(
    p_profile_ids UUID[],
    p_premium_product_id TEXT DEFAULT 'prod_Selcz36pAfV3vV'
)
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_premium_profile_ids UUID[];
BEGIN
    -- Récupérer les profile_ids qui ont un abonnement premium actif
    SELECT ARRAY_AGG(DISTINCT profile_id)
    INTO v_premium_profile_ids
    FROM user_products
    WHERE profile_id = ANY(p_profile_ids)
        AND subscription_status = 'active'
        AND stripe_product_id = p_premium_product_id;
    
    -- Retourner un array vide si aucun résultat
    RETURN COALESCE(v_premium_profile_ids, ARRAY[]::UUID[]);
END;
$$;

-- Grant execute permissions to anonymous users
GRANT EXECUTE ON FUNCTION check_premium_profiles(UUID[], TEXT) TO anon;
GRANT EXECUTE ON FUNCTION check_premium_profiles(UUID[], TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION check_premium_profiles(UUID[], TEXT) IS 'Vérifie quels profiles ont un abonnement premium actif. Accessible aux utilisateurs anonymes pour afficher le badge "vérifié".';

