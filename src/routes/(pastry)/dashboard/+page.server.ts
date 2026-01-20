import { redirect } from '@sveltejs/kit';
import { STRIPE_PRODUCTS, STRIPE_PRICES } from '$lib/config/server';
import type { Actions } from './$types';

export const load = async ({ locals, parent }) => {
    // ✅ OPTIMISÉ : Réutiliser les permissions du layout au lieu de refaire la requête
    const { permissions, shop, user } = await parent();

    if (!permissions.shopId) {
        redirect(303, '/onboarding');
    }

    if (!shop || !user) {
        redirect(303, '/onboarding');
    }

    // ✅ OPTIMISÉ : Un seul appel pour les métriques de commandes
    const { data: ordersMetrics, error: ordersError } = await locals.supabase.rpc('get_orders_metrics', {
        p_shop_id: shop.id
    });

    if (ordersError) {
        console.error('Error fetching orders metrics:', ordersError);
    }

    // Type assertion pour les métriques
    const metrics = ordersMetrics as any;

    // Get popular active products (top 5 by sales) - Version corrigée
    const { data: popularProducts, error: popularProductsError } = await locals.supabase
        .from('orders')
        .select(`
			product_name,
			total_amount,
			status
		`)
        .eq('shop_id', shop.id)
        .not('product_id', 'is', null)  // Seulement les commandes avec nom de produit
        .eq('status', 'completed');  // Seulement les commandes terminées

    // Debug: Log des gâteaux populaires
    if (popularProductsError) {
    } else {
    }

    // Process popular products data - Version corrigée
    const productSales = new Map();
    popularProducts?.forEach(item => {
        if (item.product_name) {
            const productName = item.product_name;
            const current = productSales.get(productName) || {
                product: { name: productName },
                totalQuantity: 0,
                totalRevenue: 0
            };
            current.totalQuantity += 1; // Chaque commande = 1 gâteau
            current.totalRevenue += item.total_amount || 0;
            productSales.set(productName, current);
        }
    });

    // Sort by total quantity and take top 5
    const topProducts = Array.from(productSales.values())
        .sort((a, b) => b.totalQuantity - a.totalQuantity)
        .slice(0, 5);

    // ✅ Tracking: Page view déplacé côté client pour avoir un session_id persistant

    // Récupérer les abonnements pour déterminer le plan actuel
    const { data: allSubscriptions } = await (locals.supabase as any)
        .from('user_products')
        .select('stripe_product_id, subscription_status')
        .eq('profile_id', user.id);

    // Déterminer le plan actuel
    let currentPlan = null;

    if (allSubscriptions && allSubscriptions.length > 0) {
        // Chercher un abonnement actif ou en essai
        const activeSubscription = allSubscriptions.find((sub: any) =>
            sub.subscription_status === 'active' || sub.subscription_status === 'trialing'
        );

        if (activeSubscription) {
            if (activeSubscription.stripe_product_id === STRIPE_PRODUCTS.BASIC) {
                currentPlan = 'starter'; // Basic devient Starter
            } else if (activeSubscription.stripe_product_id === STRIPE_PRODUCTS.PREMIUM) {
                currentPlan = 'premium';
            }
        }
    }

    // Données des plans (alignées avec /subscription)
    const plans = [
        {
            id: 'starter',
            name: 'Starter',
            price: 14.99,
            currency: 'EUR',
            stripePriceId: STRIPE_PRICES.BASIC,
            features: [
                'Tout le plan Gratuit',
                '20 commandes/mois (au lieu de 5)',
                '10 gâteaux maximum (au lieu de 3)',
                'Visibilité améliorée dans l\'annuaire',
                'Support email prioritaire'
            ],
            limitations: [],
            popular: false,
            isFree: false
        },
        {
            id: 'premium',
            name: 'Premium',
            price: 19.99,
            currency: 'EUR',
            stripePriceId: STRIPE_PRICES.PREMIUM,
            features: [
                'Tout le plan Starter',
                'Commandes illimitées',
                'Gâteaux illimités',
                'Visibilité + : mis en avant en haut de liste = plus de commandes',
                'Badge vérifié (gagne la confiance des clients)',
                '💬 Envoi de devis (augmente vos ventes)'
            ],
            limitations: [],
            popular: true,
            isFree: false
        }
    ];

    // Récupérer les abonnements pour vérifier si l'utilisateur a déjà le plan à vie
    let hasLifetimePlan = false;
    if (allSubscriptions && allSubscriptions.length > 0) {
        const lifetimeSubscription = allSubscriptions.find((sub: any) =>
            sub.subscription_status === 'active' &&
            STRIPE_PRODUCTS.LIFETIME &&
            sub.stripe_product_id === STRIPE_PRODUCTS.LIFETIME
        );
        hasLifetimePlan = !!lifetimeSubscription;
    }

    return {
        user,
        shop,
        permissions,
        plans,
        currentPlan,
        hasLifetimePlan,
        metrics: {
            productsCount: permissions.productCount || 0,
            recentOrders: metrics?.recent_orders || [],
            ordersCount: {
                weekly: metrics?.weekly_count || 0,
                monthly: metrics?.monthly_count || 0,
                threeMonths: metrics?.three_months_count || 0,
                yearly: metrics?.yearly_count || 0
            },
            revenue: {
                weekly: metrics?.weekly_revenue || 0,
                monthly: metrics?.monthly_revenue || 0,
                threeMonths: metrics?.three_months_revenue || 0,
                yearly: metrics?.yearly_revenue || 0
            },
            deposit: {
                weekly: metrics?.weekly_deposit || 0,
                monthly: metrics?.monthly_deposit || 0,
                threeMonths: metrics?.three_months_deposit || 0,
                yearly: metrics?.yearly_deposit || 0
            },
            popularProducts: topProducts
        }
    };
};

export const actions: Actions = {
    // Actions disponibles pour le dashboard
}; 