/**
 * Système de tracking d'événements pour analytics
 */

/**
 * Events prédéfinis pour faciliter le tracking
 */
export const Events = {
	// Acquisition
	PAGE_VIEW: 'page_view',

	// Activation
	SIGNUP: 'signup',
	SHOP_CREATED: 'shop_created',
	PRODUCT_ADDED: 'product_added',

	// Business
	SUBSCRIPTION_STARTED: 'subscription_started',
	SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
	ORDER_RECEIVED: 'order_received',
	PAYMENT_ENABLED: 'payment_enabled'
} as const;

let sessionId: string | null = null;

/**
 * Récupère ou crée un session ID unique
 */
export function getSessionId(): string {
	if (typeof window === 'undefined') {
		// Server-side, générer un ID temporaire
		return crypto.randomUUID();
	}

	if (!sessionId) {
		sessionId = localStorage.getItem('session_id');
		if (!sessionId) {
			sessionId = crypto.randomUUID();
			localStorage.setItem('session_id', sessionId);
		}
	}

	return sessionId;
}

/**
 * Log un événement dans la table events
 * ⚡ PERFORMANCE : Cette fonction est asynchrone mais ne bloque pas l'exécution
 * Utilisez logEvent() sans await pour un fire-and-forget (recommandé)
 * ou avec await si vous avez besoin de confirmer l'enregistrement
 * 
 * ⚠️ IMPORTANT : Pour les page_view, utilisez logPageView() côté client pour avoir un session_id correct
 */
export async function logEvent(
	supabase: any,
	eventName: string,
	metadata: Record<string, any> = {},
	userId: string | null = null,
	page?: string
): Promise<void> {
	try {
		const sessionId = getSessionId();

		const eventData = {
			user_id: userId,
			event_name: eventName,
			metadata: {
				...metadata,
				session_id: sessionId,
				page: page || (typeof window !== 'undefined' ? window.location.pathname : null),
				timestamp: new Date().toISOString()
			}
		};

		const { data, error } = await supabase.from('events').insert(eventData).select();

		if (error) {
			console.error('❌ [Analytics] Error logging event:', eventName, error);
			console.error('❌ [Analytics] Event data:', JSON.stringify(eventData, null, 2));
		} else {
			console.log('✅ [Analytics] Event logged:', eventName, { userId, ...metadata, inserted: data?.[0]?.id });
		}
	} catch (error) {
		// Ne pas bloquer l'application en cas d'erreur de tracking
		console.error('❌ [Analytics] Unexpected error logging event:', eventName, error);
	}
}

/**
 * Détermine le type d'utilisateur basé sur l'URL et localStorage
 */
function getUserTypeFromContext(): 'pastry' | 'client' | 'visitor' {
	if (typeof window === 'undefined') {
		return 'visitor';
	}

	const pathname = window.location.pathname;

	// 1. Détection basée sur l'URL (priorité haute)
	if (pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding')) {
		return 'pastry';
	}

	// 2. Détection basée sur localStorage (popup home page)
	const popupAnswer = localStorage.getItem('pattyly_cake_designer_popup_answered');
	if (popupAnswer === 'createur') {
		return 'pastry';
	}
	if (popupAnswer === 'gourmand') {
		return 'client';
	}

	// 3. Détection basée sur les routes client
	if (
		pathname.match(/^\/[^\/]+$/) || // /slug (boutique)
		pathname.startsWith('/tous-les-gateaux') ||
		pathname.startsWith('/annuaire') ||
		pathname.match(/^\/[^\/]+\/product\/[^\/]+$/) // /slug/product/id
	) {
		return 'client';
	}

	// 4. Par défaut : visitor
	return 'visitor';
}

/**
 * 🎯 Tracking de page_view côté client (pour avoir un session_id persistant)
 * À utiliser dans les composants Svelte avec onMount ou $effect
 * 
 * Si supabase n'est pas fourni, un client sera créé automatiquement
 */
export async function logPageView(
	supabase: any = null,
	metadata: Record<string, any> = {}
): Promise<void> {
	// Vérifier qu'on est côté client
	if (typeof window === 'undefined') {
		console.warn('⚠️ [Analytics] logPageView should only be called client-side');
		return;
	}

	try {
		// Créer un client Supabase si non fourni
		let client = supabase;
		if (!client) {
			const { createBrowserClient } = await import('@supabase/ssr');
			const { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } = await import('$env/static/public');
			client = createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
				global: { fetch },
				cookies: {
					get(key: string) {
						try {
							const cookie = document.cookie.split('; ').find(row => row.startsWith(key + '='));
							return cookie ? cookie.split('=')[1] : undefined;
						} catch {
							return undefined;
						}
					}
				}
			});
		}

		const sessionId = getSessionId(); // Récupère depuis localStorage côté client
		const userType = getUserTypeFromContext(); // Détermine le type d'utilisateur

		const { error } = await client.from('events').insert({
			user_id: null, // Page views sont anonymes
			event_name: Events.PAGE_VIEW,
			metadata: {
				...metadata,
				session_id: sessionId,
				page: window.location.pathname,
				user_type: userType, // ✅ NOUVEAU : Type d'utilisateur (pastry, client, visitor)
				timestamp: new Date().toISOString()
			}
		});

		if (error) {
			console.error('❌ [Analytics] Error logging page_view:', error);
		}
	} catch (error) {
		console.error('❌ [Analytics] Unexpected error logging page_view:', error);
	}
}

/**
 * ⚡ VERSION OPTIMISÉE : Fire-and-forget pour ne pas bloquer les actions critiques
 * Utilisez cette fonction dans les actions (signup, createShop, etc.) pour ne pas ralentir la réponse
 */
export function logEventAsync(
	supabase: any,
	eventName: string,
	metadata: Record<string, any> = {},
	userId: string | null = null,
	page?: string
): void {
	// Fire-and-forget : ne pas attendre le résultat
	logEvent(supabase, eventName, metadata, userId, page).catch(err => {
		// Erreur déjà loggée dans logEvent, juste éviter un warning de Promise non catchée
		console.error('❌ [Analytics] Async tracking failed:', eventName);
	});
}

