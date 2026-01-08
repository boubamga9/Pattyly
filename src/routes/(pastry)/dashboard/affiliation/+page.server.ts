import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { PUBLIC_SITE_URL } from '$env/static/public';
import { STRIPE_PRODUCTS } from '$lib/config/server';
import { EmailService } from '$lib/services/email-service';

export const load: PageServerLoad = async ({ locals }) => {
	const { session, user } = await locals.safeGetSession();
	if (!session || !user) {
		throw error(401, 'Non autorisé');
	}

	const userId = user.id;

	// Récupérer le slug de la boutique
	const { data: shop } = await locals.supabase
		.from('shops')
		.select('slug, name')
		.eq('profile_id', userId)
		.single();

	if (!shop) {
		throw error(404, 'Boutique non trouvée');
	}

	// Statistiques des personnes parrainées
	const { data: affiliations, error: affiliationsError } = await (locals.supabaseServiceRole as any)
		.from('affiliations')
		.select('*')
		.eq('referrer_profile_id', userId)
		.order('created_at', { ascending: false });

	if (affiliationsError) {
		console.error('Error fetching affiliations:', affiliationsError);
	}

	// Récupérer les boutiques des personnes parrainées séparément
	const referredProfileIds = affiliations?.map((a: any) => a.referred_profile_id) || [];
	const { data: shops, error: shopsError } = await locals.supabaseServiceRole
		.from('shops')
		.select('profile_id, name, slug')
		.in('profile_id', referredProfileIds);

	if (shopsError) {
		console.error('Error fetching shops:', shopsError);
	}

	// Créer un map pour accéder facilement aux boutiques
	const shopsMap = new Map(shops?.map((s: any) => [s.profile_id, s]) || []);

	// Enrichir les affiliations avec les données des boutiques
	const affiliationsWithShops = affiliations?.map((aff: any) => ({
		...aff,
		referred: {
			id: aff.referred_profile_id,
			shops: shopsMap.get(aff.referred_profile_id) || null
		}
	})) || [];

	// Compter les inscrits et les abonnés
	const totalInscrits = affiliationsWithShops?.length || 0;

	// Récupérer les abonnements des personnes parrainées pour calculer le revenu estimé et le statut
	let revenuEstimeMois = 0;
	const affiliationsWithSubscription: any[] = [];

	// Récupérer les abonnements de toutes les personnes parrainées en une seule requête
	const referredProfileIdsForSubscriptions = affiliationsWithShops?.map((a: any) => a.referred_profile_id) || [];
	const { data: subscriptions } = await locals.supabaseServiceRole
		.from('user_products')
		.select('profile_id, stripe_product_id, subscription_status')
		.in('profile_id', referredProfileIdsForSubscriptions);

	// Créer un map pour accéder facilement aux abonnements
	const subscriptionsMap = new Map(subscriptions?.map((s: any) => [s.profile_id, s]) || []);

	// Récupérer les commissions payées par personne parrainée pour calculer le montant total gagné
	const { data: commissionsByReferred } = await (locals.supabaseServiceRole as any)
		.from('affiliate_commissions')
		.select('referred_profile_id, commission_amount, status')
		.eq('referrer_profile_id', userId)
		.eq('status', 'paid');

	// Créer un map pour calculer le total gagné par personne parrainée
	const commissionsByReferredMap = new Map<string, number>();
	if (commissionsByReferred) {
		for (const comm of commissionsByReferred) {
			const currentTotal = commissionsByReferredMap.get(comm.referred_profile_id) || 0;
			commissionsByReferredMap.set(
				comm.referred_profile_id,
				currentTotal + parseFloat(comm.commission_amount.toString())
			);
		}
	}

	for (let index = 0; index < affiliationsWithShops.length; index++) {
		const aff = affiliationsWithShops[index];
		// Récupérer l'abonnement de la personne parrainée (peut être null, active, ou inactive)
		const subscription = subscriptionsMap.get(aff.referred_profile_id);

		let subscriptionType = null;
		let montantMensuel = 0;
		let subscriptionStatus: 'active' | 'inactive' | null = null;

		if (subscription) {
			subscriptionStatus = subscription.subscription_status as 'active' | 'inactive';

			if (subscription.stripe_product_id) {
				// Déterminer le type d'abonnement et le prix
				if (subscription.stripe_product_id === STRIPE_PRODUCTS.BASIC) {
					subscriptionType = 'Starter';
					montantMensuel = 14.99;
				} else if (subscription.stripe_product_id === STRIPE_PRODUCTS.PREMIUM) {
					subscriptionType = 'Premium';
					montantMensuel = 19.99; // ✅ Prix actuel du Premium
				} else if (subscription.stripe_product_id === STRIPE_PRODUCTS.LIFETIME) {
					subscriptionType = 'Plan à vie';
					montantMensuel = 0; // Pas de commission sur le plan à vie
				}

				// Calculer le revenu estimé seulement pour les affiliations actives et les abonnements actifs
				if (aff.status === 'active' && subscriptionStatus === 'active' && montantMensuel > 0) {
					// Utiliser le même calcul et arrondissement que dans processAffiliateCommission
					const commission = montantMensuel * (aff.commission_rate / 100);
					// Arrondir à 2 décimales pour éviter les problèmes de précision flottante
					revenuEstimeMois += Math.round(commission * 100) / 100;
				}
			}
		}

		// Calculer le nombre de mois calendaires depuis la date d'abonnement
		let nombreMois = 0;
		if (aff.subscription_started_at) {
			// Compter les mois calendaires depuis subscription_started_at
			const startDate = new Date(aff.subscription_started_at);
			const now = new Date();

			// Vérifier que la date est valide
			if (!isNaN(startDate.getTime())) {
				// Calculer la différence en années et mois
				const yearsDiff = now.getFullYear() - startDate.getFullYear();
				const monthsDiff = now.getMonth() - startDate.getMonth();

				// Le nombre total de mois = (années * 12) + mois
				// On compte toujours au minimum 1 mois si l'abonnement a commencé
				nombreMois = Math.max(1, (yearsDiff * 12) + monthsDiff + 1); // +1 pour inclure le mois en cours, minimum 1
			}
		} else if (aff.status === 'pending') {
			// Si en attente d'abonnement, pas de mois encore
			nombreMois = 0;
		} else {
			// Si pas de subscription_started_at mais affiliation existe, on ne compte pas de mois
			nombreMois = 0;
		}

		// Récupérer le montant total gagné pour cette personne parrainée
		const montantTotalGagne = commissionsByReferredMap.get(aff.referred_profile_id) || 0;

		affiliationsWithSubscription.push({
			...aff,
			index: index + 1, // ✅ ID séquentiel (1, 2, 3, ...)
			subscriptionType,
			montantMensuel,
			subscriptionStatus, // ✅ Statut de l'abonnement (active, inactive, ou null)
			nombreMois, // ✅ Nombre de mois depuis le début
			montantTotalGagne: Math.round(montantTotalGagne * 100) / 100 // ✅ Montant total gagné (arrondi à 2 décimales)
		});
	}

	// Récupérer les paiements depuis la table affiliate_payouts
	const { data: payouts, error: payoutsError } = await (locals.supabaseServiceRole as any)
		.from('affiliate_payouts')
		.select('*')
		.eq('referrer_profile_id', userId)
		.order('paid_at', { ascending: false });

	if (payoutsError) {
		console.error('Error fetching payouts:', payoutsError);
	}

	// Calculer le total des commissions payées (somme des paiements)
	const totalCommissions = payouts?.reduce((sum: number, p: any) => {
		return sum + parseFloat(p.amount.toString());
	}, 0) || 0;

	// Vérifier si le compte Stripe Connect est configuré
	// Pour l'affiliation, on ne vérifie PAS use_for_orders (peut être activé uniquement pour l'affiliation)
	const { data: stripeConnect } = await (locals.supabase as any)
		.from('stripe_connect_accounts')
		.select('is_active, charges_enabled, payouts_enabled, use_for_orders')
		.eq('profile_id', userId)
		.single();

	const hasStripeConnect = stripeConnect?.is_active &&
		stripeConnect?.charges_enabled &&
		stripeConnect?.payouts_enabled;

	// Récupérer le code d'affiliation du profil et is_stripe_free
	const { data: profile } = await (locals.supabaseServiceRole as any)
		.from('profiles')
		.select('affiliate_code, is_stripe_free')
		.eq('id', userId)
		.single();

	const affiliateCode = (profile as any)?.affiliate_code || null;
	const isAmbassador = (profile as any)?.is_stripe_free === true;

	// Compter les abonnés (affiliations actives avec abonnement actif)
	const totalAbonnes = affiliationsWithSubscription.filter(
		(a: any) => a.status === 'active' && a.subscriptionStatus === 'active'
	).length;

	return {
		shop,
		affiliateCode,
		affiliateLink: affiliateCode ? `${PUBLIC_SITE_URL}?ref=${affiliateCode}` : null,
		hasStripeConnect: !!hasStripeConnect,
		isAmbassador, // ✅ Ajouter isAmbassador pour le texte dynamique
		stats: {
			totalInscrits,
			totalAbonnes,
			// Arrondir à 2 décimales pour éviter les problèmes de précision flottante
			revenuEstimeMois: Math.round(revenuEstimeMois * 100) / 100,
			totalCommissions: Math.round(totalCommissions * 100) / 100
		},
		affiliations: affiliationsWithSubscription,
		payments: payouts || []
	};
};

export const actions: Actions = {
	generateAffiliateCode: async ({ locals }) => {
		const { session, user } = await locals.safeGetSession();
		if (!session || !user) {
			return { error: 'Non autorisé' };
		}

		const userId = user.id;

		// Vérifier que Stripe Connect est configuré
		const { data: stripeConnect } = await (locals.supabase as any)
			.from('stripe_connect_accounts')
			.select('is_active, charges_enabled, payouts_enabled')
			.eq('profile_id', userId)
			.single();

		const hasStripeConnect = stripeConnect?.is_active &&
			stripeConnect?.charges_enabled &&
			stripeConnect?.payouts_enabled;

		if (!hasStripeConnect) {
			return { error: 'Stripe Connect doit être configuré' };
		}

		// Vérifier si un code existe déjà
		const { data: existingProfile } = await (locals.supabaseServiceRole as any)
			.from('profiles')
			.select('affiliate_code')
			.eq('id', userId)
			.single();

		if ((existingProfile as any)?.affiliate_code) {
			return { error: 'Un code d\'affiliation existe déjà' };
		}

		// Générer le code via la fonction RPC
		const { data: newCode, error: generateError } = await (locals.supabaseServiceRole as any)
			.rpc('generate_affiliate_code');

		if (generateError) {
			console.error('Erreur génération code:', generateError);
			return { error: 'Erreur lors de la génération du code' };
		}

		// Mettre à jour le profil avec le code
		const { error: updateError } = await (locals.supabaseServiceRole as any)
			.from('profiles')
			.update({ affiliate_code: newCode })
			.eq('id', userId);

		if (updateError) {
			console.error('Erreur mise à jour code:', updateError);
			return { error: 'Erreur lors de l\'enregistrement du code' };
		}

		// Récupérer les infos de la boutique pour l'email
		const { data: shop } = await locals.supabase
			.from('shops')
			.select('name, slug, instagram, tiktok')
			.eq('profile_id', userId)
			.single();

		// Envoyer l'email de notification
		try {
			await EmailService.sendAffiliateActivationNotification({
				shopName: shop?.name || 'Non configuré',
				shopSlug: shop?.slug || '',
				shopInstagram: shop?.instagram || null,
				shopTiktok: shop?.tiktok || null,
				shopUrl: `${PUBLIC_SITE_URL}/${shop?.slug || ''}`,
				affiliateCode: newCode
			});
		} catch (emailError) {
			console.error('Erreur envoi email notification:', emailError);
			// Ne pas faire échouer l'action si l'email échoue
		}

		return { success: true, affiliateCode: newCode as string };
	}
};

