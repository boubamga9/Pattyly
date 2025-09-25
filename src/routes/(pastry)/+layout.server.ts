import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({
	locals: { safeGetSession, supabase },
}) => {
	const { session, user } = await safeGetSession();
	if (!session || !user) {
		redirect(303, '/login');
	}

	// ✅ OPTIMISÉ : Un seul appel DB pour toutes les données
	const { data: dashboardData, error } = await supabase.rpc('get_dashboard_data', {
		p_profile_id: user.id
	});

	if (error) {
		console.error('Error fetching dashboard data:', error);
		redirect(303, '/onboarding');
	}

	const { shop, permissions, subscription } = dashboardData;

	// Si l'utilisateur est vérifié mais n'a pas de boutique, rediriger vers l'onboarding
	if (!shop || !shop.id) {
		redirect(303, '/onboarding');
	}

	// Détecter si l'utilisateur a un abonnement inactif (pour afficher l'alerte)
	const hasInactiveSubscription = subscription?.status !== 'active';
	const isSubscriptionExists = !!subscription;

	return {
		user,
		shop,
		permissions,
		hasInactiveSubscription,
		isSubscriptionExists
	};
};
