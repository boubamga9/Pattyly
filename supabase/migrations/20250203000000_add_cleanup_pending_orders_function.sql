-- Migration pour ajouter une fonction de nettoyage des pending_orders anciennes
-- Cette fonction supprime les pending_orders de plus de 30 jours

CREATE OR REPLACE FUNCTION cleanup_old_pending_orders()
RETURNS TABLE(deleted_count INTEGER) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Supprimer les pending_orders de plus de 30 jours
    WITH deleted AS (
        DELETE FROM pending_orders
        WHERE created_at < NOW() - INTERVAL '30 days'
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    
    RETURN QUERY SELECT deleted_count;
END;
$$;

-- Commentaire pour documenter la fonction
COMMENT ON FUNCTION cleanup_old_pending_orders() IS 
'Supprime les pending_orders de plus de 30 jours. Retourne le nombre de lignes supprimées.';

