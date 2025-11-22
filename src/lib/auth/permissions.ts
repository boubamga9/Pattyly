import type { SupabaseClient } from '@supabase/supabase-js';
import { STRIPE_PRODUCTS } from '$lib/config/server';

// ===== SIMPLE PERMISSIONS SYSTEM =====

/**
 * Get shop_id for a user profile
 * Returns the shop ID or null if no shop found
 */
export async function getShopIdAndSlug(profileId: string, supabase: SupabaseClient): Promise<{ id: string | null, slug: string | null }> {
    const { data: shop } = await supabase
        .from('shops')
        .select('id, slug')
        .eq('profile_id', profileId)
        .single();

    return {
        id: shop?.id || null,
        slug: shop?.slug || null
    };
}


/**
 * Get user's subscription plan
 * Returns: 'free' | 'basic' | 'premium' | 'exempt'
 * 
 * Nouvelle logique :
 * - Abonnement Stripe actif → Retourne le plan Stripe ('basic' ou 'premium')
 * - Pas d'abonnement actif → Retourne 'free' (plan gratuit permanent)
 * - Utilisateur exempt → Retourne 'exempt'
 * 
 * Note : L'essai gratuit de 7 jours est géré par Stripe lors de l'abonnement,
 * pas besoin de le gérer ici car Stripe retourne 'active' même pendant l'essai.
 */
async function getUserPlan(
    profileId: string,
    supabase: SupabaseClient
): Promise<'free' | 'basic' | 'premium' | 'exempt'> {

    // 1. Vérifier d'abord via Stripe (prioritaire)
    const { data: plan, error } = await supabase.rpc('get_user_plan', {
        p_profile_id: profileId,
        premium_product_id: STRIPE_PRODUCTS.PREMIUM,
        basic_product_id: STRIPE_PRODUCTS.BASIC
    });

    // Si abonnement actif → retourne le plan Stripe ('basic' ou 'premium')
    if (!error && plan && (plan === 'basic' || plan === 'premium' || plan === 'exempt')) {
        console.log('✅ Plan result (Stripe):', plan);
        return plan as 'basic' | 'premium' | 'exempt';
    }

    // 2. Pas d'abonnement actif → Plan gratuit permanent
    console.log('✅ User on free plan (no active subscription)');
    return 'free';
}

/**
 * Get all user permissions in one call
 * This is the main function to use throughout the app
 */
export async function getUserPermissions(profileId: string, supabase: SupabaseClient) {
    // 1. Récupérer toutes les infos de base en un seul appel
    const { data: basePermissions } = await (supabase as any).rpc('get_user_permissions', {
        p_profile_id: profileId
    });

    // 2. Récupérer shop details
    const { id: shopId, slug: shopSlug } = await getShopIdAndSlug(profileId, supabase);

    // 3. Déterminer le plan (plus besoin de trialEnding ou hasEverHadSubscription)
    const plan = await getUserPlan(profileId, supabase);

    // 4. Récupérer le nombre de produits actifs
    const { data: productCount, error: productCountError } = await (supabase as any).rpc('get_product_count', {
        profile_id: profileId
    });

    if (productCountError) {
        console.error('Error fetching product count:', productCountError);
    }

    return {
        shopId,
        shopSlug,
        plan,
        productCount: productCount || 0,
        canHandleCustomRequests: plan === 'premium' || plan === 'exempt',
        canManageCustomForms: plan === 'premium' || plan === 'exempt',
        isExempt: plan === 'exempt'
    };
}