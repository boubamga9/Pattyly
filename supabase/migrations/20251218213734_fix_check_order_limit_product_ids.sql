-- Migration: Fix check_order_limit to accept Stripe product IDs as parameters
-- Problem: Function was using hardcoded product IDs that don't match production
-- Solution: Add parameters to accept product IDs from application config

-- Drop the old function
DROP FUNCTION IF EXISTS public.check_order_limit(uuid, uuid);

-- Create the updated function with product ID parameters
CREATE OR REPLACE FUNCTION public.check_order_limit(
    p_shop_id uuid, 
    p_profile_id uuid,
    p_premium_product_id text DEFAULT 'prod_Selcz36pAfV3vV'::text,
    p_basic_product_id text DEFAULT 'prod_Selbd3Ne2plHqG'::text
)
RETURNS json
LANGUAGE plpgsql
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
    v_plan TEXT;
    v_order_count INTEGER;
    v_order_limit INTEGER;
    v_remaining INTEGER;
    v_is_limit_reached BOOLEAN;
    v_result JSON;
BEGIN
    -- Récupérer le plan de l'utilisateur avec les IDs passés en paramètres
    SELECT get_user_plan(p_profile_id, p_premium_product_id, p_basic_product_id)
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
$function$;

-- Update function comment
COMMENT ON FUNCTION public.check_order_limit(uuid, uuid, text, text) IS 'Vérifie si la limite de commandes est atteinte pour un shop. Accepte maintenant les IDs de produits Stripe en paramètres pour supporter différents environnements (dev/prod). Les valeurs par défaut sont conservées pour la rétrocompatibilité.';

-- Grant permissions (same as before)
GRANT EXECUTE ON FUNCTION public.check_order_limit(uuid, uuid, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.check_order_limit(uuid, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_order_limit(uuid, uuid, text, text) TO service_role;

