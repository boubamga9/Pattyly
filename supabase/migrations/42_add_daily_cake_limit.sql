-- Ajouter une colonne daily_order_limit à la table availabilities
ALTER TABLE availabilities 
ADD COLUMN daily_order_limit INTEGER DEFAULT NULL;

-- Ajouter une contrainte pour s'assurer que la limite est positive
ALTER TABLE availabilities 
ADD CONSTRAINT check_daily_order_limit_positive 
CHECK (daily_order_limit IS NULL OR daily_order_limit > 0);

-- Commentaire pour documentation
COMMENT ON COLUMN availabilities.daily_order_limit IS 'Limite quotidienne de commandes (NULL = pas de limite)';