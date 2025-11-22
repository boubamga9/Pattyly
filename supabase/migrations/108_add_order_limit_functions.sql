-- ==============================================
-- MIGRATION : LIMITATION DES COMMANDES PAR PLAN
-- ==============================================

-- Fonction pour compter les commandes du mois calendaire en cours pour un shop
CREATE OR REPLACE FUNCTION get_monthly_order_count(p_shop_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INTEGER;
    v_first_day_of_month DATE;
    v_last_day_of_month DATE;
BEGIN
    -- Calculer le premier et dernier jour du mois en cours
    v_first_day_of_month := DATE_TRUNC('month', CURRENT_DATE)::DATE;
    v_last_day_of_month := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE;
    
    -- Compter toutes les commandes du mois calendaire en cours
    SELECT COUNT(*)
    INTO v_count
    FROM orders
    WHERE shop_id = p_shop_id
    AND created_at >= v_first_day_of_month
    AND created_at < v_last_day_of_month + INTERVAL '1 day';
    
    RETURN COALESCE(v_count, 0);
END;
$$;

-- Fonction pour obtenir la limite de commandes selon le plan
CREATE OR REPLACE FUNCTION get_order_limit(p_plan TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    CASE p_plan
        WHEN 'free' THEN
            RETURN 15;
        WHEN 'basic' THEN
            RETURN 30;
        WHEN 'premium' THEN
            RETURN 999999; -- Illimité
        WHEN 'exempt' THEN
            RETURN 999999; -- Illimité
        ELSE
            RETURN 15; -- Par défaut, plan gratuit
    END CASE;
END;
$$;

-- Fonction pour vérifier si la limite est atteinte
CREATE OR REPLACE FUNCTION check_order_limit(p_shop_id UUID, p_profile_id UUID)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_plan TEXT;
    v_order_count INTEGER;
    v_order_limit INTEGER;
    v_remaining INTEGER;
    v_is_limit_reached BOOLEAN;
    v_result JSON;
BEGIN
    -- Récupérer le plan de l'utilisateur
    SELECT get_user_plan(p_profile_id, 'prod_Selcz36pAfV3vV', 'prod_Selbd3Ne2plHqG')
    INTO v_plan;
    
    -- Si pas de plan, utiliser 'free' par défaut
    IF v_plan IS NULL THEN
        v_plan := 'free';
    END IF;
    
    -- Obtenir la limite selon le plan
    v_order_limit := get_order_limit(v_plan);
    
    -- Compter les commandes du mois
    v_order_count := get_monthly_order_count(p_shop_id);
    
    -- Calculer les commandes restantes
    v_remaining := GREATEST(0, v_order_limit - v_order_count);
    
    -- Vérifier si la limite est atteinte
    v_is_limit_reached := v_order_count >= v_order_limit;
    
    -- Construire le résultat JSON
    SELECT json_build_object(
        'plan', v_plan,
        'orderCount', v_order_count,
        'orderLimit', v_order_limit,
        'remaining', v_remaining,
        'isLimitReached', v_is_limit_reached
    ) INTO v_result;
    
    RETURN v_result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_monthly_order_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_order_limit(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_order_limit(UUID, UUID) TO authenticated;

-- Comments
COMMENT ON FUNCTION get_monthly_order_count(UUID) IS 'Compte les commandes du mois calendaire en cours pour un shop';
COMMENT ON FUNCTION get_order_limit(TEXT) IS 'Retourne la limite de commandes selon le plan (15 pour free, 30 pour basic, 999999 pour premium/exempt)';
COMMENT ON FUNCTION check_order_limit(UUID, UUID) IS 'Vérifie si la limite de commandes est atteinte pour un shop et retourne les statistiques';

