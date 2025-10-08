-- Migration 52: Supprimer les colonnes Stripe liées aux paiements (garder les abonnements)

-- 1. Supprimer les contraintes et index liés aux colonnes Stripe
DROP INDEX IF EXISTS idx_orders_stripe_payment_intent;
DROP INDEX IF EXISTS idx_orders_stripe_session_id;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS unique_stripe_payment_intent;

-- 2. Supprimer les colonnes Stripe de paiement (garder les abonnements)
ALTER TABLE orders DROP COLUMN IF EXISTS stripe_payment_intent_id;
ALTER TABLE orders DROP COLUMN IF EXISTS stripe_session_id;

-- 3. Mettre à jour le commentaire de pending_orders (plus spécifique à Stripe)
COMMENT ON TABLE pending_orders IS 'Commandes en attente de paiement - données temporaires';
COMMENT ON COLUMN pending_orders.order_data IS 'Données complètes de la commande (JSON)';
