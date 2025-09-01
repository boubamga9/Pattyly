import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { loadShopCatalog } from '$lib/utils/catalog/catalog-loader';

export const load: PageServerLoad = async ({ params, locals, setHeaders }) => {
    const { slug } = params;

    try {
        // 1. Récupérer l'ID de la boutique depuis le slug
        const { data: shopInfo, error: shopError } = await locals.supabase
            .from('shops')
            .select('id')
            .eq('slug', slug)
            .eq('is_active', true)
            .single();

        if (shopError || !shopInfo) {
            throw error(404, 'Boutique non trouvée');
        }

        // 2. Charger le catalogue avec gestion du cache
        const catalogData = await loadShopCatalog(locals.supabase, shopInfo.id);

        // 3. Headers CDN pour optimiser la performance
        setHeaders({
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
            'X-Cache-Status': catalogData.from_cache ? 'HIT' : 'MISS'
        });

        return {
            shop: catalogData.shop,
            categories: catalogData.categories,
            products: catalogData.products,
            faqs: catalogData.faqs,
            cacheInfo: {
                cached_at: catalogData.cached_at,
                catalog_version: catalogData.shop.catalog_version,
                from_cache: catalogData.from_cache
            }
        };
    } catch (err) {

        // Si c'est une erreur 404, la relancer
        if (err instanceof Error && err.message.includes('404')) {
            throw err;
        }

        // Pour les autres erreurs, afficher une page d'erreur générique
        throw error(500, 'Erreur lors du chargement de la boutique. Veuillez réessayer plus tard.');
    }
};
