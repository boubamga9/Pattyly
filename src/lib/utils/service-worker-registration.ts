/**
 * Utilitaire pour enregistrer le service worker uniquement pour les pâtissiers
 * Vérifie si un service worker est déjà actif avant d'enregistrer
 */

/**
 * Enregistre le service worker si ce n'est pas déjà fait
 * @returns Promise<ServiceWorkerRegistration | null> - La registration ou null si déjà enregistré ou erreur
 */
export async function registerServiceWorkerForPastryChef(): Promise<ServiceWorkerRegistration | null> {
	// Vérifier le support
	if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
		console.warn('⚠️ Service Worker non supporté');
		return null;
	}

	try {
		// 1. Vérifier si un service worker est déjà enregistré
		const existingRegistrations = await navigator.serviceWorker.getRegistrations();

		// Vérifier si un service worker avec le même scope existe déjà
		const existingRegistration = existingRegistrations.find(
			(reg) => reg.scope === window.location.origin + '/'
		);

		if (existingRegistration) {
			// Service worker déjà enregistré
			const isDev = import.meta.env?.DEV;
			if (isDev) {
				console.log('✅ Service Worker déjà enregistré:', existingRegistration.scope);
			}
			return existingRegistration;
		}

		// 2. Aucun service worker trouvé, enregistrer le nouveau
		const isDev = import.meta.env?.DEV;
		if (isDev) {
			console.log('📝 Enregistrement du Service Worker pour pâtissier...');
		}

		const registration = await navigator.serviceWorker.register('/sw.js', {
			scope: '/',
		});

		if (isDev) {
			console.log('✅ Service Worker enregistré avec succès:', registration.scope);
		}

		return registration;
	} catch (error) {
		console.error('❌ Erreur lors de l\'enregistrement du Service Worker:', error);
		return null;
	}
}

/**
 * Désenregistre tous les service workers (utile pour les tests ou le nettoyage)
 */
export async function unregisterAllServiceWorkers(): Promise<void> {
	if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
		return;
	}

	try {
		const registrations = await navigator.serviceWorker.getRegistrations();
		await Promise.all(registrations.map((registration) => registration.unregister()));
		console.log('🗑️ Tous les Service Workers ont été désenregistrés');
	} catch (error) {
		console.error('❌ Erreur lors du désenregistrement des Service Workers:', error);
	}
}
