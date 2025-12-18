-- Migration: Ajouter deposit_percentage aux produits
-- Permet aux cake designers de définir le pourcentage d'acompte par gâteau
-- Valeur par défaut: 50%

ALTER TABLE products 
ADD COLUMN deposit_percentage INTEGER NOT NULL DEFAULT 50 
CHECK (deposit_percentage >= 0 AND deposit_percentage <= 100);

-- Commentaire pour documenter la colonne
COMMENT ON COLUMN products.deposit_percentage IS 'Pourcentage d''acompte demandé pour ce produit (0-100), par défaut 50%';

