-- Migration 53: Supprimer la colonne paypal_payment_id inutilisée

-- Supprimer la colonne paypal_payment_id qui n'est pas utilisée dans le code
ALTER TABLE orders DROP COLUMN IF EXISTS paypal_payment_id;
