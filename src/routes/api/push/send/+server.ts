/**
 * Étape 6 : Endpoint pour envoyer une notification
 * Suivant le guide pédagogique
 */
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import webpush from 'web-push';
import { env } from '$env/dynamic/private';

// Configurer VAPID (une seule fois au chargement)
// Note: PUBLIC_VAPID_PUBLIC_KEY est accessible via env car c'est une variable publique
// VAPID_PRIVATE_KEY est une variable privée
const vapidPublicKey = env.PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
	webpush.setVapidDetails('mailto:contact@pattyly.com', vapidPublicKey, vapidPrivateKey);
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { subscription, title, body } = await request.json();

		if (!subscription || !title || !body) {
			return error(400, 'Données manquantes (subscription, title, body requis)');
		}

		if (!vapidPublicKey || !vapidPrivateKey) {
			return error(500, 'Configuration VAPID manquante');
		}

		await webpush.sendNotification(subscription, JSON.stringify({ title, body }));

		return json({ success: true });
	} catch (err) {
		console.error('Erreur lors de l\'envoi de la notification:', err);
		return error(500, 'Erreur lors de l\'envoi');
	}
};
