-- Ajouter la colonne cake_type à la table products
-- Cette colonne permet de catégoriser les gâteaux (anniversaire, mariage, cupcakes, etc.)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS cake_type TEXT CHECK (char_length(cake_type) <= 50);

-- Créer un index pour améliorer les performances des requêtes de filtrage
CREATE INDEX IF NOT EXISTS idx_products_cake_type ON products(cake_type) WHERE cake_type IS NOT NULL;

-- Commentaire pour la documentation
COMMENT ON COLUMN products.cake_type IS 'Type de gâteau (ex: Gâteau d''anniversaire, Gâteau de mariage, Cupcakes, Macarons, Gâteau personnalisé, etc.)';

