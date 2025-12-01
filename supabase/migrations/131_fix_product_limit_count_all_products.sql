-- ==============================================
-- CORRECTION : Compter tous les produits dans la limite
-- ==============================================
-- Cette migration corrige la fonction check_product_limit pour compter
-- TOUS les produits (actifs ET désactivés) dans la limite.
-- Cela empêche les utilisateurs de bypasser la limite en désactivant des produits.

-- Mettre à jour la fonction check_product_limit
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
    
    -- ✅ CORRIGÉ : Compter TOUS les produits du shop (actifs ET désactivés)
    -- Cela empêche les utilisateurs de bypasser la limite en désactivant des produits
    SELECT COUNT(*)
    INTO v_product_count
    FROM products
    WHERE shop_id = p_shop_id;
    -- Suppression de la condition "AND is_active = true" pour compter tous les produits
    
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

-- Mettre à jour le commentaire
COMMENT ON FUNCTION check_product_limit(UUID, UUID) IS 'Vérifie si la limite de produits est atteinte pour un shop. Compte TOUS les produits (actifs et désactivés) pour empêcher le bypass de la limite.';

