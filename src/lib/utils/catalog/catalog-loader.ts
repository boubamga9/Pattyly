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
    console.log('🏪 [Catalog Loader] Starting catalog load for shop:', shopId);

    try {
        // 1. Récupérer les informations de la boutique
        console.log('🏪 [Catalog Loader] Step 1: Fetching shop details...');
        const { data: shop, error: shopError } = await supabase
            .from('shops')
            .select('id, name, bio, slug, logo_url, instagram, tiktok, website, is_custom_accepted, is_active')
            .eq('id', shopId)
            .single();

        console.log('🏪 [Catalog Loader] Step 1 Result:', {
            shopId,
            hasShop: !!shop,
            shopError: shopError?.message || null,
            shopData: shop || null
        });

        if (shopError || !shop) {
            console.error('❌ [Catalog Loader] Shop not found, throwing error');
            throw new Error('Boutique non trouvée');
        }

        // 2. Charger directement depuis Supabase (ISR gère le cache)
        console.log('🏪 [Catalog Loader] Step 2: Loading products, categories, and FAQs...');
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
                .select('id, question, answer')
                .eq('shop_id', shopId)
                .order('created_at', { ascending: true })
        ]);

        console.log('🏪 [Catalog Loader] Step 2 Result:', {
            productsCount: productsResult.data?.length || 0,
            productsError: productsResult.error?.message || null,
            categoriesCount: categoriesResult.data?.length || 0,
            categoriesError: categoriesResult.error?.message || null,
            faqsCount: faqsResult.data?.length || 0,
            faqsError: faqsResult.error?.message || null
        });

        if (productsResult.error) {
            console.error('❌ [Catalog Loader] Products error:', productsResult.error);
            throw new Error('Erreur lors du chargement des produits');
        }

        if (categoriesResult.error) {
            console.error('❌ [Catalog Loader] Categories error:', categoriesResult.error);
            throw new Error('Erreur lors du chargement des catégories');
        }

        // 3. Structurer les données du catalogue
        console.log('🏪 [Catalog Loader] Step 3: Structuring catalog data...');
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
                is_custom_accepted: shop.is_custom_accepted,
                is_active: shop.is_active
            },
            products: productsResult.data || [],
            categories: categoriesResult.data || [],
            faqs: faqsResult.data || [],
            cached_at: new Date().toISOString()
        };

        console.log('✅ [Catalog Loader] Catalog successfully loaded:', {
            shopId: catalogData.shop.id,
            shopName: catalogData.shop.name,
            productsCount: catalogData.products.length,
            categoriesCount: catalogData.categories.length,
            faqsCount: catalogData.faqs.length
        });

        return catalogData;
    } catch (error) {
        console.error('💥 [Catalog Loader] Error in loadShopCatalog:', error);
        console.error('💥 [Catalog Loader] Error details:', {
            name: error instanceof Error ? error.name : 'Unknown',
            message: error instanceof Error ? error.message : String(error)
        });
        throw error;
    }
}

