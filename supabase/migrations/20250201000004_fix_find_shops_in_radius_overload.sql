-- Fix: Supprimer l'ancienne version de find_shops_in_radius (5 paramètres)
-- pour résoudre le conflit de surcharge avec la nouvelle version (7 paramètres)
-- 
-- Problème: PostgreSQL ne peut pas choisir entre les deux versions quand on appelle
-- avec 5 paramètres car la nouvelle version a des valeurs par défaut pour les 2 derniers.
-- Solution: Supprimer explicitement l'ancienne version.

DROP FUNCTION IF EXISTS "public"."find_shops_in_radius"(
    "p_latitude" numeric, 
    "p_longitude" numeric, 
    "p_radius_km" numeric, 
    "p_limit" integer, 
    "p_offset" integer
);

-- La version avec 7 paramètres (incluant p_premium_product_id et p_verified_only) reste active
-- et est déjà définie dans la migration 20251229173252_initial_schema_from_prod.sql
-- Cette version calcule is_premium correctement et supporte le filtrage verified_only

