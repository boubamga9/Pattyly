-- Migration: Ajouter les colonnes Instagram et TikTok à la table anti_fraud
-- Date: 2024-12-19

-- Ajouter les colonnes pour les réseaux sociaux
ALTER TABLE anti_fraud 
ADD COLUMN IF NOT EXISTS instagram TEXT,
ADD COLUMN IF NOT EXISTS tiktok TEXT;

-- Créer des index pour optimiser les recherches sur les réseaux sociaux
CREATE INDEX IF NOT EXISTS idx_anti_fraud_instagram ON anti_fraud(instagram) WHERE instagram IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_anti_fraud_tiktok ON anti_fraud(tiktok) WHERE tiktok IS NOT NULL;

-- Commentaires pour la documentation
COMMENT ON COLUMN anti_fraud.instagram IS 'Nom d''utilisateur Instagram utilisé lors de l''inscription (optionnel)';
COMMENT ON COLUMN anti_fraud.tiktok IS 'Nom d''utilisateur TikTok utilisé lors de l''inscription (optionnel)';
