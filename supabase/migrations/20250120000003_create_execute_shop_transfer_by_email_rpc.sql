-- Migration pour créer la fonction RPC execute_shop_transfer_by_email
-- Cette fonction encapsule toute la logique de transfert de boutique en prenant l'email

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
    
    -- 5. Mettre à jour anti_fraud
    UPDATE anti_fraud
    SET paypal_me = v_transfer.paypal_me
    WHERE paypal_me = v_shop.slug;
    
    -- 6. Marquer le transfert comme utilisé
    UPDATE shop_transfers
    SET used_at = NOW()
    WHERE id = v_transfer.id;
    
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

-- Permissions
GRANT EXECUTE ON FUNCTION execute_shop_transfer_by_email(TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION execute_shop_transfer_by_email(TEXT, UUID, TEXT) TO service_role;

-- Commentaire
COMMENT ON FUNCTION execute_shop_transfer_by_email(TEXT, UUID, TEXT) IS 'Execute complete shop transfer process by email - finds transfer, transfers shop ownership and cleans up old user data';
