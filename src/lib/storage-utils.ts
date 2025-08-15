import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Supprime une image du storage si elle n'est plus utilisée par d'autres produits
 */
export async function deleteImageIfUnused(
    supabase: SupabaseClient,
    imageUrl: string,
    excludeProductId?: string
): Promise<void> {
    if (!imageUrl) return;

    try {
        // Extraire le nom du fichier de l'URL
        const urlParts = imageUrl.split('/');
        const fileName = urlParts[urlParts.length - 1];

        if (!fileName) {
            console.warn('Impossible d\'extraire le nom du fichier de l\'URL:', imageUrl);
            return;
        }

        // Vérifier si d'autres produits utilisent cette image
        const { data: productsUsingImage, error: checkError } = await supabase
            .from('products')
            .select('id')
            .eq('image_url', imageUrl);

        if (checkError) {
            console.error('Erreur lors de la vérification de l\'usage de l\'image:', checkError);
            return;
        }

        // Filtrer le produit actuel si on est en train de le modifier
        const otherProductsUsingImage = excludeProductId
            ? productsUsingImage.filter(p => p.id !== excludeProductId)
            : productsUsingImage;

        // Si aucun autre produit n'utilise cette image, la supprimer
        if (otherProductsUsingImage.length === 0) {
            console.log(`Suppression de l'image orpheline: ${fileName}`);

            const { error: deleteError } = await supabase.storage
                .from('product-images')
                .remove([fileName]);

            if (deleteError) {
                console.error('Erreur lors de la suppression de l\'image:', deleteError);
            } else {
                console.log(`Image supprimée avec succès: ${fileName}`);
            }
        } else {
            console.log(`Image conservée car utilisée par ${otherProductsUsingImage.length} autre(s) produit(s): ${fileName}`);
        }
    } catch (error) {
        console.error('Erreur lors de la gestion de l\'image:', error);
    }
}

/**
 * Supprime le logo d'une boutique du storage
 */
export async function deleteShopLogo(
    supabase: SupabaseClient,
    logoUrl: string
): Promise<void> {
    if (!logoUrl) return;

    try {
        // Extraire le nom du fichier de l'URL
        const urlParts = logoUrl.split('/');
        const fileName = urlParts[urlParts.length - 1];

        if (!fileName) {
            console.warn('Impossible d\'extraire le nom du fichier du logo:', logoUrl);
            return;
        }

        console.log(`Suppression du logo de la boutique: ${fileName}`);

        const { error: deleteError } = await supabase.storage
            .from('shop-logos')
            .remove([fileName]);

        if (deleteError) {
            console.error('Erreur lors de la suppression du logo:', deleteError);
        } else {
            console.log(`Logo supprimé avec succès: ${fileName}`);
        }
    } catch (error) {
        console.error('Erreur lors de la suppression du logo:', error);
    }
}

/**
 * Supprime toutes les images d'une boutique (produits + logo)
 */
export async function deleteAllShopImages(
    supabase: SupabaseClient,
    shopId: string
): Promise<void> {
    try {
        // Récupérer tous les produits de la boutique
        const { data: products, error: productsError } = await supabase
            .from('products')
            .select('image_url')
            .eq('shop_id', shopId)
            .not('image_url', 'is', null);

        if (productsError) {
            console.error('Erreur lors de la récupération des produits:', productsError);
            return;
        }

        // Supprimer toutes les images de produits
        for (const product of products) {
            if (product.image_url) {
                await deleteImageIfUnused(supabase, product.image_url);
            }
        }

        // Récupérer et supprimer le logo de la boutique
        const { data: shop, error: shopError } = await supabase
            .from('shops')
            .select('logo_url')
            .eq('id', shopId)
            .single();

        if (!shopError && shop?.logo_url) {
            await deleteShopLogo(supabase, shop.logo_url);
        }

        console.log(`Nettoyage terminé pour la boutique ${shopId}`);
    } catch (error) {
        console.error('Erreur lors du nettoyage des images de la boutique:', error);
    }
} 