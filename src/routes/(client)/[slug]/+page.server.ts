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



        const { data: isVisibleData, error: visibilityError } = await (locals.supabaseServiceRole as any).rpc('is_shop_visible', {
            p_profile_id: shopInfo.profile_id,
            p_is_active: shopInfo.is_active
        });


        const isShopVisible = isVisibleData || false;


        // Si la boutique n'est pas visible ET ce n'est pas une revalidation, retourner 404
        // ✅ ISR met en cache la 404 → pas de problème de cache
        // ✅ Si revalidation, on continue pour mettre à jour le cache même si invisible
        if (!isShopVisible && !isRevalidation) {
            console.log('❌ [/slug] Shop not visible, returning 404');
            return { notFound: true };
        }


        // 4. Charger le catalogue (ISR gère le cache)
        const catalogData = await loadShopCatalog(locals.supabase, shopInfo.id);


        // 5. Récupérer les customizations
        const { data: customizations } = await locals.supabase
            .from('shop_customizations')
            .select('button_color, button_text_color, text_color, icon_color, secondary_text_color, background_color, background_image_url')
            .eq('shop_id', shopInfo.id)
            .single();

        // 6. Headers CDN pour optimiser la performance
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
            customizations: customizations || {
                button_color: '#ff6f61',
                button_text_color: '#ffffff',
                text_color: '#333333',
                icon_color: '#6b7280',
                secondary_text_color: '#333333',
                background_color: '#ffe8d6',
                background_image_url: null
            },
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
