import { redirect } from '@sveltejs/kit';
import { getUserPermissions } from '$lib/permissions';

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

    // Get active products count
    const { count: productsCount } = await locals.supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('shop_id', shopId)
        .eq('is_active', true);

    // Get recent orders (last 10)
    const { data: recentOrders } = await locals.supabase
        .from('orders')
        .select(`
			id,
			created_at,
			total_amount,
			status,
			customer_name,
			customer_email,
			products:order_items(
				quantity,
				product:products(name)
			)
		`)
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false })
        .limit(10);

    // Get revenue data for different time periods
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

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

    // Get popular active products (top 5 by sales)
    const { data: popularProducts } = await locals.supabase
        .from('order_items')
        .select(`
			quantity,
			product:products(
				id,
				name,
				price,
				image_url
			)
		`)
        .eq('products.shop_id', shopId)
        .eq('products.is_active', true);

    // Process popular products data
    const productSales = new Map();
    popularProducts?.forEach(item => {
        if (item.product) {
            const productId = item.product.id;
            const current = productSales.get(productId) || {
                product: item.product,
                totalQuantity: 0,
                totalRevenue: 0
            };
            current.totalQuantity += item.quantity || 0;
            current.totalRevenue += (item.quantity || 0) * (item.product.price || 0);
            productSales.set(productId, current);
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
            productsCount: productsCount || 0,
            recentOrders: recentOrders || [],
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