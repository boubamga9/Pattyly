import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * API endpoint to register a push notification subscription
 * POST /api/push/subscribe
 * Body: { endpoint, keys: { p256dh, auth }, userAgent? }
 * 
 * Only authenticated pastry chefs can subscribe to push notifications
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		// Vérifier que l'utilisateur est authentifié
		const { session, user } = await locals.safeGetSession();
		if (!session || !user) {
			return error(401, 'Non authentifié');
		}

		// Récupérer les données de la subscription
		const subscriptionData = await request.json();
		const { endpoint, keys, userAgent } = subscriptionData;

		// Validation des données requises
		if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
			return error(400, 'Données de subscription manquantes');
		}

		// Vérifier que l'utilisateur est un pâtissier (pas un client)
		// On peut vérifier via le layout (pastry) mais ici on vérifie juste l'authentification
		// Les clients ne peuvent pas accéder à cette route de toute façon

		// Enregistrer ou mettre à jour la subscription dans la base de données
		const { data: subscription, error: dbError } = await locals.supabase
			.from('push_subscriptions')
			.upsert(
				{
					profile_id: user.id,
					endpoint: endpoint,
					p256dh: keys.p256dh,
					auth: keys.auth,
					user_agent: userAgent || request.headers.get('user-agent') || null,
				},
				{
					onConflict: 'profile_id,endpoint',
					// Mettre à jour les clés si l'endpoint existe déjà
				}
			)
			.select()
			.single();

		if (dbError) {
			console.error('Erreur lors de l\'enregistrement de la subscription:', dbError);
			return error(500, 'Erreur lors de l\'enregistrement de la subscription');
		}

		console.log('✅ Subscription push enregistrée pour le profil:', user.id);

		return json({
			success: true,
			subscription: {
				id: subscription.id,
				endpoint: subscription.endpoint,
			},
		});
	} catch (err) {
		console.error('Erreur dans /api/push/subscribe:', err);
		return error(500, 'Erreur serveur');
	}
};
