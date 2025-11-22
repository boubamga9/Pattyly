import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { loadShopCatalog } from '$lib/utils/catalog/catalog-loader';
import { env } from '$env/dynamic/private';

// ==========================
// ISR CONFIG
// ==========================
export const config = {
    isr: {
        expiration: false, // ✅ Permet la revalidation ISR
        bypassToken: env.REVALIDATION_TOKEN
    }
};

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
            // Pour ISR, retourner un flag au lieu de throw error
            return { notFound: true };
        }


        // 2. Vérifier si c'est une revalidation forcée (AVANT la vérification de visibilité)
        const bypassToken = url.searchParams.get('bypassToken');
        const revalidateHeader = request.headers.get('x-prerender-revalidate');
        const isRevalidation = bypassToken === env.REVALIDATION_TOKEN || revalidateHeader === env.REVALIDATION_TOKEN;

        // La visibilité dépend uniquement de is_active
        const isShopVisible = shopInfo.is_active;


        // Si la boutique n'est pas visible ET ce n'est pas une revalidation, retourner 404
        // ✅ ISR met en cache la 404 → pas de problème de cache
        // ✅ Si revalidation, on continue pour mettre à jour le cache même si invisible
        if (!isShopVisible && !isRevalidation) {
            return { notFound: true };
        }

        // 4. Charger le catalogue (ISR gère le cache)
        const catalogData = await loadShopCatalog(locals.supabase, shopInfo.id);

        // 6. Headers CDN pour optimiser la performance
        setHeaders({
            'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400',
            'X-ISR-Revalidated': isRevalidation ? 'true' : 'false'
        });


        return {
            shop: catalogData.shop,
            categories: catalogData.categories,
            products: catalogData.products,
            faqs: catalogData.faqs,
            isShopActive: isShopVisible,
            cacheInfo: {
                cached_at: catalogData.cached_at,
                revalidated: isRevalidation
            }
        };
    } catch (err) {
        console.error('💥 [/slug] Error caught in try/catch:', err);
        console.error('💥 [/slug] Error details:', {
            name: err instanceof Error ? err.name : 'Unknown',
            message: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : 'No stack'
        });

        // Si c'est une erreur 404, la relancer
        if (err instanceof Error && err.message.includes('404')) {
            console.log('💥 [/slug] Rethrowing 404 error');
            throw err;
        }

        // Pour les autres erreurs, afficher une page d'erreur générique
        throw error(500, 'Erreur lors du chargement de la boutique. Veuillez réessayer plus tard.');
    }
};
