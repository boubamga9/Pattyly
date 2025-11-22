-- ==============================================
-- NETTOYAGE : Suppression des éléments non utilisés
-- ==============================================
-- Cette migration supprime :
-- 1. Les colonnes early_adopter (déjà supprimées par migration 107, mais vérification)
-- 2. La fonction check_early_adopter_eligibility (déjà supprimée par migration 107, mais vérification)
-- 3. La colonne trial_ending (si vraiment plus utilisée)
-- 4. La fonction check_and_create_trial (si vraiment plus utilisée)

BEGIN;

-- ==============================================
-- ÉTAPE 1 : Vérifier et supprimer les colonnes early_adopter
-- ==============================================

-- Supprimer les colonnes early_adopter (déjà fait par migration 107, mais on vérifie)
ALTER TABLE profiles DROP COLUMN IF EXISTS early_adopter_offer_shown_at;
ALTER TABLE profiles DROP COLUMN IF EXISTS is_early_adopter;

-- Supprimer l'index associé (déjà fait par migration 107, mais on vérifie)
DROP INDEX IF EXISTS idx_profiles_is_early_adopter;

-- ==============================================
-- ÉTAPE 2 : Vérifier et supprimer la fonction check_early_adopter_eligibility
-- ==============================================

DROP FUNCTION IF EXISTS check_early_adopter_eligibility(UUID);

-- ==============================================
-- ÉTAPE 3 : Mettre à jour get_user_permissions pour retirer trial_ending
-- ==============================================

DROP FUNCTION IF EXISTS get_user_permissions(UUID);

CREATE OR REPLACE FUNCTION get_user_permissions(p_profile_id UUID)
RETURNS TABLE (
    has_shop BOOLEAN,
    has_payment_method BOOLEAN,
    has_ever_had_subscription BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        EXISTS(SELECT 1 FROM shops WHERE profile_id = p_profile_id) as has_shop,
        EXISTS(SELECT 1 FROM payment_links WHERE profile_id = p_profile_id) as has_payment_method,
        EXISTS(SELECT 1 FROM user_products WHERE profile_id = p_profile_id) as has_ever_had_subscription
    FROM profiles p
    WHERE p.id = p_profile_id;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- ÉTAPE 4 : Supprimer trial_ending
-- ==============================================
-- Supprimer la colonne trial_ending de profiles
ALTER TABLE profiles DROP COLUMN IF EXISTS trial_ending;

-- Supprimer l'index associé
DROP INDEX IF EXISTS idx_profiles_trial_ending;

-- ==============================================
-- ÉTAPE 5 : Supprimer check_and_create_trial
-- ==============================================
-- Supprimer toutes les versions possibles de la fonction
DROP FUNCTION IF EXISTS check_and_create_trial(VARCHAR);
DROP FUNCTION IF EXISTS check_and_create_trial(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS check_and_create_trial(UUID, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS check_and_create_trial(TEXT, TEXT, UUID, TEXT, TEXT);

-- ==============================================
-- VÉRIFICATION
-- ==============================================

DO $$
BEGIN
    -- Vérifier que les colonnes early_adopter n'existent plus
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'is_early_adopter'
    ) THEN
        RAISE NOTICE '✅ Colonne is_early_adopter supprimée';
    ELSE
        RAISE WARNING '⚠️ Colonne is_early_adopter existe encore';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'early_adopter_offer_shown_at'
    ) THEN
        RAISE NOTICE '✅ Colonne early_adopter_offer_shown_at supprimée';
    ELSE
        RAISE WARNING '⚠️ Colonne early_adopter_offer_shown_at existe encore';
    END IF;

    -- Vérifier que la fonction check_early_adopter_eligibility n'existe plus
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname = 'check_early_adopter_eligibility'
    ) THEN
        RAISE NOTICE '✅ Fonction check_early_adopter_eligibility supprimée';
    ELSE
        RAISE WARNING '⚠️ Fonction check_early_adopter_eligibility existe encore';
    END IF;
END $$;

COMMIT;

-- ==============================================
-- RÉSUMÉ
-- ==============================================
-- ✅ Colonnes early_adopter supprimées (is_early_adopter, early_adopter_offer_shown_at)
-- ✅ Fonction check_early_adopter_eligibility supprimée
-- ✅ Colonne trial_ending supprimée
-- ✅ Fonction check_and_create_trial supprimée (toutes les versions)

