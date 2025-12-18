-- ==============================================
-- MIGRATION : MISE À JOUR LIMITE PLAN GRATUIT (15 → 10)
-- ==============================================

-- Mettre à jour la fonction pour limiter le plan gratuit à 10 commandes
CREATE OR REPLACE FUNCTION get_order_limit(p_plan TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    CASE p_plan
        WHEN 'free' THEN
            RETURN 10;
        WHEN 'basic' THEN
            RETURN 30;
        WHEN 'premium' THEN
            RETURN 999999; -- Illimité
        WHEN 'exempt' THEN
            RETURN 999999; -- Illimité
        ELSE
            RETURN 10; -- Par défaut, plan gratuit
    END CASE;
END;
$$;

-- Mettre à jour le commentaire
COMMENT ON FUNCTION get_order_limit(TEXT) IS 'Retourne la limite de commandes selon le plan (10 pour free, 30 pour basic, 999999 pour premium/exempt)';

