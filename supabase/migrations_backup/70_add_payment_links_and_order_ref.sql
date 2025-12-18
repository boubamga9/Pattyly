-- Migration: Add payment links and order references for PayPal.me integration
-- Date: 2025-01-11

-- 1. Créer la table payment_links pour stocker les PayPal.me des pâtissiers
CREATE TABLE payment_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    paypal_me VARCHAR(255) NOT NULL, -- Nom PayPal.me (ex: "patissier123")
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Un seul payment_link actif par profil
    UNIQUE(profile_id, is_active) DEFERRABLE INITIALLY DEFERRED
);

-- 2. Ajouter la colonne order_ref dans pending_orders
ALTER TABLE pending_orders ADD COLUMN order_ref VARCHAR(8);

-- 3. Ajouter la colonne order_ref dans orders
ALTER TABLE orders ADD COLUMN order_ref VARCHAR(8);

-- 4. Ajouter le nouveau statut 'to_verify' aux commandes
-- (Les statuts existants sont: 'pending', 'quoted', 'paid', 'preparing', 'ready', 'completed', 'cancelled')
ALTER TYPE order_status ADD VALUE 'to_verify';

-- 5. Créer un index pour order_ref pour les recherches rapides
CREATE INDEX idx_pending_orders_order_ref ON pending_orders(order_ref);
CREATE INDEX idx_orders_order_ref ON orders(order_ref);

-- 6. Créer un index pour payment_links
CREATE INDEX idx_payment_links_profile_id ON payment_links(profile_id);
CREATE INDEX idx_payment_links_paypal_me ON payment_links(paypal_me);

-- 7. Fonction pour mettre à jour updated_at sur payment_links
CREATE OR REPLACE FUNCTION update_payment_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 8. Trigger pour updated_at sur payment_links
CREATE TRIGGER update_payment_links_updated_at
    BEFORE UPDATE ON payment_links
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_links_updated_at();

-- 9. Fonction pour générer un order_ref unique (nanoid de 8 caractères)
CREATE OR REPLACE FUNCTION generate_order_ref()
RETURNS VARCHAR(8) AS $$
DECLARE
    chars VARCHAR(62) := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    result VARCHAR(8) := '';
    i INTEGER;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    
    -- Vérifier l'unicité (optionnel, mais recommandé)
    WHILE EXISTS (SELECT 1 FROM pending_orders WHERE order_ref = result) 
       OR EXISTS (SELECT 1 FROM orders WHERE order_ref = result) LOOP
        result := '';
        FOR i IN 1..8 LOOP
            result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
        END LOOP;
    END LOOP;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 10. Commentaires pour la documentation
COMMENT ON TABLE payment_links IS 'Stores PayPal.me links for pastry chefs to receive payments';
COMMENT ON COLUMN payment_links.paypal_me IS 'PayPal.me username (e.g., "patissier123")';
COMMENT ON COLUMN pending_orders.order_ref IS 'Unique 8-character reference for payment tracking';
COMMENT ON COLUMN orders.order_ref IS 'Unique 8-character reference for payment tracking';
