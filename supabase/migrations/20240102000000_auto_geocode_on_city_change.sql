-- Migration pour automatiser le géocodage quand la ville change
-- Le géocodage est fait côté serveur, mais ce trigger peut être utilisé
-- pour marquer les shops qui ont besoin d'être géocodés

-- Fonction trigger qui marque qu'un shop a besoin d'être géocodé
-- (Le géocodage réel est fait côté serveur dans le code)
CREATE OR REPLACE FUNCTION "public"."trigger_geocode_on_city_change"() 
RETURNS "trigger"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" TO 'pg_catalog', 'public'
AS $$
BEGIN
    -- Si la ville ou le code postal a changé, et qu'il n'y a pas de coordonnées
    -- Le géocodage sera fait côté serveur dans le code
    -- Ce trigger sert juste à s'assurer que les changements sont détectés
    
    -- Vérifier si la ville a changé
    IF (NEW.directory_actual_city IS DISTINCT FROM OLD.directory_actual_city) OR
       (NEW.directory_city IS DISTINCT FROM OLD.directory_city) OR
       (NEW.directory_postal_code IS DISTINCT FROM OLD.directory_postal_code) THEN
        
        -- Si on n'a pas de coordonnées, elles seront géocodées côté serveur
        -- On ne fait rien ici car le géocodage nécessite un appel HTTP
        -- qui est mieux géré côté serveur
        NULL;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Créer le trigger
DROP TRIGGER IF EXISTS "trigger_geocode_on_city_change" ON "public"."shops";

CREATE TRIGGER "trigger_geocode_on_city_change"
    AFTER UPDATE OF "directory_city", "directory_actual_city", "directory_postal_code"
    ON "public"."shops"
    FOR EACH ROW
    WHEN (
        -- Se déclencher seulement si la ville a changé ET qu'il n'y a pas de coordonnées
        (
            (NEW.directory_actual_city IS DISTINCT FROM OLD.directory_actual_city) OR
            (NEW.directory_city IS DISTINCT FROM OLD.directory_city) OR
            (NEW.directory_postal_code IS DISTINCT FROM OLD.directory_postal_code)
        )
        AND (NEW.latitude IS NULL OR NEW.longitude IS NULL)
    )
    EXECUTE FUNCTION "public"."trigger_geocode_on_city_change"();

COMMENT ON FUNCTION "public"."trigger_geocode_on_city_change"() IS 'Trigger qui détecte les changements de ville. Le géocodage réel est fait côté serveur dans le code SvelteKit.';

