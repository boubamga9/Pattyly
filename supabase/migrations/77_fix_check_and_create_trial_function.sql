-- ==============================================
-- CORRECTION DE LA FONCTION check_and_create_trial
-- ==============================================

-- Avec le nouveau système PayPal.me, l'essai gratuit est géré par Stripe uniquement
-- Cette fonction sert principalement à créer la ligne anti_fraud pour empêcher
-- les abus (un même paypal_me ne peut avoir qu'un seul essai)

-- Supprimer l'ancienne fonction (car on change le type de retour)
DROP FUNCTION IF EXISTS check_and_create_trial(VARCHAR);

CREATE OR REPLACE FUNCTION check_and_create_trial(p_paypal_me VARCHAR(255))
RETURNS BOOLEAN AS $$
DECLARE
    user_profile_id UUID;
    already_exists BOOLEAN;
BEGIN
    -- Trouver l'utilisateur par paypal_me via payment_links
    SELECT pl.profile_id INTO user_profile_id
    FROM payment_links pl
    WHERE pl.paypal_me = p_paypal_me
    LIMIT 1;

    -- Si l'utilisateur n'existe pas, on ne peut pas créer d'essai
    IF user_profile_id IS NULL THEN
        RAISE EXCEPTION 'Payment link not found for paypal_me: %', p_paypal_me;
    END IF;

    -- Vérifier si une ligne anti_fraud existe déjà pour ce paypal_me
    SELECT EXISTS(SELECT 1 FROM anti_fraud WHERE paypal_me = p_paypal_me) INTO already_exists;

    -- Créer l'enregistrement anti_fraud si il n'existe pas déjà
    IF NOT already_exists THEN
        INSERT INTO anti_fraud (paypal_me, created_at)
        VALUES (p_paypal_me, NOW());
        
        -- Retourne TRUE = nouvel utilisateur (essai créé)
        RETURN TRUE;
    ELSE
        -- Retourne FALSE = utilisateur existant (pas d'essai)
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql;
