-- Fix: Supprimer l'ancienne version de get_user_permissions_complete (3 paramètres)
-- pour résoudre le conflit de surcharge avec la nouvelle version (4 paramètres)
-- 
-- Problème: PostgREST ne peut pas choisir entre les deux versions car elles ont
-- des signatures similaires avec des paramètres par défaut.
-- Solution: Supprimer explicitement l'ancienne version.

DROP FUNCTION IF EXISTS "public"."get_user_permissions_complete"(
    "p_profile_id" "uuid", 
    "p_premium_product_id" "text", 
    "p_basic_product_id" "text"
);

-- La version avec 4 paramètres (incluant p_lifetime_product_id) reste active
-- et est déjà définie dans les migrations précédentes.

