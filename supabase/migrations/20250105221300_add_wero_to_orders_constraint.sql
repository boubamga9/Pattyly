-- Migration pour ajouter 'wero' à la contrainte CHECK de la table orders
-- Cette migration complète la migration 20250202000000_add_wero_support.sql
-- qui avait oublié de mettre à jour la contrainte orders_payment_provider_check

-- Update orders constraint to include 'wero'
ALTER TABLE "public"."orders"
DROP CONSTRAINT IF EXISTS "orders_payment_provider_check";

ALTER TABLE "public"."orders"
ADD CONSTRAINT "orders_payment_provider_check" 
CHECK (("payment_provider" = ANY (ARRAY['paypal'::text, 'revolut'::text, 'stripe'::text, 'wero'::text])));

