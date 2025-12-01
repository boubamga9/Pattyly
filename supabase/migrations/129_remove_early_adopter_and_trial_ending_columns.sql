-- ==============================================
-- SUPPRESSION : Colonnes early_adopter et trial_ending
-- ==============================================
-- Cette migration supprime définitivement les colonnes :
-- - is_early_adopter
-- - early_adopter_offer_shown_at
-- - trial_ending
-- de la table profiles

BEGIN;

-- ==============================================
-- ÉTAPE 1 : Mettre à jour les fonctions RPC qui utilisent trial_ending
-- ==============================================

-- Mettre à jour execute_shop_transfer pour retirer trial_ending
CREATE OR REPLACE FUNCTION execute_shop_transfer(
    p_transfer_id UUID,
    p_new_user_id UUID,
    p_new_user_email TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_transfer RECORD;
    v_shop RECORD;
    v_old_profile_id UUID;
    v_result JSON;
BEGIN
    -- 1. Récupérer les données du transfert
    SELECT id, shop_id, paypal_me
    INTO v_transfer
    FROM shop_transfers
    WHERE id = p_transfer_id
    AND used_at IS NULL;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Transfer not found or already used');
    END IF;
    
    -- 2. Récupérer les données de la boutique
    SELECT slug, profile_id
    INTO v_shop
    FROM shops
    WHERE id = v_transfer.shop_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Shop not found');
    END IF;
    
    v_old_profile_id := v_shop.profile_id;
    
    -- 3. Mettre à jour profile_id de la boutique
    UPDATE shops
    SET profile_id = p_new_user_id
    WHERE id = v_transfer.shop_id;
    
    -- 4. Supprimer l'ancien payment_link et créer le nouveau
    DELETE FROM payment_links
    WHERE paypal_me = v_shop.slug;
    
    INSERT INTO payment_links (profile_id, paypal_me)
    VALUES (p_new_user_id, v_transfer.paypal_me);
    
    -- 5. Marquer le transfert comme utilisé
    UPDATE shop_transfers
    SET used_at = NOW()
    WHERE id = p_transfer_id;
    
    -- 7. Créer ou mettre à jour le profil (sans trial_ending)
    INSERT INTO profiles (id, email)
    VALUES (p_new_user_id, p_new_user_email)
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email;
    
    -- 8. Supprimer l'ancien profil (à la fin du processus)
    DELETE FROM profiles WHERE id = v_old_profile_id;
    
    -- Retourner le succès
    RETURN json_build_object(
        'success', true,
        'shop_id', v_transfer.shop_id,
        'old_profile_id', v_old_profile_id,
        'new_profile_id', p_new_user_id
    );
    
EXCEPTION
    WHEN OTHERS THEN
        -- En cas d'erreur, retourner les détails
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'shop_id', v_transfer.shop_id,
            'old_profile_id', v_old_profile_id
        );
END;
$$;

-- Mettre à jour execute_shop_transfer_by_email pour retirer trial_ending
CREATE OR REPLACE FUNCTION execute_shop_transfer_by_email(
    p_target_email TEXT,
    p_new_user_id UUID,
    p_new_user_email TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_transfer RECORD;
    v_shop RECORD;
    v_old_profile_id UUID;
    v_result JSON;
BEGIN
    -- 1. Récupérer les données du transfert par email
    SELECT id, shop_id, paypal_me
    INTO v_transfer
    FROM shop_transfers
    WHERE target_email = p_target_email
    AND used_at IS NULL;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'No pending transfer found for this email');
    END IF;
    
    -- 2. Récupérer les données de la boutique
    SELECT slug, profile_id
    INTO v_shop
    FROM shops
    WHERE id = v_transfer.shop_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Shop not found');
    END IF;
    
    v_old_profile_id := v_shop.profile_id;
    
    -- 3. Mettre à jour profile_id de la boutique
    UPDATE shops
    SET profile_id = p_new_user_id
    WHERE id = v_transfer.shop_id;
    
    -- 4. Supprimer l'ancien payment_link et créer le nouveau
    DELETE FROM payment_links
    WHERE paypal_me = v_shop.slug;
    
    INSERT INTO payment_links (profile_id, paypal_me)
    VALUES (p_new_user_id, v_transfer.paypal_me);
    
    -- 5. Marquer le transfert comme utilisé
    UPDATE shop_transfers
    SET used_at = NOW()
    WHERE id = v_transfer.id;
    
    -- 6. Créer ou mettre à jour le profil (sans trial_ending)
    INSERT INTO profiles (id, email)
    VALUES (p_new_user_id, p_new_user_email)
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email;
    
    -- 7. Supprimer l'ancien profil (à la fin du processus)
    DELETE FROM profiles WHERE id = v_old_profile_id;
    
    -- Retourner le succès
    RETURN json_build_object(
        'success', true,
        'shop_id', v_transfer.shop_id,
        'transfer_id', v_transfer.id,
        'old_profile_id', v_old_profile_id,
        'new_profile_id', p_new_user_id
    );
    
EXCEPTION
    WHEN OTHERS THEN
        -- En cas d'erreur, retourner les détails
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'shop_id', v_transfer.shop_id,
            'old_profile_id', v_old_profile_id
        );
END;
$$;

-- ==============================================
-- ÉTAPE 2 : Supprimer les index associés
-- ==============================================

DROP INDEX IF EXISTS idx_profiles_is_early_adopter;
DROP INDEX IF EXISTS idx_profiles_trial_ending;

-- ==============================================
-- ÉTAPE 3 : Supprimer les colonnes de profiles
-- ==============================================

ALTER TABLE profiles DROP COLUMN IF EXISTS is_early_adopter;
ALTER TABLE profiles DROP COLUMN IF EXISTS early_adopter_offer_shown_at;
ALTER TABLE profiles DROP COLUMN IF EXISTS trial_ending;

-- ==============================================
-- ÉTAPE 4 : Vérification
-- ==============================================

DO $$
DECLARE
    v_column_exists BOOLEAN;
BEGIN
    -- Vérifier que is_early_adopter n'existe plus
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'is_early_adopter'
    ) INTO v_column_exists;
    
    IF NOT v_column_exists THEN
        RAISE NOTICE '✅ Colonne is_early_adopter supprimée avec succès';
    ELSE
        RAISE WARNING '⚠️ Colonne is_early_adopter existe encore';
    END IF;
    
    -- Vérifier que early_adopter_offer_shown_at n'existe plus
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'early_adopter_offer_shown_at'
    ) INTO v_column_exists;
    
    IF NOT v_column_exists THEN
        RAISE NOTICE '✅ Colonne early_adopter_offer_shown_at supprimée avec succès';
    ELSE
        RAISE WARNING '⚠️ Colonne early_adopter_offer_shown_at existe encore';
    END IF;
    
    -- Vérifier que trial_ending n'existe plus
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'trial_ending'
    ) INTO v_column_exists;
    
    IF NOT v_column_exists THEN
        RAISE NOTICE '✅ Colonne trial_ending supprimée avec succès';
    ELSE
        RAISE WARNING '⚠️ Colonne trial_ending existe encore';
    END IF;
END $$;

COMMIT;

-- ==============================================
-- RÉSUMÉ
-- ==============================================
-- ✅ Fonctions execute_shop_transfer et execute_shop_transfer_by_email mises à jour (retrait de trial_ending)
-- ✅ Index idx_profiles_is_early_adopter supprimé
-- ✅ Index idx_profiles_trial_ending supprimé
-- ✅ Colonnes is_early_adopter, early_adopter_offer_shown_at et trial_ending supprimées
-- ✅ Migration sécurisée pour la production

