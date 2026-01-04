-- Fix: Supprimer l'ancienne version de get_user_plan (3 paramètres)
-- pour résoudre le conflit de surcharge avec la nouvelle version (4 paramètres)
-- 
-- Problème: PostgREST ne peut pas choisir entre les deux versions car elles ont
-- des signatures similaires avec des paramètres par défaut.
-- Solution: Supprimer explicitement l'ancienne version.

DROP FUNCTION IF EXISTS "public"."get_user_plan"(
    "p_profile_id" "uuid", 
    "premium_product_id" "text", 
    "basic_product_id" "text"
);

-- La version avec 4 paramètres (incluant lifetime_product_id) reste active
-- et est déjà définie dans la migration 20250101000000_add_lifetime_plan_support.sql

