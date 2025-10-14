-- ==============================================
-- EARLY ADOPTER : Colonnes pour tracker l'offre
-- ==============================================

-- Ajouter les colonnes pour gérer l'offre Early Adopter
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS early_adopter_offer_shown_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_early_adopter BOOLEAN DEFAULT FALSE;

-- Index pour compter rapidement les early adopters
CREATE INDEX IF NOT EXISTS idx_profiles_is_early_adopter ON profiles(is_early_adopter) WHERE is_early_adopter = TRUE;

-- Commentaires
COMMENT ON COLUMN profiles.early_adopter_offer_shown_at IS 'Date à laquelle l''offre Early Adopter a été montrée (NULL = jamais vue)';
COMMENT ON COLUMN profiles.is_early_adopter IS 'TRUE si l''utilisateur a souscrit à l''offre Early Adopter à 15€/mois';

