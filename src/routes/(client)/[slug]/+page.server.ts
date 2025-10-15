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

    console.log('🚀 [/slug] Starting load function for slug:', slug);

    try {
        // 1. Récupérer l'ID de la boutique depuis le slug (actives et inactives)
        console.log('📊 [/slug] Step 1: Fetching shop info from database...');
        const { data: shopInfo, error: shopError } = await locals.supabase
            .from('shops')
            .select('id, is_active, profile_id')
            .eq('slug', slug)
            .single();

        console.log('📊 [/slug] Step 1 Result:', {
            shopInfo,
            shopError: shopError?.message || null
        });

        if (shopError || !shopInfo) {
            console.log('❌ [/slug] Shop not found, returning 404');
            // Pour ISR, retourner un flag au lieu de throw error
            return { notFound: true };
        }

        console.log('✅ [/slug] Shop found:', {
            shop_id: shopInfo.id,
            profile_id: shopInfo.profile_id,
            is_active: shopInfo.is_active
        });

        // 2. Vérifier si c'est une revalidation forcée (AVANT la vérification de visibilité)
        console.log('📊 [/slug] Step 2: Checking revalidation...');
        const bypassToken = url.searchParams.get('bypassToken');
        const revalidateHeader = request.headers.get('x-prerender-revalidate');
        const isRevalidation = bypassToken === env.REVALIDATION_TOKEN || revalidateHeader === env.REVALIDATION_TOKEN;

        console.log('📊 [/slug] Step 2 Result:', {
            isRevalidation,
            bypassToken: bypassToken ? 'present' : 'absent',
            revalidateHeader: revalidateHeader ? 'present' : 'absent'
        });

        // 3. Vérifier si la boutique est visible (essai, abonnement ou admin)
        console.log('🔒 [/slug] Step 3: Checking shop visibility via RPC...');
        console.log('🔒 [/slug] RPC params:', {
            p_profile_id: shopInfo.profile_id,
            p_is_active: shopInfo.is_active
        });

        const { data: isVisibleData, error: visibilityError } = await (locals.supabaseServiceRole as any).rpc('is_shop_visible', {
            p_profile_id: shopInfo.profile_id,
            p_is_active: shopInfo.is_active
        });

        console.log('🔒 [/slug] Step 3 Result:', {
            isVisibleData,
            visibilityError: visibilityError?.message || null,
            visibilityErrorDetails: visibilityError || null
        });

        const isShopVisible = isVisibleData || false;

        console.log('🔒 [/slug] Final visibility decision:', {
            isShopVisible,
            isRevalidation,
            willReturn404: !isShopVisible && !isRevalidation
        });

        // Si la boutique n'est pas visible ET ce n'est pas une revalidation, retourner 404
        // ✅ ISR met en cache la 404 → pas de problème de cache
        // ✅ Si revalidation, on continue pour mettre à jour le cache même si invisible
        if (!isShopVisible && !isRevalidation) {
            console.log('❌ [/slug] Shop not visible, returning 404');
            return { notFound: true };
        }

        console.log('✅ [/slug] Shop is visible or revalidation, continuing...');

        // 4. Charger le catalogue (ISR gère le cache)
        console.log('📦 [/slug] Step 4: Loading catalog...');
        const catalogData = await loadShopCatalog(locals.supabase, shopInfo.id);
        console.log('📦 [/slug] Step 4 Result:', {
            hasShop: !!catalogData.shop,
            productsCount: catalogData.products?.length || 0,
            categoriesCount: catalogData.categories?.length || 0,
            faqsCount: catalogData.faqs?.length || 0
        });

        // 5. Headers CDN pour optimiser la performance
        console.log('🎯 [/slug] Step 5: Setting headers...');
        setHeaders({
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
            'X-ISR-Revalidated': isRevalidation ? 'true' : 'false'
        });

        console.log('✅ [/slug] Success! Returning data to client');

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
        console.log('💥 [/slug] Throwing 500 error');
        throw error(500, 'Erreur lors du chargement de la boutique. Veuillez réessayer plus tard.');
    }
};
