-- Migration: Add DELETE policy for payment_links
-- Description: Allows users to delete their own payment_links
-- Date: 2025-01-XX

-- Ajouter la politique DELETE pour payment_links
-- Les utilisateurs peuvent supprimer leurs propres payment_links
-- Utilisation de (select auth.uid()) pour optimiser les performances (évite la réévaluation par ligne)
DROP POLICY IF EXISTS "Users can delete their own payment links" ON payment_links;
CREATE POLICY "Users can delete their own payment links" ON payment_links
    FOR DELETE USING ((select auth.uid()) = profile_id);

-- Commentaire
COMMENT ON POLICY "Users can delete their own payment links" ON payment_links IS 
    'Permet aux utilisateurs de supprimer leurs propres payment_links pour pouvoir les modifier';

