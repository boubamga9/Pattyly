import { redirect } from '@sveltejs/kit';
import { getUserPermissions } from '$lib/auth';

export const load = async ({ locals }) => {
    const { session, user } = await locals.safeGetSession();

    if (!session || !user) {
        redirect(303, '/login');
    }

    // ✅ Récupérer les permissions (inclut trial_ending, plan, limites)
    const permissions = await getUserPermissions(user.id, locals.supabase);

    if (!permissions.shopId) {
        redirect(303, '/onboarding');
    }

    // Récupérer les infos de la boutique
    const { data: shop } = await locals.supabase
        .from('shops')
        .select('*')
        .eq('profile_id', user.id)
        .single();

    if (!shop) {
        redirect(303, '/onboarding');
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