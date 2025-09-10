import { redirect } from '@sveltejs/kit';
import { getUserPermissions } from '$lib/auth';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({
	locals: { safeGetSession, supabase },
}) => {
	const { session, user } = await safeGetSession();
	if (!session || !user) {
		redirect(303, '/login');
	}

	// Get user permissions and shop info
	const permissions = await getUserPermissions(user.id, supabase);
	const shopId = permissions.shopId;

	// Si l'utilisateur est vérifié mais n'a pas de boutique, rediriger vers l'onboarding
	if (!shopId) {
		redirect(303, '/onboarding');
	}

	// Get shop info including logo
	const { data: shop } = await supabase
		.from('shops')
		.select('id, name, logo_url, slug')
		.eq('id', shopId)
		.single();

	// Détecter si l'utilisateur a un abonnement inactif (pour afficher l'alerte)
	let hasInactiveSubscription = true;
	const { data: subscription } = await supabase
		.from('user_products')
		.select('subscription_status')
		.eq('profile_id', user.id)
		//.eq('subscription_status', 'active')
		.single();

	let isSubscriptionExists = !!subscription;

	if (subscription && subscription.subscription_status === 'active') {
		hasInactiveSubscription = false;
	}

	return {
		user,
		shop,
		permissions,
		hasInactiveSubscription,
		isSubscriptionExists
	};
};
