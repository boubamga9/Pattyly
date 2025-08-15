-- Ajouter la colonne product_base_price pour stocker le prix de base du produit
ALTER TABLE orders
ADD COLUMN product_base_price DECIMAL(10,2);

-- Ajouter un index pour améliorer les performances des recherches
CREATE INDEX IF NOT EXISTS idx_orders_product_base_price
ON orders (product_base_price)
WHERE product_base_price IS NOT NULL; 