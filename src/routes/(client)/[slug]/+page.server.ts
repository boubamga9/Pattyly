import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { loadShopCatalog } from '$lib/utils/catalog/catalog-loader';
import { env } from '$env/dynamic/private';

// ==========================
// ISR CONFIG
// ==========================
export const config = {
    isr: {
        expiration: false,
        bypassToken: env.REVALIDATION_TOKEN
    }
};
console.log('ISR CONFIG', config);

export const load: PageServerLoad = async ({ params, locals, setHeaders, url, request }) => {
    const { slug } = params;

    try {
        // 1. Récupérer l'ID de la boutique depuis le slug (actives et inactives)
        const { data: shopInfo, error: shopError } = await locals.supabase
            .from('shops')
            .select('id, is_active')
            .eq('slug', slug)
            .single();

        if (shopError || !shopInfo) {
            throw error(404, 'Boutique non trouvée');
        }

        const isShopActive = shopInfo.is_active;

        // 2. Vérifier si c'est une revalidation forcée
        const bypassToken = url.searchParams.get('bypassToken');
        const revalidateHeader = request.headers.get('x-prerender-revalidate');
        const isRevalidation = bypassToken === env.REVALIDATION_TOKEN || revalidateHeader === env.REVALIDATION_TOKEN;

        if (isRevalidation) {
            console.log(`🔄 Revalidation forcée pour la boutique ${shopInfo.id}`);
            // Vercel va régénérer la page immédiatement
        }

        // 3. Charger le catalogue (ISR gère le cache)
        const catalogData = await loadShopCatalog(locals.supabase, shopInfo.id);

        // 4. Headers CDN pour optimiser la performance
        setHeaders({
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
            'X-ISR-Revalidated': isRevalidation ? 'true' : 'false'
        });

        return {
            shop: catalogData.shop,
            categories: isShopActive ? catalogData.categories : [],
            products: isShopActive ? catalogData.products : [],
            faqs: catalogData.faqs,
            isShopActive,
            cacheInfo: {
                cached_at: catalogData.cached_at,
                catalog_version: catalogData.shop.catalog_version,
                revalidated: isRevalidation
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
