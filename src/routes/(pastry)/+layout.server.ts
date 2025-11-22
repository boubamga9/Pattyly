import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { getUserPermissions } from '$lib/auth';
import { checkOrderLimit } from '$lib/utils/order-limits';

export const load: LayoutServerLoad = async ({
	locals: { safeGetSession, supabase },
}) => {
	const { session, user } = await safeGetSession();
	if (!session || !user) {
		redirect(303, '/login');
	}

	// ✅ OPTIMISÉ : Récupérer toutes les infos en un seul appel RPC
	const { data: userPermissions } = await (supabase as any).rpc('get_user_permissions', {
		p_profile_id: user.id
	});

	const hasShop = (userPermissions as any)?.[0]?.has_shop || false;
	const hasPaymentMethod = (userPermissions as any)?.[0]?.has_payment_method || false;
	const hasEverHadSubscription = (userPermissions as any)?.[0]?.has_ever_had_subscription || false;

	// Vérifications de sécurité
	if (!hasShop) {
		redirect(303, '/onboarding');
	}

	if (!hasPaymentMethod) {
		redirect(303, '/onboarding');
	}

	// Récupérer shop details
	const { data: shop } = await supabase
		.from('shops')
		.select('*')
		.eq('profile_id', user.id)
		.single();

	// Récupérer les permissions complètes (plan, limites, etc.)
	const permissions = await getUserPermissions(user.id, supabase);

	// Récupérer les statistiques de commandes pour les alertes
	let orderLimitStats = null;
	if (permissions.shopId) {
		console.log('🔍 [Dashboard Layout] Loading order limit stats for dashboard alerts...');
		orderLimitStats = await checkOrderLimit(permissions.shopId, user.id, supabase);
		console.log('📊 [Dashboard Layout] Order limit stats loaded:', {
			plan: orderLimitStats.plan,
			orderCount: orderLimitStats.orderCount,
			orderLimit: orderLimitStats.orderLimit,
			remaining: orderLimitStats.remaining,
			showWarning: orderLimitStats.remaining <= 2 && !orderLimitStats.isLimitReached,
			showError: orderLimitStats.isLimitReached
		});
	}

	return {
		user,
		shop,
		permissions,
		isSubscriptionExists: hasEverHadSubscription,
		orderLimitStats
	};
};
