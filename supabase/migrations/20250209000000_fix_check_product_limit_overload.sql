-- Fix: Supprimer l'ancienne version de check_product_limit (2 paramètres)
-- pour résoudre le conflit de surcharge avec la nouvelle version (5 paramètres)
-- 
-- Problème: PostgREST ne peut pas choisir entre les deux versions car elles ont
-- des signatures similaires avec des paramètres par défaut.
-- L'ancienne version (2 paramètres) coexiste avec la nouvelle (5 paramètres)
-- ce qui peut créer des ambiguïtés.
-- Solution: Supprimer explicitement l'ancienne version.

DROP FUNCTION IF EXISTS "public"."check_product_limit"(
    "p_shop_id" "uuid", 
    "p_profile_id" "uuid"
);

-- La version avec 5 paramètres (incluant p_premium_product_id, p_basic_product_id, p_lifetime_product_id) 
-- reste active et est déjà définie dans la migration 20250207000000_fix_exempt_support_in_functions.sql

