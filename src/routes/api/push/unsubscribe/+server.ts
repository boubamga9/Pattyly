import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * API endpoint to unsubscribe from push notifications
 * POST /api/push/unsubscribe
 * Body: { endpoint }
 * 
 * Only authenticated pastry chefs can unsubscribe
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		// Vérifier que l'utilisateur est authentifié
		const { session, user } = await locals.safeGetSession();
		if (!session || !user) {
			return error(401, 'Non authentifié');
		}

		const { endpoint } = await request.json();

		if (!endpoint) {
			return error(400, 'Endpoint manquant');
		}

		// Supprimer la subscription
		const { error: deleteError } = await locals.supabase
			.from('push_subscriptions')
			.delete()
			.eq('profile_id', user.id)
			.eq('endpoint', endpoint);

		if (deleteError) {
			console.error('Erreur lors de la suppression de la subscription:', deleteError);
			return error(500, 'Erreur lors de la suppression de la subscription');
		}

		console.log('✅ Subscription push supprimée pour le profil:', user.id);

		return json({
			success: true,
		});
	} catch (err) {
		console.error('Erreur dans /api/push/unsubscribe:', err);
		return error(500, 'Erreur serveur');
	}
};
