import type { SupabaseClient } from '@supabase/supabase-js';
import { deleteImage, extractPublicIdFromUrl } from '$lib/cloudinary';

/**
 * Vérifie si une URL est une URL Cloudinary
 */
function isCloudinaryUrl(url: string): boolean {
    return url.includes('cloudinary.com') || url.includes('res.cloudinary.com');
}

/**
 * Supprime une image Cloudinary si elle n'est plus utilisée par d'autres produits
 * @param supabase - Client Supabase pour vérifier les usages
 * @param imageUrl - URL de l'image à supprimer
 * @param excludeProductId - ID du produit à exclure de la vérification (si on modifie un produit)
 */
export async function deleteImageIfUnused(
    supabase: SupabaseClient,
    imageUrl: string,
    excludeProductId?: string
): Promise<void> {
    if (!imageUrl) return;

    // Ne supprimer que les images Cloudinary
    if (!isCloudinaryUrl(imageUrl)) {
        console.warn('⚠️ [Storage] Image URL is not Cloudinary, skipping deletion:', imageUrl);
        return;
    }

    try {
        // Vérifier si d'autres produits utilisent cette image
        const { data: productsUsingImage, error: checkError } = await supabase
            .from('products')
            .select('id')
            .eq('image_url', imageUrl);

        if (checkError) {
            console.error('❌ [Storage] Error checking image usage:', checkError);
            return;
        }

        // Filtrer le produit actuel si on est en train de le modifier
        const otherProductsUsingImage = excludeProductId
            ? productsUsingImage.filter(p => p.id !== excludeProductId)
            : productsUsingImage;

        // Si aucun autre produit n'utilise cette image, la supprimer
        if (otherProductsUsingImage.length === 0) {
            const publicId = extractPublicIdFromUrl(imageUrl);
            if (publicId) {
                await deleteImage(publicId);
                console.log('✅ [Storage] Deleted unused Cloudinary image:', publicId);
            }
        }
    } catch (error) {
        console.error('❌ [Storage] Error deleting image:', error);
    }
}

/**
 * Supprime le logo d'une boutique depuis Cloudinary
 * @param supabase - Client Supabase (non utilisé mais gardé pour compatibilité)
 * @param logoUrl - URL Cloudinary du logo
 */
export async function deleteShopLogo(
    supabase: SupabaseClient,
    logoUrl: string
): Promise<void> {
    if (!logoUrl) return;

    // Ne supprimer que les images Cloudinary
    if (!isCloudinaryUrl(logoUrl)) {
        console.warn('⚠️ [Storage] Logo URL is not Cloudinary, skipping deletion:', logoUrl);
        return;
    }

    try {
        const publicId = extractPublicIdFromUrl(logoUrl);
        if (publicId) {
            await deleteImage(publicId);
            console.log('✅ [Storage] Deleted shop logo from Cloudinary:', publicId);
        }
    } catch (error) {
        console.error('❌ [Storage] Error deleting shop logo:', error);
    }
}

/**
 * Supprime toutes les images d'une boutique (produits + logo) depuis Cloudinary
 * @param supabase - Client Supabase pour récupérer les données
 * @param shopId - ID de la boutique
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
            console.error('❌ [Storage] Error fetching products:', productsError);
            return;
        }

        // Supprimer toutes les images de produits
        for (const product of products) {
            if (product.image_url && isCloudinaryUrl(product.image_url)) {
                const publicId = extractPublicIdFromUrl(product.image_url);
                if (publicId) {
                    await deleteImage(publicId);
                }
            }
        }

        // Récupérer et supprimer le logo de la boutique
        const { data: shop, error: shopError } = await supabase
            .from('shops')
            .select('logo_url')
            .eq('id', shopId)
            .single();

        if (!shopError && shop?.logo_url && isCloudinaryUrl(shop.logo_url)) {
            const publicId = extractPublicIdFromUrl(shop.logo_url);
            if (publicId) {
                await deleteImage(publicId);
            }
        }

        // Récupérer et supprimer l'image de fond si elle existe
        const { data: customization, error: customizationError } = await supabase
            .from('shop_customizations')
            .select('background_image_url')
            .eq('shop_id', shopId)
            .single();

        if (!customizationError && customization?.background_image_url && isCloudinaryUrl(customization.background_image_url)) {
            const publicId = extractPublicIdFromUrl(customization.background_image_url);
            if (publicId) {
                await deleteImage(publicId);
            }
        }

        console.log('✅ [Storage] Deleted all images for shop:', shopId);
    } catch (error) {
        console.error('❌ [Storage] Error deleting all shop images:', error);
    }
} 