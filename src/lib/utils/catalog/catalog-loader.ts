import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Charge le catalogue d'une boutique (ISR gère le cache)
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

        // 2. Charger directement depuis Supabase (ISR gère le cache)
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

        // 3. Structurer les données du catalogue
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
            cached_at: new Date().toISOString()
        };

        return catalogData;
    } catch (error) {
        throw error;
    }
}

