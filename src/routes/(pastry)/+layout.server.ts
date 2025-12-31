import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { getUserPermissions } from '$lib/auth';
import { checkOrderLimit } from '$lib/utils/order-limits';
import { STRIPE_PRODUCTS } from '$lib/config/server';

export const load: LayoutServerLoad = async ({
	locals: { safeGetSession, supabase },
}) => {
	const { session, user } = await safeGetSession();
	if (!session || !user) {
		redirect(303, '/login');
	}

	// ✅ OPTIMISÉ : Utiliser get_user_permissions_complete qui regroupe tout en 1 requête
	const { data: permissionsData, error: permissionsError } = await (supabase as any).rpc('get_user_permissions_complete', {
		p_profile_id: user.id,
		p_premium_product_id: STRIPE_PRODUCTS.PREMIUM,
		p_basic_product_id: STRIPE_PRODUCTS.BASIC,
		p_lifetime_product_id: STRIPE_PRODUCTS.LIFETIME
	});

	if (permissionsError) {
		console.error('Error fetching permissions:', permissionsError);
		redirect(303, '/login');
	}

	const hasShop = permissionsData?.has_shop || false;
	const hasPaymentMethod = permissionsData?.has_payment_method || false;
	const hasEverHadSubscription = permissionsData?.has_ever_had_subscription || false;

	// Vérifications de sécurité
	if (!hasShop) {
		redirect(303, '/onboarding');
	}

	if (!hasPaymentMethod) {
		redirect(303, '/onboarding');
	}

	// ✅ OPTIMISÉ : Le shop est maintenant inclus dans le RPC permissions
	const shop = permissionsData?.shop || null;

	// Construire l'objet permissions à partir des données du RPC
	const permissions = {
		shopId: permissionsData?.shopId || null,
		shopSlug: permissionsData?.shopSlug || null,
		plan: (permissionsData?.plan || 'free') as 'free' | 'basic' | 'premium' | 'exempt',
		productCount: permissionsData?.productCount || 0,
		productLimit: permissionsData?.productLimit || 0, // ✅ AJOUT : Limite de produits
		canAddMoreProducts: permissionsData?.canAddMoreProducts || false, // ✅ AJOUT : Peut ajouter plus de produits
		canHandleCustomRequests: permissionsData?.canHandleCustomRequests || false,
		canManageCustomForms: permissionsData?.canManageCustomForms || false,
		isExempt: permissionsData?.isExempt || false
	};

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