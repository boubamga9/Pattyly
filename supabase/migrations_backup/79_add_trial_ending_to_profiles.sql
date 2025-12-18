-- ==============================================
-- MIGRATION : ESSAI GRATUIT VIA trial_ending
-- ==============================================

-- Au lieu de gérer l'essai via Stripe subscription,
-- on utilise une simple colonne trial_ending dans profiles
-- Plus simple, plus rapide, plus flexible

-- ==============================================
-- 1. AJOUTER trial_ending À profiles
-- ==============================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_ending TIMESTAMP WITH TIME ZONE;

-- Index pour les performances (vérification rapide des essais actifs)
CREATE INDEX IF NOT EXISTS idx_profiles_trial_ending ON profiles(trial_ending) WHERE trial_ending IS NOT NULL;

-- Commentaire
COMMENT ON COLUMN profiles.trial_ending IS 'Date de fin de la période d''essai gratuit (NULL = pas d''essai ou déjà converti)';

-- ==============================================
-- 2. METTRE À JOUR check_and_create_trial
-- ==============================================

-- La fonction setter maintenant trial_ending dans profiles
DROP FUNCTION IF EXISTS check_and_create_trial(VARCHAR);

CREATE OR REPLACE FUNCTION check_and_create_trial(p_paypal_me VARCHAR(255))
RETURNS JSONB AS $$
DECLARE
    user_profile_id UUID;
    already_exists BOOLEAN;
    new_trial_ending TIMESTAMP WITH TIME ZONE;
    trial_days INTEGER;
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
        -- Nouveau utilisateur : 7 jours d'essai
        trial_days := 7;
        new_trial_ending := NOW() + INTERVAL '7 days';
        
        INSERT INTO anti_fraud (paypal_me, created_at)
        VALUES (p_paypal_me, NOW());
    ELSE
        -- Utilisateur existant (fraude potentielle) : seulement 1 jour
        trial_days := 1;
        new_trial_ending := NOW() + INTERVAL '1 day';
    END IF;

    -- Mettre à jour trial_ending dans profiles
    UPDATE profiles
    SET trial_ending = new_trial_ending
    WHERE id = user_profile_id;

    -- Retourner les informations
    RETURN jsonb_build_object(
        'is_new_user', NOT already_exists,
        'trial_ending', new_trial_ending,
        'trial_days', trial_days
    );
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- 3. METTRE À JOUR get_user_permissions
-- ==============================================

-- Supprimer l'ancienne fonction (car on change le type de retour)
DROP FUNCTION IF EXISTS get_user_permissions(UUID);

CREATE OR REPLACE FUNCTION get_user_permissions(p_profile_id UUID)
RETURNS TABLE (
    has_shop BOOLEAN,
    has_payment_method BOOLEAN,
    trial_ending TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        EXISTS(SELECT 1 FROM shops WHERE profile_id = p_profile_id) as has_shop,
        EXISTS(SELECT 1 FROM payment_links WHERE profile_id = p_profile_id) as has_payment_method,
        p.trial_ending
    FROM profiles p
    WHERE p.id = p_profile_id;
END;
$$ LANGUAGE plpgsql;

