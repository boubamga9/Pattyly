import type { SupabaseClient } from '@supabase/supabase-js';
import { STRIPE_PRODUCTS } from '$lib/config/server';

/**
 * Limites de produits (gâteaux) par plan
 */
export const PRODUCT_LIMITS = {
    free: 3,
    basic: 10, // Starter
    premium: 999999, // Illimité
    exempt: 999999 // Illimité
} as const;

export type Plan = 'free' | 'basic' | 'premium' | 'exempt';

/**
 * Obtenir la limite de produits selon le plan
 */
export function getProductLimit(plan: Plan | null): number {
    if (!plan) return PRODUCT_LIMITS.free;
    return PRODUCT_LIMITS[plan] || PRODUCT_LIMITS.free;
}

/**
 * Interface pour les statistiques de produits
 */
export interface ProductLimitStats {
    plan: Plan | null;
    productCount: number;
    productLimit: number;
    remaining: number;
    isLimitReached: boolean;
}

/**
 * Vérifier la limite de produits pour un shop
 * Utilise la fonction RPC SQL pour obtenir les statistiques
 * ✅ Passe les IDs de produits Stripe depuis la config pour supporter dev/prod
 */
export async function checkProductLimit(
    shopId: string,
    profileId: string,
    supabase: SupabaseClient
): Promise<ProductLimitStats> {
    console.log('📊 [Product Limits] Checking limit for shop:', shopId, 'profile:', profileId);
    
    // ✅ Passer les IDs de produits depuis la config pour supporter différents environnements
    const { data, error } = await (supabase as any).rpc('check_product_limit', {
        p_shop_id: shopId,
        p_profile_id: profileId,
        p_premium_product_id: STRIPE_PRODUCTS.PREMIUM,
        p_basic_product_id: STRIPE_PRODUCTS.BASIC
    });

    if (error) {
        console.error('❌ [Product Limits] Error checking product limit:', error);
        // En cas d'erreur, retourner des valeurs par défaut (plan gratuit)
        const defaultStats = {
            plan: 'free' as Plan,
            productCount: 0,
            productLimit: PRODUCT_LIMITS.free,
            remaining: PRODUCT_LIMITS.free,
            isLimitReached: false
        };
        console.log('⚠️ [Product Limits] Returning default stats (free plan):', defaultStats);
        return defaultStats;
    }

    const stats: ProductLimitStats = {
        plan: data?.plan || 'free',
        productCount: data?.productCount || 0,
        productLimit: data?.productLimit || PRODUCT_LIMITS.free,
        remaining: data?.remaining || 0,
        isLimitReached: data?.isLimitReached || false
    };

    console.log('✅ [Product Limits] Stats retrieved:', {
        plan: stats.plan,
        productCount: stats.productCount,
        productLimit: stats.productLimit,
        remaining: stats.remaining,
        isLimitReached: stats.isLimitReached,
        percentage: stats.productLimit > 0 ? Math.round((stats.productCount / stats.productLimit) * 100) : 0
    });

    if (stats.isLimitReached) {
        console.warn('🚫 [Product Limits] LIMIT REACHED!', {
            shopId,
            profileId,
            plan: stats.plan,
            productCount: stats.productCount,
            productLimit: stats.productLimit
        });
    } else if (stats.remaining <= 1) {
        console.warn('⚠️ [Product Limits] Limit almost reached!', {
            shopId,
            profileId,
            plan: stats.plan,
            productCount: stats.productCount,
            productLimit: stats.productLimit,
            remaining: stats.remaining
        });
    }

    return stats;
}

