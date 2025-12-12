/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkOnly, CacheFirst } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

// Precache all assets
precacheAndRoute(self.__WB_MANIFEST);

// Skip waiting and claim clients immediately
self.addEventListener('message', (event) => {
	if (event.data && event.data.type === 'SKIP_WAITING') {
		self.skipWaiting();
	}
});

self.addEventListener('activate', (event) => {
	event.waitUntil(self.clients.claim());
});

// Cache strategy for Cloudinary images (NetworkOnly)
registerRoute(
	({ url }) => url.hostname === 'res.cloudinary.com',
	new NetworkOnly()
);

// Cache strategy for Google Fonts (CacheFirst)
registerRoute(
	({ url }) => url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com',
	new CacheFirst({
		cacheName: 'google-fonts',
		plugins: [
			{
				cacheKeyWillBeUsed: async ({ request }) => {
					return request.url;
				}
			}
		]
	})
);

// ============================================================================
// PUSH NOTIFICATIONS - Étape 2 du guide
// ============================================================================

// Handle incoming push notifications
self.addEventListener('push', (event: PushEvent) => {
	const isDev = import.meta.env?.DEV;
	if (isDev) {
		console.log('🔔 [Service Worker] Push event reçu !', event);
	}

	let data: any = {};
	try {
		if (event.data) {
			// Essayer de parser comme JSON d'abord
			try {
				data = event.data.json();
				if (isDev) {
					console.log('📦 [Service Worker] Données JSON reçues:', data);
				}
			} catch (jsonError) {
				// Si ce n'est pas du JSON, essayer comme texte
				try {
					const text = event.data.text();
					if (isDev) {
						console.log('📝 [Service Worker] Données texte reçues:', text);
					}
					// Essayer de parser comme JSON si possible
					try {
						data = JSON.parse(text);
					} catch {
						// Si ce n'est toujours pas du JSON, créer un payload par défaut
						data = {
							title: 'Notification',
							body: text || 'Nouvelle notification',
						};
					}
				} catch (textError) {
					console.error('❌ [Service Worker] Impossible de lire les données:', textError);
					data = {
						title: 'Notification',
						body: 'Nouvelle notification reçue',
					};
				}
			}
		} else {
			if (isDev) {
				console.warn('⚠️ [Service Worker] Pas de données dans l\'événement push');
			}
			data = {
				title: 'Notification',
				body: 'Nouvelle notification reçue',
			};
		}
	} catch (error) {
		console.error('❌ [Service Worker] Erreur lors du traitement des données:', error);
		data = {
			title: 'Notification',
			body: 'Nouvelle notification reçue',
		};
	}

	const notificationOptions: NotificationOptions = {
		body: data.body ?? '',
		icon: '/icons/icon-192x192.png',
		badge: '/icons/icon-192x192.png',
		data: data.data || {},
		tag: data.tag || 'default',
		requireInteraction: false,
		silent: false,
		// Forcer l'affichage même si l'onglet est actif
		renotify: true,
		// Vibrations pour mobile (si supporté)
		vibrate: [200, 100, 200],
		// Son de notification
		sound: undefined, // Chrome ne supporte pas le son, mais on laisse pour compatibilité
	};

	if (isDev) {
		console.log('📤 [Service Worker] Affichage de la notification:', {
			title: data.title ?? 'Notification',
			...notificationOptions
		});
	}

	event.waitUntil(
		self.registration.showNotification(data.title ?? 'Notification', notificationOptions)
			.then(() => {
				if (isDev) {
					console.log('✅ [Service Worker] Notification affichée avec succès');
				}
			})
			.catch((error) => {
				console.error('❌ [Service Worker] Erreur lors de l\'affichage de la notification:', error);
			})
	);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event: NotificationEvent) => {
	event.notification.close();

	const urlToOpen = event.notification.data?.url || '/dashboard/orders';

	event.waitUntil(self.clients.openWindow(urlToOpen));
});

