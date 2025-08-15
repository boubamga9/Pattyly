-- Créer la table faq
CREATE TABLE faq (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Créer un index sur shop_id pour les performances
CREATE INDEX idx_faq_shop_id ON faq(shop_id);

-- Activer RLS
ALTER TABLE faq ENABLE ROW LEVEL SECURITY;

-- Politique RLS : les utilisateurs peuvent voir les FAQ de leur boutique
CREATE POLICY "Users can view their own shop's FAQ" ON faq
    FOR SELECT USING (
        shop_id IN (
            SELECT id FROM shops WHERE profile_id = auth.uid()
        )
    );

-- Politique RLS : les utilisateurs peuvent modifier les FAQ de leur boutique
CREATE POLICY "Users can manage their own shop's FAQ" ON faq
    FOR ALL USING (
        shop_id IN (
            SELECT id FROM shops WHERE profile_id = auth.uid()
        )
    );

-- Politique RLS : lecture publique des FAQ (pour les clients)
CREATE POLICY "Public can view FAQ" ON faq
    FOR SELECT USING (
        shop_id IN (
            SELECT id FROM shops WHERE is_active = true
        )
    ); 