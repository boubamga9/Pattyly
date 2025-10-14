import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { getUserPermissions } from '$lib/auth';

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
	const trialEnding = (userPermissions as any)?.[0]?.trial_ending || null;
	const hasEverHadSubscription = (userPermissions as any)?.[0]?.has_ever_had_subscription || false;

	// Vérifications de sécurité
	if (!hasShop) {
		redirect(303, '/onboarding');
	}

	if (!hasPaymentMethod) {
		redirect(303, '/onboarding');
	}

	const { data: eligibility } = await (supabase as any).rpc('check_early_adopter_eligibility', {
		p_profile_id: user.id
	});

	const result = eligibility?.[0];

	// Si pas éligible, rediriger vers le dashboard
	if (result?.is_eligible) {
		// Marquer l'offre comme vue si elle ne l'était pas déjà
		if (result?.offer_already_shown) {
			await supabase
				.from('profiles')
				.update({ early_adopter_offer_shown_at: new Date().toISOString() })
				.eq('id', user.id);
		}

		throw redirect(303, '/early-adopter');
	}

	// Récupérer shop details
	const { data: shop } = await supabase
		.from('shops')
		.select('*')
		.eq('profile_id', user.id)
		.single();

	// Récupérer les permissions complètes (plan, limites, etc.)
	const permissions = await getUserPermissions(user.id, supabase);

	// Bannière rouge si needsSubscription (plan === null)
	const hasInactiveSubscription = permissions.needsSubscription;

	// Essai gratuit valide si trial_ending > NOW ET jamais eu d'abonnement
	const isTrialActive = trialEnding && !hasEverHadSubscription && new Date(trialEnding) > new Date();
	const validTrialEnding = isTrialActive ? trialEnding : null;

	return {
		user,
		shop,
		permissions,
		hasInactiveSubscription,
		isSubscriptionExists: hasEverHadSubscription,
		trialEnding: validTrialEnding,
		isTrialActive
	};
};
