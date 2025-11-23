-- ==============================================
-- Migration 113: Create verify_shop_ownership RPC
-- ==============================================
-- Cette migration crée un RPC optimisé pour vérifier la propriété d'un shop
-- Utilisé dans les actions pour des vérifications de sécurité rapides
-- ==============================================

BEGIN;

-- Supprimer l'ancienne fonction si elle existe
DROP FUNCTION IF EXISTS verify_shop_ownership(UUID, UUID);

-- Créer la fonction de vérification de propriété
CREATE OR REPLACE FUNCTION verify_shop_ownership(
    p_profile_id UUID,
    p_shop_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS(
        SELECT 1 
        FROM shops 
        WHERE id = p_shop_id 
        AND profile_id = p_profile_id
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION verify_shop_ownership(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_shop_ownership(UUID, UUID) TO anon;

-- Add comment
COMMENT ON FUNCTION verify_shop_ownership(UUID, UUID) IS 
'Verify if a shop belongs to a specific profile. Returns true if the shop exists and belongs to the profile, false otherwise. Optimized for security checks in actions.';

COMMIT;

