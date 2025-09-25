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
 */
async function getUserPlan(profileId: string, supabase: SupabaseClient): Promise<string | null> {

    const { data: plan, error } = await supabase.rpc('get_user_plan', {
        p_profile_id: profileId,
        premium_product_id: STRIPE_PRODUCTS.PREMIUM,
        basic_product_id: STRIPE_PRODUCTS.BASIC
    });

    if (error) {
        return null;
    }

    console.log('✅ Plan result:', plan);
    return plan;
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