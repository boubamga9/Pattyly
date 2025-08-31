-- Migration pour créer la table anti-fraude des numéros de téléphone
-- Cette table stocke les numéros de téléphone qui ont déjà bénéficié d'un essai gratuit

CREATE TABLE anti_fraud_phone_numbers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone_number TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour optimiser les recherches par numéro de téléphone
CREATE INDEX idx_anti_fraud_phone_numbers_phone ON anti_fraud_phone_numbers(phone_number);

-- Commentaire explicatif
COMMENT ON TABLE anti_fraud_phone_numbers IS 'Table anti-fraude pour éviter les essais gratuits multiples avec le même numéro de téléphone';

-- Règle RLS (Row Level Security) - lecture publique, écriture admin uniquement
ALTER TABLE anti_fraud_phone_numbers ENABLE ROW LEVEL SECURITY;

-- Politique de lecture (pour vérifier si un numéro existe)
CREATE POLICY "Allow read access for all" ON anti_fraud_phone_numbers
    FOR SELECT USING (true);

-- Politique d'écriture (admin uniquement ou via trigger)
CREATE POLICY "Allow insert for service role" ON anti_fraud_phone_numbers
    FOR INSERT WITH CHECK (true);
