-- Migration pour retirer la colonne created_by de shop_transfers
-- et mettre à jour les politiques RLS

-- Supprimer toutes les politiques existantes
DROP POLICY IF EXISTS "Authenticated users can create transfers" ON shop_transfers;
DROP POLICY IF EXISTS "Users can view their transfers" ON shop_transfers;
DROP POLICY IF EXISTS "Users can update their transfers" ON shop_transfers;
DROP POLICY IF EXISTS "Users can mark transfers as used for their email" ON shop_transfers;

-- Supprimer la colonne created_by
ALTER TABLE shop_transfers DROP COLUMN IF EXISTS created_by;

-- Recréer les politiques sans created_by
-- Les utilisateurs authentifiés peuvent créer des transferts
CREATE POLICY "Authenticated users can create transfers" ON shop_transfers
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Les utilisateurs authentifiés peuvent voir tous les transferts (pour vérifier les doublons)
CREATE POLICY "Authenticated users can view transfers" ON shop_transfers
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Les utilisateurs peuvent marquer comme utilisé un transfert destiné à leur email
CREATE POLICY "Users can mark transfers as used for their email" ON shop_transfers
  FOR UPDATE USING (
    auth.uid() IS NOT NULL 
    AND target_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND used_at IS NULL
  );

-- Les utilisateurs peuvent voir les transferts destinés à leur email
CREATE POLICY "Users can view transfers for their email" ON shop_transfers
  FOR SELECT USING (
    auth.uid() IS NOT NULL 
    AND target_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Commentaire sur la table
COMMENT ON TABLE shop_transfers IS 'Shop transfers - created_by column removed for simplification';
