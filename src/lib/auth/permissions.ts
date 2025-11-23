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
 * ✅ OPTIMISÉ : Vérifier la propriété d'un shop
 * Utilise le RPC verify_shop_ownership pour une vérification rapide
 */
export async function verifyShopOwnership(
    profileId: string,
    shopId: string,
    supabase: SupabaseClient
): Promise<boolean> {
    const { data: isOwner, error } = await (supabase as any).rpc('verify_shop_ownership', {
        p_profile_id: profileId,
        p_shop_id: shopId
    });

    if (error) {
        console.error('Error verifying shop ownership:', error);
        return false;
    }

    return isOwner === true;
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
 * 
 * ✅ OPTIMISÉ : Utilise maintenant get_user_permissions_complete qui regroupe
 * toutes les requêtes en une seule (4 requêtes → 1 requête)
 */
export async function getUserPermissions(profileId: string, supabase: SupabaseClient) {
    // ✅ OPTIMISÉ : Un seul appel RPC qui regroupe toutes les permissions
    const { data: permissions, error } = await (supabase as any).rpc('get_user_permissions_complete', {
        p_profile_id: profileId,
        p_premium_product_id: STRIPE_PRODUCTS.PREMIUM,
        p_basic_product_id: STRIPE_PRODUCTS.BASIC
    });

    if (error) {
        console.error('Error fetching user permissions:', error);
        throw error;
    }

    // Le RPC retourne déjà tout ce dont on a besoin
    return {
        shopId: permissions?.shopId || null,
        shopSlug: permissions?.shopSlug || null,
        plan: (permissions?.plan || 'free') as 'free' | 'basic' | 'premium' | 'exempt',
        productCount: permissions?.productCount || 0,
        canHandleCustomRequests: permissions?.canHandleCustomRequests || false,
        canManageCustomForms: permissions?.canManageCustomForms || false,
        isExempt: permissions?.isExempt || false
    };
}