-- ==============================================
-- SUPPRESSION : Table anti_fraud
-- ==============================================
-- Cette migration supprime définitivement la table anti_fraud
-- et toutes ses dépendances (index, politiques RLS, fonctions)

BEGIN;

-- ==============================================
-- ÉTAPE 1 : Mettre à jour les fonctions qui utilisent anti_fraud
-- ==============================================

-- Mettre à jour get_onboarding_data pour retirer la référence à anti_fraud
CREATE OR REPLACE FUNCTION get_onboarding_data(p_profile_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
declare
  result json;
begin
  select json_build_object(
    'shop', (
      select json_build_object(
        'id', s.id,
        'name', s.name,
        'bio', s.bio,
        'slug', s.slug,
        'logo_url', s.logo_url,
        'instagram', s.instagram,
        'tiktok', s.tiktok,
        'website', s.website,
        'is_custom_accepted', s.is_custom_accepted,
        'is_active', s.is_active
      )
      from shops s
      where s.profile_id = p_profile_id
    ),
    'paypal_account', (
      select json_build_object(
        'id', pl.id,
        'paypal_me', pl.paypal_me,
        'is_active', pl.is_active,
        'created_at', pl.created_at
      )
      from payment_links pl
      where pl.profile_id = p_profile_id
      and pl.is_active = true
    ),
    'has_shop', (
      select count(*) > 0
      from shops s
      where s.profile_id = p_profile_id
    ),
    'has_paypal', (
      select count(*) > 0
      from payment_links pl
      where pl.profile_id = p_profile_id
      and pl.is_active = true
    ),
    'has_subscription', (
      select count(*) > 0
      from user_products up
      where up.profile_id = p_profile_id
    )
  ) into result;
  
  return result;
end;
$$;

-- Mettre à jour le commentaire de la fonction
COMMENT ON FUNCTION get_onboarding_data(uuid) IS 'Get onboarding status - anti_fraud check removed';

-- Supprimer la fonction check_and_create_trial (obsolète et dépend de anti_fraud)
DROP FUNCTION IF EXISTS check_and_create_trial(VARCHAR);
DROP FUNCTION IF EXISTS check_and_create_trial(uuid, text, text, text, text, text, text);
DROP FUNCTION IF EXISTS check_and_create_trial(text, text, uuid, text, text);

-- ==============================================
-- ÉTAPE 2 : Supprimer les politiques RLS (seulement si la table existe)
-- ==============================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'anti_fraud') THEN
    DROP POLICY IF EXISTS "Allow read access for all" ON anti_fraud;
    DROP POLICY IF EXISTS "Allow insert for service role" ON anti_fraud;
    DROP POLICY IF EXISTS "Allow update for service role" ON anti_fraud;
    DROP POLICY IF EXISTS "Allow delete for service role" ON anti_fraud;
  END IF;
END $$;

-- ==============================================
-- ÉTAPE 3 : Supprimer les index
-- ==============================================

DROP INDEX IF EXISTS idx_anti_fraud_fingerprint;
DROP INDEX IF EXISTS idx_anti_fraud_ip;
DROP INDEX IF EXISTS idx_anti_fraud_email;
DROP INDEX IF EXISTS idx_anti_fraud_created_at;
DROP INDEX IF EXISTS idx_anti_fraud_paypal_email;
DROP INDEX IF EXISTS idx_anti_fraud_merchant_id;
DROP INDEX IF EXISTS idx_anti_fraud_submitter_payer_id;
DROP INDEX IF EXISTS idx_anti_fraud_instagram;
DROP INDEX IF EXISTS idx_anti_fraud_tiktok;
DROP INDEX IF EXISTS idx_anti_fraud_paypal_me;

-- ==============================================
-- ÉTAPE 4 : Supprimer les contraintes (seulement si la table existe)
-- ==============================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'anti_fraud') THEN
    ALTER TABLE anti_fraud DROP CONSTRAINT IF EXISTS unique_fingerprint_ip_email;
  END IF;
END $$;

-- ==============================================
-- ÉTAPE 5 : Supprimer la table
-- ==============================================

DROP TABLE IF EXISTS anti_fraud;

-- ==============================================
-- ÉTAPE 6 : Vérification
-- ==============================================

DO $$
BEGIN
    -- Vérifier que la table n'existe plus
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'anti_fraud'
    ) THEN
        RAISE NOTICE '✅ Table anti_fraud supprimée avec succès';
    ELSE
        RAISE WARNING '⚠️ Table anti_fraud existe encore';
    END IF;
END $$;

COMMIT;

-- ==============================================
-- RÉSUMÉ
-- ==============================================
-- ✅ Fonction get_onboarding_data mise à jour (retrait de is_anti_fraud)
-- ✅ Fonction check_and_create_trial supprimée (obsolète)
-- ✅ Politiques RLS supprimées
-- ✅ Index supprimés
-- ✅ Contraintes supprimées
-- ✅ Table anti_fraud supprimée
-- ✅ Migration sécurisée pour la production

