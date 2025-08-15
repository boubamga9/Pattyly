-- Renommer les colonnes de la table orders pour une meilleure cohérence
ALTER TABLE orders RENAME COLUMN message TO additional_information;
ALTER TABLE orders RENAME COLUMN phone TO customer_phone;
ALTER TABLE orders RENAME COLUMN instagram TO customer_instagram;
ALTER TABLE orders RENAME COLUMN cake_name TO product_name; 