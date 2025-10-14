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

export const load: PageServerLoad = async ({ params, locals, setHeaders, url, request }) => {
    const { slug } = params;

    try {
        // 1. Récupérer l'ID de la boutique depuis le slug (actives et inactives)
        const { data: shopInfo, error: shopError } = await locals.supabase
            .from('shops')
            .select('id, is_active, profile_id')
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

        if (isRevalidation) {
            console.log(`🔄 Revalidation forcée pour la boutique ${shopInfo.id}`);
        }

        // 3. Vérifier si la boutique est visible (essai, abonnement ou admin)
        const { data: isVisibleData, error: visibilityError } = await (locals.supabase as any).rpc('is_shop_visible', {
            p_profile_id: shopInfo.profile_id,
            p_is_active: shopInfo.is_active
        });

        console.log('🔍 [Shop Visibility]', {
            slug,
            profile_id: shopInfo.profile_id,
            is_active: shopInfo.is_active,
            isVisibleData,
            visibilityError,
            isRevalidation
        });

        const isShopVisible = isVisibleData || false;

        // Si la boutique n'est pas visible ET ce n'est pas une revalidation, retourner 404
        // ✅ ISR met en cache la 404 → pas de problème de cache
        // ✅ Si revalidation, on continue pour mettre à jour le cache même si invisible
        if (!isShopVisible && !isRevalidation) {
            console.log('❌ Shop not visible, returning 404');
            return { notFound: true };
        }

        // 4. Charger le catalogue (ISR gère le cache)
        const catalogData = await loadShopCatalog(locals.supabase, shopInfo.id);

        // 5. Headers CDN pour optimiser la performance
        setHeaders({
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
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

        // Si c'est une erreur 404, la relancer
        if (err instanceof Error && err.message.includes('404')) {
            throw err;
        }

        // Pour les autres erreurs, afficher une page d'erreur générique
        throw error(500, 'Erreur lors du chargement de la boutique. Veuillez réessayer plus tard.');
    }
};
