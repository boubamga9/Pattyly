import { redirect } from '@sveltejs/kit';
import { getUserPermissions } from '$lib/auth';

export const load = async ({ locals }) => {
    const { session, user } = await locals.safeGetSession();

    if (!session || !user) {
        redirect(303, '/login');
    }

    // Get user permissions and shop info
    const permissions = await getUserPermissions(user.id, locals.supabase);
    const shopId = permissions.shopId;

    if (!shopId) {
        redirect(303, '/onboarding');
    }

    // Get shop info
    const { data: shop } = await locals.supabase
        .from('shops')
        .select('*')
        .eq('id', shopId)
        .single();

    // Get user subscription info for trial detection
    const { data: subscription, error: subscriptionError } = await locals.supabase
        .from('user_products')
        .select('stripe_subscription_id, created_at, subscription_status')
        .eq('profile_id', user.id)
        .single();

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


    // Get active products count
    const { count: productsCount } = await locals.supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('shop_id', shopId)
        .eq('is_active', true);

    // Define time periods for metrics
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    // Get recent orders (last 3) - Version simplifiée pour debug
    const { data: recentOrders, error: recentOrdersError } = await locals.supabase
        .from('orders')
        .select(`
			id,
			created_at,
			total_amount,
			status,
			customer_name,
			customer_email,
			product_name
		`)
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false })
        .limit(3);

    // Get total orders count for each period
    const getOrdersCountForPeriod = async (startDate: Date) => {
        const { count } = await locals.supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('shop_id', shopId)
            .gte('created_at', startDate.toISOString());
        return count || 0;
    };

    // Get orders count for all periods
    const [weeklyOrdersCount, monthlyOrdersCount, threeMonthsOrdersCount, yearlyOrdersCount] = await Promise.all([
        getOrdersCountForPeriod(oneWeekAgo),
        getOrdersCountForPeriod(oneMonthAgo),
        getOrdersCountForPeriod(threeMonthsAgo),
        getOrdersCountForPeriod(oneYearAgo)
    ]);

    // Debug: Log des erreurs et données
    if (recentOrdersError) {
    } else {
    }



    // Helper function to get revenue for a period
    const getRevenueForPeriod = async (startDate: Date) => {
        const { data } = await locals.supabase
            .from('orders')
            .select('total_amount')
            .eq('shop_id', shopId)
            .gte('created_at', startDate.toISOString())
            .eq('status', 'completed');

        return data?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
    };

    // Get revenue for all periods
    const [weeklyRevenue, monthlyRevenue, threeMonthsRevenue, yearlyRevenue] = await Promise.all([
        getRevenueForPeriod(oneWeekAgo),
        getRevenueForPeriod(oneMonthAgo),
        getRevenueForPeriod(threeMonthsAgo),
        getRevenueForPeriod(oneYearAgo)
    ]);

    // Get popular active products (top 5 by sales) - Version corrigée
    const { data: popularProducts, error: popularProductsError } = await locals.supabase
        .from('orders')
        .select(`
			product_name,
			total_amount,
			status
		`)
        .eq('shop_id', shopId)
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
            productsCount: productsCount || 0,
            recentOrders: recentOrders || [],
            ordersCount: {
                weekly: weeklyOrdersCount,
                monthly: monthlyOrdersCount,
                threeMonths: threeMonthsOrdersCount,
                yearly: yearlyOrdersCount
            },
            revenue: {
                weekly: weeklyRevenue,
                monthly: monthlyRevenue,
                threeMonths: threeMonthsRevenue,
                yearly: yearlyRevenue
            },
            popularProducts: topProducts
        }
    };
}; 