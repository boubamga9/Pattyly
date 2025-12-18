-- Migration: Fix shop creation and transfer functions
-- Description: 
--   1. Fix create_shop_with_availabilities to ensure profile exists before creating shop
--   2. Fix execute_shop_transfer to handle unassigned variables in EXCEPTION block
--   3. Fix execute_shop_transfer_by_email to use new payment_links columns and handle unassigned variables
-- Date: 2025-12-17

-- ==============================================
-- PARTIE 1: Corriger create_shop_with_availabilities
-- ==============================================

CREATE OR REPLACE FUNCTION "public"."create_shop_with_availabilities"(
    "p_profile_id" "uuid", 
    "p_name" "text", 
    "p_bio" "text", 
    "p_slug" "text", 
    "p_logo_url" "text", 
    "p_instagram" "text", 
    "p_tiktok" "text", 
    "p_website" "text"
) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
    shop_id UUID;
    result JSON;
    v_user_email TEXT;
BEGIN
    -- Vérifier si le profil existe, sinon le créer
    -- On récupère l'email depuis auth.users
    SELECT email INTO v_user_email
    FROM auth.users
    WHERE id = p_profile_id;
    
    IF v_user_email IS NULL THEN
        RAISE EXCEPTION 'User not found in auth.users';
    END IF;
    
    -- Créer le profil s'il n'existe pas
    INSERT INTO profiles (id, email)
    VALUES (p_profile_id, v_user_email)
    ON CONFLICT (id) DO NOTHING;
    
    -- Insert shop
    INSERT INTO shops (
        profile_id, name, bio, slug, logo_url, 
        instagram, tiktok, website
    ) VALUES (
        p_profile_id, p_name, p_bio, p_slug, p_logo_url,
        p_instagram, p_tiktok, p_website
    ) RETURNING id INTO shop_id;
    
    -- Insert default availabilities (all days) with time slots and daily limit
    INSERT INTO availabilities (
        shop_id, 
        day, 
        is_open, 
        daily_order_limit,
        start_time,
        end_time,
        interval_time
    )
    SELECT 
        shop_id, 
        day, 
        (day >= 1 AND day <= 5) AS is_open,
        2 AS daily_order_limit,
        '09:00'::TIME AS start_time,
        '18:00'::TIME AS end_time,
        '01:00:00'::INTERVAL AS interval_time
    FROM generate_series(0, 6) AS day;
    
    -- Return shop data
    SELECT json_build_object(
        'id', s.id,
        'name', s.name,
        'bio', s.bio,
        'slug', s.slug,
        'logo_url', s.logo_url,
        'instagram', s.instagram,
        'tiktok', s.tiktok,
        'website', s.website
    ) INTO result
    FROM shops s
    WHERE s.id = shop_id;
    
    RETURN result;
END;
$$;

-- ==============================================
-- PARTIE 2: Corriger execute_shop_transfer
-- ==============================================

CREATE OR REPLACE FUNCTION "public"."execute_shop_transfer"(
    "p_transfer_id" "uuid", 
    "p_new_user_id" "uuid", 
    "p_new_user_email" "text"
) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
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
        -- Vérifier si les variables sont assignées avant de les utiliser
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'shop_id', CASE WHEN v_transfer IS NOT NULL THEN v_transfer.shop_id ELSE NULL END,
            'old_profile_id', v_old_profile_id
        );
END;
$$;

-- ==============================================
-- PARTIE 3: Corriger execute_shop_transfer_by_email
-- ==============================================

CREATE OR REPLACE FUNCTION "public"."execute_shop_transfer_by_email"(
    "p_target_email" "text", 
    "p_new_user_id" "uuid", 
    "p_new_user_email" "text"
) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
    v_transfer RECORD;
    v_shop RECORD;
    v_old_profile_id UUID;
    v_result JSON;
BEGIN
    -- 1. Récupérer les données du transfert par email
    -- Utiliser les nouvelles colonnes payment_identifier et provider_type
    SELECT id, shop_id, payment_identifier, provider_type
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
    -- Utiliser les nouvelles colonnes
    DELETE FROM payment_links
    WHERE payment_identifier = v_shop.slug
      AND provider_type = COALESCE(v_transfer.provider_type, 'paypal');
    
    INSERT INTO payment_links (profile_id, payment_identifier, provider_type)
    VALUES (p_new_user_id, v_transfer.payment_identifier, COALESCE(v_transfer.provider_type, 'paypal'));
    
    -- 5. Note: anti_fraud table was removed, no update needed
    
    -- 6. Marquer le transfert comme utilisé
    UPDATE shop_transfers
    SET used_at = NOW()
    WHERE id = v_transfer.id;
    
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
        'transfer_id', v_transfer.id,
        'old_profile_id', v_old_profile_id,
        'new_profile_id', p_new_user_id
    );
    
EXCEPTION
    WHEN OTHERS THEN
        -- En cas d'erreur, retourner les détails
        -- Vérifier si les variables sont assignées avant de les utiliser
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'shop_id', CASE WHEN v_transfer IS NOT NULL THEN v_transfer.shop_id ELSE NULL END,
            'old_profile_id', v_old_profile_id
        );
END;
$$;

-- Add comments
COMMENT ON FUNCTION "public"."create_shop_with_availabilities"("p_profile_id" "uuid", "p_name" "text", "p_bio" "text", "p_slug" "text", "p_logo_url" "text", "p_instagram" "text", "p_tiktok" "text", "p_website" "text") IS 'Create shop with default availabilities. Ensures profile exists before creating shop.';
COMMENT ON FUNCTION "public"."execute_shop_transfer"("p_transfer_id" "uuid", "p_new_user_id" "uuid", "p_new_user_email" "text") IS 'Execute complete shop transfer process - transfers shop ownership and cleans up old user data. Fixed to handle unassigned variables in exception block.';
COMMENT ON FUNCTION "public"."execute_shop_transfer_by_email"("p_target_email" "text", "p_new_user_id" "uuid", "p_new_user_email" "text") IS 'Execute complete shop transfer process by email - finds transfer, transfers shop ownership and cleans up old user data. Updated to use new payment_links columns and handle unassigned variables.';

