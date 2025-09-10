-- Modifier la table shops pour que is_active soit false par défaut
-- Cela permet de contrôler l'activation des boutiques via les webhooks Stripe

ALTER TABLE shops ALTER COLUMN is_active SET DEFAULT false;
