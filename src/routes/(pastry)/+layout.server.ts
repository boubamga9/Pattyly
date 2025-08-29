import { redirect } from '@sveltejs/kit';
import { getUserPermissions } from '$lib/permissions';
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
	let hasInactiveSubscription = false;
	const { data: inactiveSubscription } = await supabase
		.from('user_products')
		.select('subscription_status')
		.eq('profile_id', user.id)
		.eq('subscription_status', 'inactive')
		.single();

	hasInactiveSubscription = !!inactiveSubscription;

	return {
		user,
		shop,
		permissions,
		hasInactiveSubscription
	};
};
