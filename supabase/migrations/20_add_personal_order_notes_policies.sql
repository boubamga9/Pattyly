-- Migration 20: Ajout des policies RLS pour personal_order_notes

-- 1. Activer RLS sur la table personal_order_notes
ALTER TABLE personal_order_notes ENABLE ROW LEVEL SECURITY;

-- 2. Policy de lecture : Seulement le shop propriétaire
CREATE POLICY "Users can view personal notes for their own shop" ON personal_order_notes
FOR SELECT USING (
    shop_id IN (
        SELECT id FROM shops 
        WHERE profile_id = auth.uid()
    )
);

-- 3. Policy d'insertion : Seulement le shop propriétaire
CREATE POLICY "Users can insert personal notes for their own shop" ON personal_order_notes
FOR INSERT WITH CHECK (
    shop_id IN (
        SELECT id FROM shops 
        WHERE profile_id = auth.uid()
    )
);

-- 4. Policy de modification : Seulement le shop propriétaire
CREATE POLICY "Users can update personal notes for their own shop" ON personal_order_notes
FOR UPDATE USING (
    shop_id IN (
        SELECT id FROM shops 
        WHERE profile_id = auth.uid()
    )
);

-- 5. Policy de suppression : Seulement le shop propriétaire
CREATE POLICY "Users can delete personal notes for their own shop" ON personal_order_notes
FOR DELETE USING (
    shop_id IN (
        SELECT id FROM shops 
        WHERE profile_id = auth.uid()
    )
); 