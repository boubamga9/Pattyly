-- Migration 19: Ajout du montant payé et des notes personnelles

-- 1. Renommer la colonne price en total_amount
ALTER TABLE orders RENAME COLUMN price TO total_amount;

-- 2. Ajouter la colonne paid_amount
ALTER TABLE orders ADD COLUMN paid_amount DECIMAL(10,2);

-- 3. Créer la table pour les notes personnelles
CREATE TABLE personal_order_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Ajouter les index pour les performances
CREATE INDEX idx_personal_order_notes_order_id ON personal_order_notes(order_id);
CREATE INDEX idx_personal_order_notes_shop_id ON personal_order_notes(shop_id);

-- 5. Ajouter la contrainte d'unicité (une note par commande par boutique)
ALTER TABLE personal_order_notes ADD CONSTRAINT unique_order_shop_note UNIQUE (order_id, shop_id);

-- 6. Créer la fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 7. Créer le trigger pour updated_at
CREATE TRIGGER update_personal_order_notes_updated_at 
    BEFORE UPDATE ON personal_order_notes 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column(); 