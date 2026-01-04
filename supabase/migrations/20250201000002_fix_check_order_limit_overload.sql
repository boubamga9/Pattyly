-- Fix: Supprimer l'ancienne version de check_order_limit (2 paramètres)
-- pour résoudre le conflit de surcharge avec la nouvelle version (5 paramètres)
-- 
-- Problème: PostgREST ne peut pas choisir entre les deux versions car elles ont
-- des signatures similaires avec des paramètres par défaut.
-- Solution: Supprimer explicitement l'ancienne version.

DROP FUNCTION IF EXISTS "public"."check_order_limit"(
    "p_shop_id" "uuid", 
    "p_profile_id" "uuid"
);

-- La version avec 5 paramètres (incluant p_premium_product_id, p_basic_product_id, p_lifetime_product_id) 
-- reste active et est déjà définie dans la migration 20250131000000_update_check_order_limit_for_lifetime.sql

