/**
 * Utilitaires pour les notifications push
 * Suivant le guide pédagogique pour PWA + SvelteKit
 */

import { PUBLIC_VAPID_PUBLIC_KEY } from '$env/static/public';

/**
 * Convertit une clé VAPID base64 URL-safe en Uint8Array
 * Version optimisée pour iOS (plus stricte que Chrome)
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
	const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
	const rawData = atob(base64);
	// Utiliser Uint8Array.from() pour plus de robustesse sur iOS
	return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

/**
 * S'abonner aux notifications push
 * Étape 4 du guide : créer une Push Subscription
 * Version optimisée pour iOS (gestion d'erreurs améliorée)
 */
export async function subscribeToPush(): Promise<PushSubscription> {
	if (!PUBLIC_VAPID_PUBLIC_KEY) {
		throw new Error('Clé VAPID publique manquante. Vérifiez PUBLIC_VAPID_PUBLIC_KEY dans .env.local');
	}

	const registration = await navigator.serviceWorker.ready;

	// Convertir la clé VAPID en Uint8Array (obligatoire pour iOS)
	const vapidKey = urlBase64ToUint8Array(PUBLIC_VAPID_PUBLIC_KEY);

	console.log('🔑 Clé VAPID convertie, longueur Uint8Array:', vapidKey.length);

	// Tenter la subscription avec gestion d'erreur explicite
	try {
		const subscription = await registration.pushManager.subscribe({
			userVisibleOnly: true,
			applicationServerKey: vapidKey,
		});

		console.log('✅ Subscription créée avec succès');
		return subscription;
	} catch (error: any) {
		console.error('❌ Erreur lors de la création de la subscription:', error);
		console.error('   - Type:', error?.name);
		console.error('   - Message:', error?.message);

		// Messages d'erreur plus explicites
		if (error?.name === 'NotAllowedError') {
			throw new Error(
				'Permission push refusée. Sur iOS, cela peut être dû à :\n' +
				'1. Le protocole HTTP (nécessite HTTPS)\n' +
				'2. Une clé VAPID invalide\n' +
				'3. Les paramètres système iOS'
			);
		}

		throw error;
	}
}

/**
 * Convertit une PushSubscription en format JSON pour l'envoyer au serveur
 */
export function subscriptionToJSON(subscription: PushSubscription) {
	const key = subscription.getKey('p256dh');
	const auth = subscription.getKey('auth');

	if (!key || !auth) {
		throw new Error('Clés de subscription manquantes');
	}

	return {
		endpoint: subscription.endpoint,
		keys: {
			p256dh: arrayBufferToBase64(key),
			auth: arrayBufferToBase64(auth),
		},
	};
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = '';
	for (let i = 0; i < bytes.byteLength; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}
