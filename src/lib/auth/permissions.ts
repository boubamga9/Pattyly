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
 * Returns: 'basic' | 'premium' | 'exempt' | null
 * 
 * Logique basée sur le tableau de spécifications :
 * - Abonnement actif → Retourne le plan Stripe
 * - Abonnement inactif OU essai expiré → null (limité)
 * - Essai actif ET jamais eu d'abonnement → 'premium'
 * - Rien → null
 */
async function getUserPlan(
    profileId: string,
    supabase: SupabaseClient,
    trialEnding: string | null,
    hasEverHadSubscription: boolean
): Promise<string | null> {

    // 1. Vérifier d'abord via Stripe (prioritaire)
    const { data: plan, error } = await supabase.rpc('get_user_plan', {
        p_profile_id: profileId,
        premium_product_id: STRIPE_PRODUCTS.PREMIUM,
        basic_product_id: STRIPE_PRODUCTS.BASIC
    });

    // Si abonnement actif → retourne le plan Stripe
    if (!error && plan) {
        console.log('✅ Plan result (Stripe):', plan);
        return plan;
    }

    // 2. Si l'utilisateur a déjà eu un abonnement (inactif)
    // → Accès limité
    if (hasEverHadSubscription) {
        console.log('❌ User has inactive subscription → limited');
        return null;
    }

    // 3. Si jamais eu d'abonnement, vérifier l'essai gratuit
    const isTrialActive = trialEnding && new Date(trialEnding) > new Date();

    if (isTrialActive) {
        console.log('✅ User in trial period until:', trialEnding);
        return 'premium'; // Essai gratuit = premium
    }

    // 4. Essai expiré, jamais eu d'abonnement → Accès limité
    console.log('❌ Trial expired, no subscription → limited');
    return null;
}

/**
 * Get current product count for a user
 */
async function getProductCount(profileId: string, supabase: SupabaseClient): Promise<number> {
    // First, get the shop_id for this profile
    const { data: count, error } = await supabase.rpc('get_product_count', {
        profile_id: profileId
    });

    if (error) {
        console.error('Error in get_product_count RPC:', error);
        return 0;
    }
    console.log('count', count);
    return count || 0;
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

    const trialEnding = (basePermissions as any)?.[0]?.trial_ending || null;
    const hasEverHadSubscription = (basePermissions as any)?.[0]?.has_ever_had_subscription || false;

    // 2. Récupérer shop details
    const { id: shopId, slug: shopSlug } = await getShopIdAndSlug(profileId, supabase);

    // 3. Déterminer le plan (avec hasEverHadSubscription)
    const plan = await getUserPlan(profileId, supabase, trialEnding, hasEverHadSubscription);

    // 4. Compter les produits
    const productCount = await getProductCount(profileId, supabase);
    const productLimit = plan === 'premium' || plan === 'exempt' ? 99 : 10;

    return {
        shopId,
        shopSlug,
        plan,
        productCount,
        productLimit,
        canHandleCustomRequests: plan === 'premium' || plan === 'exempt',
        canManageCustomForms: plan === 'premium' || plan === 'exempt',
        canAddMoreProducts: productCount < productLimit,
        needsSubscription: plan === null,
        isExempt: plan === 'exempt'
    };
}