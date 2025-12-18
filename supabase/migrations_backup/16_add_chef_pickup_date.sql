-- Ajouter la colonne chef_pickup_date pour permettre au pâtissier de proposer une autre date
ALTER TABLE orders
ADD COLUMN chef_pickup_date DATE;

-- Ajouter un index pour améliorer les performances des recherches
CREATE INDEX IF NOT EXISTS idx_orders_chef_pickup_date
ON orders (chef_pickup_date)
WHERE chef_pickup_date IS NOT NULL; 