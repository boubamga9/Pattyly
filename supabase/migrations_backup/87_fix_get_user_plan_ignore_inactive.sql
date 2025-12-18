-- ==============================================
-- FIX : get_user_plan doit ignorer les abonnements inactifs
-- ==============================================

-- Le RPC ne doit retourner un plan QUE si subscription_status = 'active'
-- Si l'abonnement est inactif, retourner null pour que getUserPlan() 
-- puisse vérifier hasEverHadSubscription et retourner null (accès limité)

DROP FUNCTION IF EXISTS get_user_plan(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION get_user_plan(
  p_profile_id UUID,
  premium_product_id TEXT DEFAULT 'prod_Selcz36pAfV3vV',
  basic_product_id TEXT DEFAULT 'prod_Selbd3Ne2plHqG'
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_is_free BOOLEAN;
  v_product_id TEXT;
BEGIN
  -- Vérifie si l'utilisateur est exempt
  SELECT is_stripe_free
  INTO v_is_free
  FROM profiles
  WHERE id = p_profile_id;

  IF v_is_free THEN
    RETURN 'exempt';
  END IF;

  -- Récupère SEULEMENT l'abonnement ACTIF (pas inactive)
  SELECT stripe_product_id
  INTO v_product_id
  FROM user_products
  WHERE profile_id = p_profile_id
  AND subscription_status = 'active'  -- ✅ Seulement les abonnements actifs
  LIMIT 1;

  IF v_product_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Comparaison avec les paramètres
  IF v_product_id = premium_product_id THEN
    RETURN 'premium';
  ELSIF v_product_id = basic_product_id THEN
    RETURN 'basic';
  ELSE
    RETURN NULL;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_plan(UUID, TEXT, TEXT) TO authenticated;

