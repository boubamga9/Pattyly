-- ==============================================
-- RPC : Vérifier l'éligibilité Early Adopter
-- ==============================================

CREATE OR REPLACE FUNCTION check_early_adopter_eligibility(p_profile_id UUID)
RETURNS TABLE (
    is_eligible BOOLEAN,
    already_early_adopter BOOLEAN,
    offer_already_shown BOOLEAN,
    spots_remaining INTEGER
) AS $$
DECLARE
    v_early_adopter_count INTEGER;
    v_max_early_adopters INTEGER := 30;
    v_is_early_adopter BOOLEAN;
    v_offer_shown_at TIMESTAMP WITH TIME ZONE;
    v_spots_remaining INTEGER;
    v_is_eligible BOOLEAN;
BEGIN
    -- Récupérer les infos de l'utilisateur
    SELECT 
        COALESCE(p.is_early_adopter, FALSE),
        p.early_adopter_offer_shown_at
    INTO 
        v_is_early_adopter,
        v_offer_shown_at
    FROM profiles p
    WHERE p.id = p_profile_id;

    -- Compter le nombre d'early adopters actuels
    SELECT COUNT(*)
    INTO v_early_adopter_count
    FROM profiles
    WHERE is_early_adopter = TRUE;

    -- Calculer les places restantes
    v_spots_remaining := v_max_early_adopters - v_early_adopter_count;
    v_spots_remaining := GREATEST(v_spots_remaining, 0); -- Minimum 0

    -- Déterminer l'éligibilité
    v_is_eligible := 
        v_offer_shown_at IS NULL AND  -- Offre jamais vue
        NOT v_is_early_adopter AND    -- Pas déjà early adopter
        v_spots_remaining > 0;        -- Il reste des places

    -- Retourner le résultat
    RETURN QUERY SELECT 
        v_is_eligible,
        v_is_early_adopter,
        v_offer_shown_at IS NOT NULL,
        v_spots_remaining;
END;
$$ LANGUAGE plpgsql;

-- Permissions
GRANT EXECUTE ON FUNCTION check_early_adopter_eligibility(UUID) TO authenticated;
