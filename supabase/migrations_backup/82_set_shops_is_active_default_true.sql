-- ==============================================
-- FIX : is_active = TRUE par défaut
-- ==============================================

-- Les nouvelles boutiques doivent être actives par défaut
-- (la visibilité est gérée par trial_ending + Stripe)

ALTER TABLE shops ALTER COLUMN is_active SET DEFAULT true;

-- Mettre à jour les boutiques existantes qui sont à false
-- (sauf si elles ont été désactivées manuellement par un admin)
UPDATE shops 
SET is_active = true 
WHERE is_active = false;

