-- Migration: Optimize payment_links RLS policies for performance
-- Description: Replace auth.uid() with (select auth.uid()) to avoid re-evaluation for each row
-- Date: 2025-01-XX

-- Optimiser toutes les politiques RLS de payment_links pour améliorer les performances
-- En utilisant (select auth.uid()) au lieu de auth.uid(), la fonction n'est évaluée qu'une seule fois par requête

-- Politique SELECT
DROP POLICY IF EXISTS "Users can view their own payment links" ON payment_links;
CREATE POLICY "Users can view their own payment links" ON payment_links
    FOR SELECT USING ((select auth.uid()) = profile_id);

-- Politique INSERT
DROP POLICY IF EXISTS "Users can create their own payment links" ON payment_links;
CREATE POLICY "Users can create their own payment links" ON payment_links
    FOR INSERT WITH CHECK ((select auth.uid()) = profile_id);

-- Politique UPDATE
DROP POLICY IF EXISTS "Users can update their own payment links" ON payment_links;
CREATE POLICY "Users can update their own payment links" ON payment_links
    FOR UPDATE USING ((select auth.uid()) = profile_id);

-- Politique DELETE (déjà créée dans la migration 159, mais on l'optimise ici)
DROP POLICY IF EXISTS "Users can delete their own payment links" ON payment_links;
CREATE POLICY "Users can delete their own payment links" ON payment_links
    FOR DELETE USING ((select auth.uid()) = profile_id);

-- Commentaires
COMMENT ON POLICY "Users can view their own payment links" ON payment_links IS 
    'Permet aux utilisateurs de voir leurs propres payment_links - optimisé avec (select auth.uid())';
COMMENT ON POLICY "Users can create their own payment links" ON payment_links IS 
    'Permet aux utilisateurs de créer leurs propres payment_links - optimisé avec (select auth.uid())';
COMMENT ON POLICY "Users can update their own payment links" ON payment_links IS 
    'Permet aux utilisateurs de modifier leurs propres payment_links - optimisé avec (select auth.uid())';
COMMENT ON POLICY "Users can delete their own payment links" ON payment_links IS 
    'Permet aux utilisateurs de supprimer leurs propres payment_links - optimisé avec (select auth.uid())';

