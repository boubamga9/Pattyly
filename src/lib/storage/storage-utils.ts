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
            return;
        }

        // Vérifier si d'autres produits utilisent cette image
        const { data: productsUsingImage, error: checkError } = await supabase
            .from('products')
            .select('id')
            .eq('image_url', imageUrl);

        if (checkError) {
            return;
        }

        // Filtrer le produit actuel si on est en train de le modifier
        const otherProductsUsingImage = excludeProductId
            ? productsUsingImage.filter(p => p.id !== excludeProductId)
            : productsUsingImage;

        // Si aucun autre produit n'utilise cette image, la supprimer
        if (otherProductsUsingImage.length === 0) {

            const { error: deleteError } = await supabase.storage
                .from('product-images')
                .remove([fileName]);

            if (deleteError) {
            } else {
            }
        } else {
        }
    } catch (error) {
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
        // Extraire le chemin complet du fichier depuis l'URL Supabase
        // Format: http://localhost:54321/storage/v1/object/public/shop-logos/userId/filename
        const urlParts = logoUrl.split('/');
        const storageIndex = urlParts.findIndex(part => part === 'shop-logos');

        if (storageIndex === -1) {
            return;
        }

        // Construire le chemin: userId/filename
        const filePath = urlParts.slice(storageIndex + 1).join('/');

        if (!filePath) {
            return;
        }


        const { error: deleteError } = await supabase.storage
            .from('shop-logos')
            .remove([filePath]);

        if (deleteError) {
        } else {
        }
    } catch (error) {
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

    } catch (error) {
    }
} 