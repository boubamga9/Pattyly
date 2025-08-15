-- Ajouter le champ stripe_session_id pour lier les commandes aux sessions Stripe
ALTER TABLE orders
ADD COLUMN stripe_session_id TEXT;

-- Ajouter un index pour améliorer les performances des recherches
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session_id
ON orders (stripe_session_id)
WHERE stripe_session_id IS NOT NULL; 