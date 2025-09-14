import type { SupabaseClient } from '@supabase/supabase-js';

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
 */
async function getUserPlan(profileId: string, supabase: SupabaseClient): Promise<string | null> {

    // Check if user is exempt from Stripe
    const { data: profile } = await supabase
        .from('profiles')
        .select('is_stripe_free')
        .eq('id', profileId)
        .single();


    if (profile?.is_stripe_free) {
        return 'exempt';
    }

    // Check active subscription OR trial subscription (ignore inactive for plan detection)
    const { data: subscription } = await supabase
        .from('user_products')
        .select('stripe_product_id, subscription_status')
        .eq('profile_id', profileId)
        .eq('subscription_status', 'active')
        .single();


    if (subscription?.stripe_product_id === 'prod_Selcz36pAfV3vV') {
        return 'premium';
    }

    if (subscription?.stripe_product_id === 'prod_Selbd3Ne2plHqG') {
        return 'basic';
    }

    // Si l'utilisateur a un abonnement inactif, on ne retourne pas null
    // mais on vérifie s'il a un historique d'abonnement
    const { data: anySubscription } = await supabase
        .from('user_products')
        .select('stripe_product_id')
        .eq('profile_id', profileId)
        .single();

    if (anySubscription) {
        // L'utilisateur a un historique d'abonnement (même inactif)
        // On détermine le plan selon le produit_id, peu importe le statut
        if (anySubscription.stripe_product_id === 'prod_Selcz36pAfV3vV') {
            return 'premium';
        }
        if (anySubscription.stripe_product_id === 'prod_Selbd3Ne2plHqG') {
            return 'basic';
        }
    }

    return null; // No subscription at all
}

/**
 * Get current product count for a user
 */
async function getProductCount(profileId: string, supabase: SupabaseClient): Promise<number> {
    // First, get the shop_id for this profile
    const { id: shopId } = await getShopIdAndSlug(profileId, supabase);

    if (!shopId) {
        return 0; // No shop found, so no products
    }

    // Then count products for this shop
    const { count } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('shop_id', shopId);

    return count || 0;
}

/**
 * Get all user permissions in one call
 * This is the main function to use throughout the app
 */
export async function getUserPermissions(profileId: string, supabase: SupabaseClient) {
    const { id: shopId, slug: shopSlug } = await getShopIdAndSlug(profileId, supabase);
    const plan = await getUserPlan(profileId, supabase);
    const productCount = await getProductCount(profileId, supabase);
    const productLimit = plan === 'premium' ? Infinity : plan === 'exempt' ? Infinity : 10;

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
        isExempt: plan === 'exempt',
        canAccessDashboard: plan !== null // Allow access if user has any plan (basic, premium, or exempt)
    };
}