-- ==============================================
-- MIGRATION : LIMITATION DES PRODUITS (GÂTEAUX) PAR PLAN
-- ==============================================

-- Fonction pour obtenir la limite de produits selon le plan
CREATE OR REPLACE FUNCTION get_product_limit(p_plan TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    CASE p_plan
        WHEN 'free' THEN
            RETURN 3;
        WHEN 'basic' THEN
            RETURN 10;
        WHEN 'premium' THEN
            RETURN 999999; -- Illimité
        WHEN 'exempt' THEN
            RETURN 999999; -- Illimité
        ELSE
            RETURN 3; -- Par défaut, plan gratuit
    END CASE;
END;
$$;

-- Fonction pour vérifier si la limite de produits est atteinte
CREATE OR REPLACE FUNCTION check_product_limit(p_shop_id UUID, p_profile_id UUID)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_plan TEXT;
    v_product_count INTEGER;
    v_product_limit INTEGER;
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
    v_product_limit := get_product_limit(v_plan);
    
    -- Compter les produits actifs du shop
    SELECT COUNT(*)
    INTO v_product_count
    FROM products
    WHERE shop_id = p_shop_id
    AND is_active = true;
    
    -- Calculer les produits restants
    v_remaining := GREATEST(0, v_product_limit - v_product_count);
    
    -- Vérifier si la limite est atteinte
    v_is_limit_reached := v_product_count >= v_product_limit;
    
    -- Construire le résultat JSON
    SELECT json_build_object(
        'plan', v_plan,
        'productCount', v_product_count,
        'productLimit', v_product_limit,
        'remaining', v_remaining,
        'isLimitReached', v_is_limit_reached
    ) INTO v_result;
    
    RETURN v_result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_product_limit(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_product_limit(UUID, UUID) TO authenticated;

-- Comments
COMMENT ON FUNCTION get_product_limit(TEXT) IS 'Retourne la limite de produits selon le plan (3 pour free, 10 pour basic, 999999 pour premium/exempt)';
COMMENT ON FUNCTION check_product_limit(UUID, UUID) IS 'Vérifie si la limite de produits est atteinte pour un shop et retourne les statistiques';

