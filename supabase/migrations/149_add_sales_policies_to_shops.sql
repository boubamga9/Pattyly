-- Migration: Add sales policies fields to shops table
-- This allows pastry chefs to define their sales policies (terms, returns, delivery, payment)

-- Add sales policies fields to shops table
ALTER TABLE shops
ADD COLUMN IF NOT EXISTS terms_and_conditions TEXT,
ADD COLUMN IF NOT EXISTS return_policy TEXT,
ADD COLUMN IF NOT EXISTS delivery_policy TEXT,
ADD COLUMN IF NOT EXISTS payment_terms TEXT;

-- Add constraints for text length (max 5000 characters per field)
ALTER TABLE shops
ADD CONSTRAINT shops_terms_and_conditions_check CHECK (
    terms_and_conditions IS NULL OR char_length(terms_and_conditions) <= 5000
),
ADD CONSTRAINT shops_return_policy_check CHECK (
    return_policy IS NULL OR char_length(return_policy) <= 5000
),
ADD CONSTRAINT shops_delivery_policy_check CHECK (
    delivery_policy IS NULL OR char_length(delivery_policy) <= 5000
),
ADD CONSTRAINT shops_payment_terms_check CHECK (
    payment_terms IS NULL OR char_length(payment_terms) <= 5000
);

-- Add comments for documentation
COMMENT ON COLUMN shops.terms_and_conditions IS 'Conditions générales de vente de la boutique';
COMMENT ON COLUMN shops.return_policy IS 'Politique de retour et remboursement';
COMMENT ON COLUMN shops.delivery_policy IS 'Politique de livraison et retrait';
COMMENT ON COLUMN shops.payment_terms IS 'Conditions de paiement';

