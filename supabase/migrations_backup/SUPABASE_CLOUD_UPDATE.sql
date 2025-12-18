-- ==============================================
-- MISE À JOUR SUPABASE CLOUD
-- ==============================================
-- Script SQL consolidé pour mettre à jour Supabase Cloud
-- Contient les migrations 108, 109 et 110
-- 
-- À exécuter dans l'éditeur SQL de Supabase Cloud
-- ==============================================

BEGIN;

-- ==============================================
-- MIGRATION 108 : LIMITATION DES COMMANDES PAR PLAN
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
COMMENT ON FUNCTION get_order_limit(TEXT) IS 'Retourne la limite de commandes selon le plan (10 pour free, 30 pour basic, 999999 pour premium/exempt)';
COMMENT ON FUNCTION check_order_limit(UUID, UUID) IS 'Vérifie si la limite de commandes est atteinte pour un shop et retourne les statistiques';

-- ==============================================
-- MIGRATION 109 : CHAMPS DIRECTORY POUR L'ANNUAIRE
-- ==============================================

-- Add directory fields to shops table
ALTER TABLE shops
ADD COLUMN IF NOT EXISTS directory_city TEXT,
ADD COLUMN IF NOT EXISTS directory_actual_city TEXT,
ADD COLUMN IF NOT EXISTS directory_postal_code TEXT,
ADD COLUMN IF NOT EXISTS directory_cake_types TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS directory_enabled BOOLEAN DEFAULT FALSE;

-- Add constraints
DO $$
BEGIN
    -- Supprimer les contraintes si elles existent déjà
    ALTER TABLE shops DROP CONSTRAINT IF EXISTS shops_directory_city_check;
    ALTER TABLE shops DROP CONSTRAINT IF EXISTS shops_directory_actual_city_check;
    ALTER TABLE shops DROP CONSTRAINT IF EXISTS shops_directory_postal_code_check;
    
    -- Ajouter les contraintes
    ALTER TABLE shops
    ADD CONSTRAINT shops_directory_city_check CHECK (
        directory_city IS NULL OR char_length(directory_city) <= 100
    ),
    ADD CONSTRAINT shops_directory_actual_city_check CHECK (
        directory_actual_city IS NULL OR char_length(directory_actual_city) <= 100
    ),
    ADD CONSTRAINT shops_directory_postal_code_check CHECK (
        directory_postal_code IS NULL OR directory_postal_code ~ '^[0-9]{5}$'
    );
END $$;

-- Add comments for documentation
COMMENT ON COLUMN shops.directory_city IS 'Grande ville la plus proche pour l''annuaire (ex: Paris, Lyon)';
COMMENT ON COLUMN shops.directory_actual_city IS 'Vraie ville avec autocomplétion (ex: Montreuil, Villeurbanne)';
COMMENT ON COLUMN shops.directory_postal_code IS 'Code postal (5 chiffres)';
COMMENT ON COLUMN shops.directory_cake_types IS 'Types de gâteaux proposés pour l''annuaire (array)';
COMMENT ON COLUMN shops.directory_enabled IS 'Si true, la boutique apparaît dans l''annuaire';

-- Create index for directory searches
CREATE INDEX IF NOT EXISTS idx_shops_directory_city ON shops(directory_city) WHERE directory_enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_shops_directory_cake_types ON shops USING GIN(directory_cake_types) WHERE directory_enabled = TRUE;

-- ==============================================
-- MIGRATION 110 : NETTOYAGE TRIAL_ENDING ET EARLY_ADOPTER
-- ==============================================

-- ÉTAPE 1 : Supprimer les colonnes early_adopter
ALTER TABLE profiles DROP COLUMN IF EXISTS early_adopter_offer_shown_at;
ALTER TABLE profiles DROP COLUMN IF EXISTS is_early_adopter;
DROP INDEX IF EXISTS idx_profiles_is_early_adopter;

-- ÉTAPE 2 : Supprimer la fonction check_early_adopter_eligibility
DROP FUNCTION IF EXISTS check_early_adopter_eligibility(UUID);

-- ÉTAPE 3 : Mettre à jour get_user_permissions pour retirer trial_ending
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

-- ÉTAPE 4 : Supprimer trial_ending
ALTER TABLE profiles DROP COLUMN IF EXISTS trial_ending;
DROP INDEX IF EXISTS idx_profiles_trial_ending;

-- ÉTAPE 5 : Supprimer check_and_create_trial (toutes les versions)
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

    -- Vérifier que trial_ending n'existe plus
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'trial_ending'
    ) THEN
        RAISE NOTICE '✅ Colonne trial_ending supprimée';
    ELSE
        RAISE WARNING '⚠️ Colonne trial_ending existe encore';
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

    -- Vérifier que check_and_create_trial n'existe plus
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname = 'check_and_create_trial'
    ) THEN
        RAISE NOTICE '✅ Fonction check_and_create_trial supprimée';
    ELSE
        RAISE WARNING '⚠️ Fonction check_and_create_trial existe encore';
    END IF;
END $$;

COMMIT;

-- ==============================================
-- RÉSUMÉ
-- ==============================================
-- ✅ Migration 108 : Fonctions de limitation des commandes créées
-- ✅ Migration 109 : Champs directory ajoutés à shops
-- ✅ Colonnes early_adopter supprimées (is_early_adopter, early_adopter_offer_shown_at)
-- ✅ Fonction check_early_adopter_eligibility supprimée
-- ✅ Colonne trial_ending supprimée
-- ✅ Fonction check_and_create_trial supprimée (toutes les versions)
-- ✅ Fonction get_user_permissions mise à jour (retrait de trial_ending)

