import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Limites de commandes par plan (selon /pricing)
 */
export const ORDER_LIMITS = {
    free: 5,
    basic: 20, // Starter
    premium: 999999, // Illimité
    exempt: 999999 // Illimité
} as const;

export type Plan = 'free' | 'basic' | 'premium' | 'exempt';

/**
 * Obtenir la limite de commandes selon le plan
 */
export function getOrderLimit(plan: Plan | null): number {
    if (!plan) return ORDER_LIMITS.free;
    return ORDER_LIMITS[plan] || ORDER_LIMITS.free;
}

/**
 * Interface pour les statistiques de commandes
 */
export interface OrderLimitStats {
    plan: Plan | null;
    orderCount: number;
    orderLimit: number;
    remaining: number;
    isLimitReached: boolean;
}

/**
 * Vérifier la limite de commandes pour un shop
 * Utilise la fonction RPC SQL pour obtenir les statistiques
 */
export async function checkOrderLimit(
    shopId: string,
    profileId: string,
    supabase: SupabaseClient
): Promise<OrderLimitStats> {
    console.log('📊 [Order Limits] Checking limit for shop:', shopId, 'profile:', profileId);
    
    const { data, error } = await (supabase as any).rpc('check_order_limit', {
        p_shop_id: shopId,
        p_profile_id: profileId
    });

    if (error) {
        console.error('❌ [Order Limits] Error checking order limit:', error);
        // En cas d'erreur, retourner des valeurs par défaut (plan gratuit)
        const defaultStats = {
            plan: 'free' as Plan,
            orderCount: 0,
            orderLimit: ORDER_LIMITS.free,
            remaining: ORDER_LIMITS.free,
            isLimitReached: false
        };
        console.log('⚠️ [Order Limits] Returning default stats (free plan):', defaultStats);
        return defaultStats;
    }

    const stats: OrderLimitStats = {
        plan: data?.plan || 'free',
        orderCount: data?.orderCount || 0,
        orderLimit: data?.orderLimit || ORDER_LIMITS.free,
        remaining: data?.remaining || 0,
        isLimitReached: data?.isLimitReached || false
    };

    console.log('✅ [Order Limits] Stats retrieved:', {
        plan: stats.plan,
        orderCount: stats.orderCount,
        orderLimit: stats.orderLimit,
        remaining: stats.remaining,
        isLimitReached: stats.isLimitReached,
        percentage: stats.orderLimit > 0 ? Math.round((stats.orderCount / stats.orderLimit) * 100) : 0
    });

    if (stats.isLimitReached) {
        console.warn('🚫 [Order Limits] LIMIT REACHED!', {
            shopId,
            profileId,
            plan: stats.plan,
            orderCount: stats.orderCount,
            orderLimit: stats.orderLimit
        });
    } else if (stats.remaining <= 2) {
        console.warn('⚠️ [Order Limits] Limit almost reached!', {
            shopId,
            profileId,
            plan: stats.plan,
            orderCount: stats.orderCount,
            orderLimit: stats.orderLimit,
            remaining: stats.remaining
        });
    }

    return stats;
}

