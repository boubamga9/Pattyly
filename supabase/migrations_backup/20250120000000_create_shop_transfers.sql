-- Migration: Création de la table shop_transfers pour le système de transfert de boutiques
-- Permet de créer des boutiques avec pattyly.saas+[alias]@gmail.com et les transférer à des pâtissières

CREATE TABLE shop_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  target_email TEXT NOT NULL,
  paypal_me TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '30 days'),
  used_at TIMESTAMP NULL,
  created_by UUID REFERENCES profiles(id)
);

-- Index pour les recherches rapides
CREATE INDEX idx_shop_transfers_email ON shop_transfers(target_email);
CREATE INDEX idx_shop_transfers_shop ON shop_transfers(shop_id);
CREATE INDEX idx_shop_transfers_expires ON shop_transfers(expires_at);

-- RLS Policies
ALTER TABLE shop_transfers ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs authentifiés peuvent créer des transferts
CREATE POLICY "Authenticated users can create transfers" ON shop_transfers
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Les utilisateurs authentifiés peuvent voir leurs transferts
CREATE POLICY "Users can view their transfers" ON shop_transfers
  FOR SELECT USING (auth.uid() = created_by);

-- Les utilisateurs authentifiés peuvent mettre à jour leurs transferts
CREATE POLICY "Users can update their transfers" ON shop_transfers
  FOR UPDATE USING (auth.uid() = created_by);

-- Les utilisateurs peuvent marquer comme utilisé un transfert destiné à leur email
CREATE POLICY "Users can mark transfers as used for their email" ON shop_transfers
  FOR UPDATE USING (
    auth.uid() IS NOT NULL 
    AND target_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND used_at IS NULL
  );

-- Fonction pour nettoyer les transferts expirés
CREATE OR REPLACE FUNCTION cleanup_expired_transfers()
RETURNS void AS $$
BEGIN
  DELETE FROM shop_transfers 
  WHERE expires_at < NOW() AND used_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
