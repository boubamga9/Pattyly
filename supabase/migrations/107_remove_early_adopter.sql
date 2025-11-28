-- ==============================================
-- SUPPRESSION : Fonctionnalité Early Adopter
-- ==============================================
-- Cette migration supprime toutes les références à Early Adopter

BEGIN;

-- ==============================================
-- ÉTAPE 1 : Supprimer la fonction RPC
-- ==============================================

DROP FUNCTION IF EXISTS check_early_adopter_eligibility(UUID);

-- ==============================================
-- ÉTAPE 2 : Supprimer les colonnes de profiles
-- ==============================================

-- Supprimer les colonnes early_adopter
ALTER TABLE profiles DROP COLUMN IF EXISTS early_adopter_offer_shown_at;
ALTER TABLE profiles DROP COLUMN IF EXISTS is_early_adopter;

-- Supprimer l'index associé
DROP INDEX IF EXISTS idx_profiles_is_early_adopter;

-- ==============================================
-- VÉRIFICATION
-- ==============================================

DO $$
BEGIN
    -- Vérifier que la fonction n'existe plus
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname = 'check_early_adopter_eligibility'
    ) THEN
        RAISE NOTICE '✅ check_early_adopter_eligibility supprimée avec succès';
    ELSE
        RAISE WARNING '⚠️ check_early_adopter_eligibility existe encore';
    END IF;
END $$;

COMMIT;

-- ==============================================
-- RÉSUMÉ
-- ==============================================
-- ✅ Fonction check_early_adopter_eligibility supprimée
-- ✅ Colonnes early_adopter_offer_shown_at et is_early_adopter supprimées
-- ✅ Index idx_profiles_is_early_adopter supprimé
-- ✅ Migration sécurisée pour la production


