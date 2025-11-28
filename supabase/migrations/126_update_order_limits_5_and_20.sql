-- ==============================================
-- MIGRATION : MISE À JOUR LIMITES DE COMMANDES (5 pour free, 20 pour basic)
-- ==============================================

-- Mettre à jour la fonction pour limiter le plan gratuit à 5 commandes et basic à 20
CREATE OR REPLACE FUNCTION get_order_limit(p_plan TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    CASE p_plan
        WHEN 'free' THEN
            RETURN 5;
        WHEN 'basic' THEN
            RETURN 20;
        WHEN 'premium' THEN
            RETURN 999999; -- Illimité
        WHEN 'exempt' THEN
            RETURN 999999; -- Illimité
        ELSE
            RETURN 5; -- Par défaut, plan gratuit
    END CASE;
END;
$$;

-- Mettre à jour le commentaire
COMMENT ON FUNCTION get_order_limit(TEXT) IS 'Retourne la limite de commandes selon le plan (5 pour free, 20 pour basic, 999999 pour premium/exempt)';

