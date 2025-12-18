-- Ajouter une contrainte UNIQUE sur stripe_payment_intent_id pour éviter les doublons
-- Note: On permet NULL car les commandes custom n'ont pas de payment_intent
ALTER TABLE orders 
ADD CONSTRAINT unique_stripe_payment_intent 
UNIQUE (stripe_payment_intent_id);

-- Ajouter un index pour améliorer les performances des recherches
CREATE INDEX IF NOT EXISTS idx_orders_stripe_payment_intent 
ON orders (stripe_payment_intent_id) 
WHERE stripe_payment_intent_id IS NOT NULL; 