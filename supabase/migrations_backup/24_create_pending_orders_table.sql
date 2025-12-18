-- Créer la table pending_orders pour stocker temporairement les commandes
CREATE TABLE pending_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Créer un index sur created_at pour faciliter le nettoyage futur si nécessaire
CREATE INDEX idx_pending_orders_created_at ON pending_orders(created_at);

-- Activer RLS
ALTER TABLE pending_orders ENABLE ROW LEVEL SECURITY;

-- Politique RLS : lecture publique (pour le webhook Stripe)
CREATE POLICY "Public can read pending orders" ON pending_orders
    FOR SELECT USING (true);

-- Politique RLS : insertion publique (pour l'API de création de session)
CREATE POLICY "Public can insert pending orders" ON pending_orders
    FOR INSERT WITH CHECK (true);

-- Politique RLS : suppression publique (pour le webhook après traitement)
CREATE POLICY "Public can delete pending orders" ON pending_orders
    FOR DELETE USING (true);

-- Commentaires
COMMENT ON TABLE pending_orders IS 'Commandes en attente de paiement Stripe - données temporaires';
COMMENT ON COLUMN pending_orders.order_data IS 'Données complètes de la commande (JSON)';
COMMENT ON COLUMN pending_orders.created_at IS 'Date de création de la commande en attente';
