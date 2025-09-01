-- Migration: Créer la table anti_fraud pour la protection contre les abus d'essais gratuits
-- Date: 2024-12-19

-- Supprimer l'ancienne table si elle existe
DROP TABLE IF EXISTS anti_fraud_phone_numbers;

-- Créer la nouvelle table anti_fraud
CREATE TABLE anti_fraud (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    fingerprint TEXT NOT NULL, -- Hash unique du device (FingerprintJS)
    ip_address INET NOT NULL, -- Adresse IP de l'utilisateur
    email TEXT NOT NULL, -- Email utilisé lors de l'inscription
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Créer des index pour optimiser les recherches
CREATE INDEX idx_anti_fraud_fingerprint ON anti_fraud(fingerprint);
CREATE INDEX idx_anti_fraud_ip ON anti_fraud(ip_address);
CREATE INDEX idx_anti_fraud_email ON anti_fraud(email);
CREATE INDEX idx_anti_fraud_created_at ON anti_fraud(created_at);

-- Contrainte d'unicité pour éviter les doublons
ALTER TABLE anti_fraud ADD CONSTRAINT unique_fingerprint_ip_email UNIQUE(fingerprint, ip_address, email);

-- Commentaires pour la documentation
COMMENT ON TABLE anti_fraud IS 'Table anti-fraude pour éviter les essais gratuits multiples avec le même device, IP ou email';
COMMENT ON COLUMN anti_fraud.fingerprint IS 'Hash unique du device généré par FingerprintJS (SHA-256)';
COMMENT ON COLUMN anti_fraud.ip_address IS 'Adresse IP de l''utilisateur au moment de l''inscription';
COMMENT ON COLUMN anti_fraud.email IS 'Email utilisé lors de l''inscription';

-- Activer Row Level Security
ALTER TABLE anti_fraud ENABLE ROW LEVEL SECURITY;

-- Politiques de sécurité
CREATE POLICY "Allow read access for all" ON anti_fraud
    FOR SELECT USING (true);

CREATE POLICY "Allow insert for service role" ON anti_fraud
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update for service role" ON anti_fraud
    FOR UPDATE USING (true);

CREATE POLICY "Allow delete for service role" ON anti_fraud
    FOR DELETE USING (true);
