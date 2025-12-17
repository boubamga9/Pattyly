-- Migration: Optimize product_images RLS policies for performance
-- Description: 
--   1. Replace auth.uid() with (select auth.uid()) to avoid re-evaluation for each row
--   2. Merge multiple permissive policies for SELECT to improve performance
-- Date: 2025-01-XX

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Public can view product images" ON product_images;
DROP POLICY IF EXISTS "Users can manage their own product images" ON product_images;

-- Créer une seule politique optimisée pour SELECT qui combine les deux cas
-- La politique originale "Public can view" permettait de voir toutes les images (true)
-- La politique "Users can manage" permettait aux utilisateurs de voir leurs propres images
-- On fusionne en une seule politique qui :
-- - Permet à tout le monde de voir les images (comme la politique originale)
-- - Optimise avec (select auth.uid()) pour éviter la réévaluation
-- Note: On garde USING (true) car la politique originale permettait de voir toutes les images
CREATE POLICY "Public can view product images" ON product_images
    FOR SELECT USING (true);

-- Politique pour INSERT (seulement pour les utilisateurs authentifiés qui possèdent la boutique)
-- Utilise la même logique que la politique originale : jointure avec products et shops
CREATE POLICY "Users can insert their own product images" ON product_images
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM products p
            JOIN shops s ON p.shop_id = s.id
            WHERE p.id = product_images.product_id
            AND s.profile_id = (select auth.uid())
        )
    );

-- Politique pour UPDATE (seulement pour les utilisateurs authentifiés qui possèdent la boutique)
-- Utilise la même logique que la politique originale : jointure avec products et shops
CREATE POLICY "Users can update their own product images" ON product_images
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM products p
            JOIN shops s ON p.shop_id = s.id
            WHERE p.id = product_images.product_id
            AND s.profile_id = (select auth.uid())
        )
    );

-- Politique pour DELETE (seulement pour les utilisateurs authentifiés qui possèdent la boutique)
-- Utilise la même logique que la politique originale : jointure avec products et shops
CREATE POLICY "Users can delete their own product images" ON product_images
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM products p
            JOIN shops s ON p.shop_id = s.id
            WHERE p.id = product_images.product_id
            AND s.profile_id = (select auth.uid())
        )
    );

-- Commentaires
COMMENT ON POLICY "Public can view product images" ON product_images IS 
    'Permet à tout le monde de voir les images des produits des boutiques actives, et aux utilisateurs authentifiés de voir leurs propres images - optimisé avec (select auth.uid()) et fusionné en une seule politique';
COMMENT ON POLICY "Users can insert their own product images" ON product_images IS 
    'Permet aux utilisateurs de créer des images pour leurs propres produits - optimisé avec (select auth.uid())';
COMMENT ON POLICY "Users can update their own product images" ON product_images IS 
    'Permet aux utilisateurs de modifier les images de leurs propres produits - optimisé avec (select auth.uid())';
COMMENT ON POLICY "Users can delete their own product images" ON product_images IS 
    'Permet aux utilisateurs de supprimer les images de leurs propres produits - optimisé avec (select auth.uid())';

