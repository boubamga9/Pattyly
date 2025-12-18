-- Migration pour adapter anti_fraud à PayPal
-- On retire fingerprint et ip_address, on ajoute paypal_email

-- Supprimer les colonnes inutiles
ALTER TABLE anti_fraud DROP COLUMN IF EXISTS fingerprint;
ALTER TABLE anti_fraud DROP COLUMN IF EXISTS ip_address;

-- Ajouter paypal_email
ALTER TABLE anti_fraud ADD COLUMN IF NOT EXISTS paypal_email TEXT;

-- Créer un index sur paypal_email pour les recherches
CREATE INDEX IF NOT EXISTS idx_anti_fraud_paypal_email ON anti_fraud(paypal_email);

-- Mettre à jour le commentaire de la table
COMMENT ON TABLE anti_fraud IS 'Anti-fraud system based on email, social media, and PayPal email';
COMMENT ON COLUMN anti_fraud.paypal_email IS 'PayPal email used during trial creation (primary anti-fraud check)';

