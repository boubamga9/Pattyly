/**
 * Service pour gérer les notifications push pour les pâtissiers
 * 
 * Ce service permet de :
 * - Demander la permission pour les notifications
 * - S'abonner aux notifications push
 * - Se désabonner des notifications
 * - Vérifier si les notifications sont supportées
 */

interface PushSubscriptionKeys {
	p256dh: string;
	auth: string;
}

interface PushSubscriptionData {
	endpoint: string;
	keys: PushSubscriptionKeys;
}

/**
 * Vérifie si les notifications push sont supportées par le navigateur
 */
export function isPushNotificationSupported(): boolean {
	if (typeof window === 'undefined') return false;

	return (
		'serviceWorker' in navigator &&
		'PushManager' in window &&
		'Notification' in window
	);
}

/**
 * Vérifie si la permission de notification a déjà été accordée
 */
export async function getNotificationPermission(): Promise<NotificationPermission> {
	if (!isPushNotificationSupported()) {
		return 'denied';
	}

	return Notification.permission;
}

/**
 * Demande la permission pour les notifications
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
	if (!isPushNotificationSupported()) {
		throw new Error('Les notifications push ne sont pas supportées par ce navigateur');
	}

	if (Notification.permission === 'granted') {
		return 'granted';
	}

	if (Notification.permission === 'denied') {
		throw new Error('La permission de notification a été refusée. Veuillez l\'activer dans les paramètres du navigateur.');
	}

	// Demander la permission
	const permission = await Notification.requestPermission();

	if (permission !== 'granted') {
		throw new Error('Permission de notification refusée');
	}

	return permission;
}

/**
 * Convertit une PushSubscription en format JSON pour l'envoyer au serveur
 */
function subscriptionToJSON(subscription: PushSubscription): PushSubscriptionData {
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

/**
 * Convertit un ArrayBuffer en base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = '';
	for (let i = 0; i < bytes.byteLength; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

/**
 * S'abonne aux notifications push
 * 
 * @param vapidPublicKey - La clé publique VAPID (doit être dans les variables d'environnement)
 */
export async function subscribeToPushNotifications(
	vapidPublicKey: string
): Promise<PushSubscription> {
	if (!isPushNotificationSupported()) {
		throw new Error('Les notifications push ne sont pas supportées');
	}

	// Vérifier que le service worker est enregistré
	const registration = await navigator.serviceWorker.ready;

	// Vérifier si on a déjà une subscription
	let subscription = await registration.pushManager.getSubscription();

	if (subscription) {
		console.log('✅ Subscription push existante trouvée');
		return subscription;
	}

	// Créer une nouvelle subscription
	try {
		subscription = await registration.pushManager.subscribe({
			userVisibleOnly: true,
			applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
		});

		console.log('✅ Nouvelle subscription push créée');
		return subscription;
	} catch (error) {
		console.error('Erreur lors de la création de la subscription:', error);
		throw error;
	}
}

/**
 * Convertit une clé VAPID base64 URL-safe en Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
	const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
	const rawData = atob(base64);
	const outputArray = new Uint8Array(rawData.length);

	for (let i = 0; i < rawData.length; ++i) {
		outputArray[i] = rawData.charCodeAt(i);
	}

	return outputArray;
}

/**
 * Enregistre la subscription sur le serveur
 */
export async function registerSubscriptionOnServer(
	subscription: PushSubscription
): Promise<void> {
	const subscriptionData = subscriptionToJSON(subscription);

	const response = await fetch('/api/push/subscribe', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			...subscriptionData,
			userAgent: navigator.userAgent,
		}),
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({ message: 'Erreur inconnue' }));
		throw new Error(error.message || 'Erreur lors de l\'enregistrement de la subscription');
	}

	console.log('✅ Subscription enregistrée sur le serveur');
}

/**
 * Se désabonne des notifications push
 */
export async function unsubscribeFromPushNotifications(): Promise<void> {
	if (!isPushNotificationSupported()) {
		return;
	}

	const registration = await navigator.serviceWorker.ready;
	const subscription = await registration.pushManager.getSubscription();

	if (!subscription) {
		console.log('Aucune subscription à supprimer');
		return;
	}

	// Supprimer la subscription du serveur
	try {
		await fetch('/api/push/unsubscribe', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				endpoint: subscription.endpoint,
			}),
		});
	} catch (error) {
		console.error('Erreur lors de la suppression de la subscription sur le serveur:', error);
	}

	// Supprimer la subscription locale
	const success = await subscription.unsubscribe();
	if (success) {
		console.log('✅ Désabonnement réussi');
	} else {
		console.warn('⚠️ Échec du désabonnement');
	}
}

/**
 * Fonction helper pour s'abonner complètement (permission + subscription + enregistrement)
 */
export async function setupPushNotifications(
	vapidPublicKey: string
): Promise<{ success: boolean; error?: string }> {
	try {
		console.log('🔔 [setupPushNotifications] Début...');

		// 1. Vérifier le support
		if (!isPushNotificationSupported()) {
			console.error('❌ [setupPushNotifications] Notifications non supportées');
			return {
				success: false,
				error: 'Les notifications push ne sont pas supportées par votre navigateur',
			};
		}
		console.log('✅ [setupPushNotifications] Support OK');

		// 2. Vérifier le service worker
		if (!('serviceWorker' in navigator)) {
			console.error('❌ [setupPushNotifications] Service Worker non disponible');
			return {
				success: false,
				error: 'Service Worker non disponible',
			};
		}

		// Attendre que le service worker soit prêt
		console.log('⏳ [setupPushNotifications] Attente du service worker...');
		const registration = await navigator.serviceWorker.ready;
		console.log('✅ [setupPushNotifications] Service Worker prêt');

		// 3. Demander la permission
		console.log('🔐 [setupPushNotifications] Demande de permission...');
		await requestNotificationPermission();
		console.log('✅ [setupPushNotifications] Permission accordée');

		// 4. S'abonner
		console.log('📝 [setupPushNotifications] Création de la subscription...');
		const subscription = await subscribeToPushNotifications(vapidPublicKey);
		console.log('✅ [setupPushNotifications] Subscription créée:', subscription.endpoint.substring(0, 50) + '...');

		// 5. Enregistrer sur le serveur
		console.log('💾 [setupPushNotifications] Enregistrement sur le serveur...');
		await registerSubscriptionOnServer(subscription);
		console.log('✅ [setupPushNotifications] Enregistrement réussi');

		return { success: true };
	} catch (error) {
		console.error('❌ [setupPushNotifications] Erreur:', error);
		const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
		console.error('❌ [setupPushNotifications] Message:', errorMessage);
		console.error('❌ [setupPushNotifications] Stack:', error instanceof Error ? error.stack : 'N/A');
		return {
			success: false,
			error: errorMessage,
		};
	}
}
