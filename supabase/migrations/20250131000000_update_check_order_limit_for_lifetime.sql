-- Migration: Mise à jour de check_order_limit pour supporter le plan lifetime
-- Cette fonction doit accepter les IDs de produits Stripe en paramètres et passer le lifetime_product_id à get_user_plan

CREATE OR REPLACE FUNCTION "public"."check_order_limit"(
    "p_shop_id" "uuid", 
    "p_profile_id" "uuid",
    "p_premium_product_id" "text" DEFAULT 'prod_Selcz36pAfV3vV'::"text",
    "p_basic_product_id" "text" DEFAULT 'prod_Selbd3Ne2plHqG'::"text",
    "p_lifetime_product_id" "text" DEFAULT NULL
) RETURNS json
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
    v_plan TEXT;
    v_order_count INTEGER;
    v_order_limit INTEGER;
    v_remaining INTEGER;
    v_is_limit_reached BOOLEAN;
    v_result JSON;
BEGIN
    -- Récupérer le plan de l'utilisateur avec support du lifetime
    SELECT get_user_plan(
        p_profile_id, 
        p_premium_product_id, 
        p_basic_product_id,
        p_lifetime_product_id
    )
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

COMMENT ON FUNCTION "public"."check_order_limit"("p_shop_id" "uuid", "p_profile_id" "uuid", "p_premium_product_id" "text", "p_basic_product_id" "text", "p_lifetime_product_id" "text") IS 'Vérifie si la limite de commandes est atteinte pour un shop et retourne les statistiques. Supporte le plan lifetime.';

