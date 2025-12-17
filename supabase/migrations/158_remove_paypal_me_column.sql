-- Migration: Remove paypal_me column and migrate to payment_identifier
-- Description: Migrates all code to use payment_identifier instead of paypal_me, then removes the column
-- Note: anti_fraud table and check_and_create_trial function were already removed in migration 130
-- Date: 2025-01-XX

-- ==============================================
-- 2. METTRE À JOUR LES FONCTIONS SQL
-- ==============================================

-- Mettre à jour get_onboarding_data pour utiliser payment_identifier
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
    -- Retourner le premier payment_link trouvé pour rétrocompatibilité
    'paypal_account', (
      select json_build_object(
        'id', pl.id,
        'payment_identifier', pl.payment_identifier,
        'provider_type', pl.provider_type,
        'is_active', pl.is_active,
        'created_at', pl.created_at
      )
      from payment_links pl
      where pl.profile_id = p_profile_id
      and (pl.is_active = true OR pl.is_active IS NULL)
      order by 
        case when pl.provider_type = 'paypal' then 1 else 2 end,
        pl.created_at
      limit 1
    ),
    'has_shop', (
      select count(*) > 0
      from shops s
      where s.profile_id = p_profile_id
    ),
    -- Vérifier qu'il y a au moins un payment_link (peu importe le provider)
    'has_paypal', (
      select count(*) > 0
      from payment_links pl
      where pl.profile_id = p_profile_id
      and (pl.is_active = true OR pl.is_active IS NULL)
    ),
    'has_subscription', (
      select count(*) > 0
      from user_products up
      where up.profile_id = p_profile_id
    )
    -- Note: is_anti_fraud removed - anti_fraud table was deleted in migration 130
  ) into result;
  
  return result;
end;
$$;

-- Note: check_and_create_trial function was already removed in migration 130
-- No need to recreate it as trial management is now handled by Stripe only

-- ==============================================
-- 3. METTRE À JOUR LES INDEX
-- ==============================================

-- Supprimer l'ancien index sur paypal_me
DROP INDEX IF EXISTS idx_payment_links_paypal_me;

-- Créer un index sur payment_identifier si nécessaire
CREATE INDEX IF NOT EXISTS idx_payment_links_payment_identifier 
  ON payment_links(payment_identifier);

-- Note: anti_fraud table was removed in migration 130, no index needed

-- ==============================================
-- 4. METTRE À JOUR LA TABLE SHOP_TRANSFERS
-- ==============================================

-- Ajouter payment_identifier et provider_type à shop_transfers
ALTER TABLE shop_transfers 
  ADD COLUMN IF NOT EXISTS payment_identifier TEXT,
  ADD COLUMN IF NOT EXISTS provider_type TEXT DEFAULT 'paypal' CHECK (provider_type IN ('paypal', 'revolut'));

-- Migrer les données existantes
UPDATE shop_transfers 
SET payment_identifier = paypal_me,
    provider_type = 'paypal'
WHERE payment_identifier IS NULL AND paypal_me IS NOT NULL;

-- Rendre payment_identifier NOT NULL après migration
ALTER TABLE shop_transfers 
  ALTER COLUMN payment_identifier SET NOT NULL;

-- Supprimer la colonne paypal_me de shop_transfers
ALTER TABLE shop_transfers 
  DROP COLUMN IF EXISTS paypal_me;

-- ==============================================
-- 5. SUPPRIMER LA COLONNE PAYPAL_ME DE PAYMENT_LINKS
-- ==============================================

-- Supprimer la colonne paypal_me de payment_links
ALTER TABLE payment_links 
  DROP COLUMN IF EXISTS paypal_me;

-- ==============================================
-- 6. METTRE À JOUR LES FONCTIONS RPC POUR SHOP_TRANSFERS
-- ==============================================

-- Mettre à jour execute_shop_transfer pour utiliser payment_identifier
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
    SELECT id, shop_id, payment_identifier, provider_type
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
    WHERE payment_identifier = v_shop.slug
      AND provider_type = 'paypal';
    
    INSERT INTO payment_links (profile_id, payment_identifier, provider_type)
    VALUES (p_new_user_id, v_transfer.payment_identifier, v_transfer.provider_type);
    
    -- 5. Note: anti_fraud table was removed in migration 130, no update needed
    
    -- 6. Marquer le transfert comme utilisé
    UPDATE shop_transfers
    SET used_at = NOW()
    WHERE id = p_transfer_id;
    
    -- 7. Créer ou mettre à jour le profil avec trial_ending (7 jours)
    INSERT INTO profiles (id, email, trial_ending)
    VALUES (p_new_user_id, p_new_user_email, NOW() + INTERVAL '7 days')
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        trial_ending = EXCLUDED.trial_ending;
    
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

-- ==============================================
-- 7. METTRE À JOUR LES COMMENTAIRES
-- ==============================================

COMMENT ON COLUMN payment_links.payment_identifier IS 'Identifiant du provider (ex: nom PayPal.me, identifiant Revolut)';
-- Note: anti_fraud table and check_and_create_trial function were removed in migration 130

