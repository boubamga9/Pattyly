-- Ajouter le support Stripe dans la table orders
-- 1. Mettre à jour la contrainte CHECK pour inclure 'stripe' dans payment_provider
-- 2. Ajouter les colonnes stripe_payment_intent_id et stripe_session_id

-- Supprimer l'ancienne contrainte
ALTER TABLE "public"."orders"
DROP CONSTRAINT IF EXISTS "orders_payment_provider_check";

-- Créer la nouvelle contrainte avec 'stripe' inclus
ALTER TABLE "public"."orders"
ADD CONSTRAINT "orders_payment_provider_check" 
CHECK (("payment_provider" = ANY (ARRAY['paypal'::text, 'revolut'::text, 'stripe'::text])));

-- Ajouter les colonnes Stripe
ALTER TABLE "public"."orders"
ADD COLUMN IF NOT EXISTS "stripe_payment_intent_id" TEXT;

ALTER TABLE "public"."orders"
ADD COLUMN IF NOT EXISTS "stripe_session_id" TEXT;

-- Ajouter des commentaires pour la documentation
COMMENT ON COLUMN "public"."orders"."stripe_payment_intent_id" IS 'ID du payment intent Stripe pour les paiements via Stripe Connect';
COMMENT ON COLUMN "public"."orders"."stripe_session_id" IS 'ID de la session checkout Stripe pour les paiements via Stripe Connect';


