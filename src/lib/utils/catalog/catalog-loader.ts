import type { SupabaseClient } from '@supabase/supabase-js';
import { catalogCache, CatalogCache } from './catalog-cache';

/**
 * Charge le catalogue d'une boutique avec gestion du cache
 * @param supabase Instance Supabase
 * @param shopId ID de la boutique
 * @returns Données du catalogue (produits, catégories, infos boutique)
 */
export async function loadShopCatalog(
    supabase: SupabaseClient,
    shopId: string
): Promise<any> {
    try {
        // 1. Récupérer la version actuelle du catalogue
        const { data: shop, error: shopError } = await supabase
            .from('shops')
            .select('id, name, bio, slug, logo_url, instagram, tiktok, website, catalog_version, is_custom_accepted')
            .eq('id', shopId)
            .single();

        if (shopError || !shop) {
            throw new Error('Boutique non trouvée');
        }

        // 2. Générer la clé de cache
        const cacheKey = CatalogCache.generateKey(shopId, shop.catalog_version);

        // 3. Essayer de récupérer depuis le cache
        const cachedData = await catalogCache.get(cacheKey);
        if (cachedData) {
            // Retourner les données du cache avec from_cache: true
            return {
                ...cachedData,
                from_cache: true
            };
        }


        // 4. Cache miss → Charger depuis Supabase
        const [productsResult, categoriesResult, faqsResult] = await Promise.all([
            // Récupérer les produits actifs
            supabase
                .from('products')
                .select(`
                    id, name, description, base_price, image_url, min_days_notice, category_id,
                    categories(name),
                    forms(
                        id,
                        form_fields(
                            id, label, type, options, required, order
                        )
                    )
                `)
                .eq('shop_id', shopId)
                .eq('is_active', true)
                .order('created_at', { ascending: false }),

            // Récupérer les catégories
            supabase
                .from('categories')
                .select('id, name')
                .eq('shop_id', shopId)
                .order('name'),

            // Récupérer les FAQ
            supabase
                .from('faq')
                .select('*')
                .eq('shop_id', shopId)
                .order('created_at', { ascending: true })
        ]);

        if (productsResult.error) {
            throw new Error('Erreur lors du chargement des produits');
        }

        if (categoriesResult.error) {
            throw new Error('Erreur lors du chargement des catégories');
        }

        // 5. Structurer les données du catalogue
        const catalogData = {
            shop: {
                id: shop.id,
                name: shop.name,
                bio: shop.bio,
                slug: shop.slug,
                logo_url: shop.logo_url,
                instagram: shop.instagram,
                tiktok: shop.tiktok,
                website: shop.website,
                catalog_version: shop.catalog_version,
                is_custom_accepted: shop.is_custom_accepted
            },
            products: productsResult.data || [],
            categories: categoriesResult.data || [],
            faqs: faqsResult.data || [],
            from_cache: false, // Données chargées depuis Supabase
            cached_at: new Date().toISOString()
        };

        // 6. Stocker dans le cache (TTL: 1 heure)
        await catalogCache.set(cacheKey, catalogData, 3600);

        return catalogData;
    } catch (error) {
        throw error;
    }
}

/**
 * Récupère les statistiques du cache (utile pour le debugging)
 */
export function getCacheStats() {
    return catalogCache.getStats();
}

/**
 * Vide le cache (utile pour les tests ou en cas de problème)
 */
export async function clearCache() {
    await catalogCache.clear();
}
