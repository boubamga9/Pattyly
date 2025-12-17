-- Migration: Support multiple payment providers (PayPal, Revolut, etc.)
-- Description: Allows pastry chefs to configure multiple payment methods
-- Date: 2025-01-XX

-- 1. Supprimer toutes les contraintes UNIQUE existantes sur profile_id
ALTER TABLE payment_links DROP CONSTRAINT IF EXISTS payment_links_profile_id_key;
ALTER TABLE payment_links DROP CONSTRAINT IF EXISTS payment_links_profile_id_is_active_key;

-- 2. Ajouter provider_type et payment_identifier
ALTER TABLE payment_links 
  ADD COLUMN IF NOT EXISTS provider_type TEXT DEFAULT 'paypal' CHECK (provider_type IN ('paypal', 'revolut')),
  ADD COLUMN IF NOT EXISTS payment_identifier TEXT;

-- 3. Migrer les données existantes
UPDATE payment_links 
SET payment_identifier = paypal_me,
    provider_type = 'paypal'
WHERE payment_identifier IS NULL;

-- 4. Rendre payment_identifier NOT NULL
ALTER TABLE payment_links 
  ALTER COLUMN payment_identifier SET NOT NULL;

-- 4.1. Rendre paypal_me nullable (car Revolut n'utilise pas cette colonne)
-- On garde paypal_me pour la rétrocompatibilité, mais il peut être NULL pour les autres providers
ALTER TABLE payment_links 
  ALTER COLUMN paypal_me DROP NOT NULL;

-- 5. Ajouter une contrainte unique sur (profile_id, provider_type)
-- Cela permet d'avoir un seul enregistrement par provider par utilisateur
ALTER TABLE payment_links 
  DROP CONSTRAINT IF EXISTS payment_links_profile_provider_unique,
  ADD CONSTRAINT payment_links_profile_provider_unique 
  UNIQUE (profile_id, provider_type);

-- 6. Index pour les performances
CREATE INDEX IF NOT EXISTS idx_payment_links_provider_type 
  ON payment_links(provider_type);

-- 7. Index composite pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_payment_links_profile_provider 
  ON payment_links(profile_id, provider_type);

-- 8. Commentaires
COMMENT ON COLUMN payment_links.provider_type IS 'Type de provider de paiement: paypal, revolut, etc.';
COMMENT ON COLUMN payment_links.payment_identifier IS 'Identifiant du provider (ex: nom PayPal.me, identifiant Revolut)';

