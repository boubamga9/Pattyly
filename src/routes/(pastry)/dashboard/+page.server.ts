import { redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
    const { session, user } = await locals.safeGetSession();

    if (!session || !user) {
        redirect(303, '/login');
    }

    // ✅ OPTIMISÉ : Un seul appel DB pour toutes les données de base
    const { data: dashboardData, error } = await locals.supabase.rpc('get_dashboard_data', {
        p_profile_id: user.id
    });

    if (error) {
        console.error('Error fetching dashboard data:', error);
        redirect(303, '/onboarding');
    }

    const { shop, permissions, subscription, paypal_account } = dashboardData;

    if (!shop || !shop.id) {
        redirect(303, '/onboarding');
    }

    // Si l'utilisateur a un compte PayPal mais n'est pas actif, rediriger vers l'onboarding
    if (paypal_account && !paypal_account.is_active) {
        redirect(303, '/onboarding');
    }

    // Check trial status directly from Stripe
    let isTrial = false;
    let daysRemaining = 0;
    let trialEnd = null;

    if (subscription?.stripe_subscription_id) {
        try {
            const stripeSubscription = await locals.stripe.subscriptions.retrieve(subscription.stripe_subscription_id);

            // Check if subscription is in trial period
            isTrial = stripeSubscription.status === 'trialing';

            if (isTrial && stripeSubscription.trial_end) {
                trialEnd = new Date(stripeSubscription.trial_end * 1000); // Stripe timestamps are in seconds
                const now = new Date();
                daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                daysRemaining = Math.max(0, daysRemaining); // Ne pas afficher de nombre négatif
            }
        } catch (stripeError) {
            console.error('❌ Error fetching Stripe subscription:', stripeError);
            // Fallback: assume no trial if Stripe call fails
            isTrial = false;
        }
    }


    // ✅ OPTIMISÉ : Un seul appel pour les métriques de commandes
    const { data: ordersMetrics, error: ordersError } = await locals.supabase.rpc('get_orders_metrics', {
        p_shop_id: shop.id
    });

    if (ordersError) {
        console.error('Error fetching orders metrics:', ordersError);
    }

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

    return {
        user,
        shop,
        permissions,
        trial: {
            isTrial,
            daysRemaining
        },
        metrics: {
            productsCount: permissions.productCount || 0,
            recentOrders: ordersMetrics?.recent_orders || [],
            ordersCount: {
                weekly: ordersMetrics?.weekly_count || 0,
                monthly: ordersMetrics?.monthly_count || 0,
                threeMonths: ordersMetrics?.three_months_count || 0,
                yearly: ordersMetrics?.yearly_count || 0
            },
            revenue: {
                weekly: ordersMetrics?.weekly_revenue || 0,
                monthly: ordersMetrics?.monthly_revenue || 0,
                threeMonths: ordersMetrics?.three_months_revenue || 0,
                yearly: ordersMetrics?.yearly_revenue || 0
            },
            deposit: {
                weekly: ordersMetrics?.weekly_deposit || 0,
                monthly: ordersMetrics?.monthly_deposit || 0,
                threeMonths: ordersMetrics?.three_months_deposit || 0,
                yearly: ordersMetrics?.yearly_deposit || 0
            },
            popularProducts: topProducts
        }
    };
}; 