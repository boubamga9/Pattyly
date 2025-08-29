// src/hooks.server.ts
import {
	PRIVATE_STRIPE_SECRET_KEY,
	PRIVATE_SUPABASE_SERVICE_ROLE,
} from '$env/static/private';
import {
	PUBLIC_SUPABASE_ANON_KEY,
	PUBLIC_SUPABASE_URL,
} from '$env/static/public';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { Handle } from '@sveltejs/kit';
import Stripe from 'stripe';

// Rate limiting pour les formulaires publics
const RATE_LIMITS = {
	'/contact': { max: 3, window: 3600000 }, // 3 tentatives par heure
	'/register': { max: 5, window: 3600000 }, // 5 tentatives par heure
	'/login': { max: 10, window: 3600000 }, // 10 tentatives par heure
	'/forgot-password': { max: 3, window: 3600000 }, // 3 tentatives par heure
	'/custom': { max: 15, window: 3600000 }, // 15 tentatives par heure (routes dynamiques)
	'/product': { max: 15, window: 3600000 } // 15 tentatives par heure (routes dynamiques)
};

// Store en mémoire pour les tentatives (en production, utiliser Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Nettoyer le store toutes les 5 minutes
setInterval(() => {
	const now = Date.now();
	rateLimitStore.forEach((entry, key) => {
		if (now > entry.resetTime) {
			rateLimitStore.delete(key);
		}
	});
}, 5 * 60 * 1000);

export const handle: Handle = async ({ event, resolve }) => {
	// Rate limiting pour les formulaires publics
	if (event.request.method === 'POST') {
		const pathname = event.url.pathname;
		const clientIP = event.getClientAddress();

		// Vérifier si cette route a des limites de rate
		for (const [route, limit] of Object.entries(RATE_LIMITS)) {
			if (pathname === route || pathname.includes(route)) {
				const key = `${clientIP}:${route}`;
				const now = Date.now();

				// Nettoyer les anciennes entrées
				if (rateLimitStore.has(key)) {
					const entry = rateLimitStore.get(key)!;
					if (now > entry.resetTime) {
						rateLimitStore.delete(key);
					}
				}

				// Vérifier le rate limit
				if (rateLimitStore.has(key)) {
					const entry = rateLimitStore.get(key)!;
					if (entry.count >= limit.max) {
						console.log(`🚫 Rate limit dépassé pour ${clientIP} sur ${route}`);

						// Calculer le temps restant
						const remainingTime = Math.ceil((entry.resetTime - Date.now()) / 1000);
						const minutes = Math.floor(remainingTime / 60);
						const seconds = remainingTime % 60;

						// Pour SvelteKit, on ajoute les infos de rate limiting dans les headers
						// et on laisse la requête continuer vers l'action
						event.request.headers.set('x-rate-limit-exceeded', 'true');
						event.request.headers.set('x-rate-limit-message',
							minutes > 0
								? `Trop de tentatives. Veuillez attendre ${minutes}m ${seconds}s avant de réessayer.`
								: `Trop de tentatives. Veuillez attendre ${seconds}s avant de réessayer.`
						);
						event.request.headers.set('x-rate-limit-retry-after', remainingTime.toString());

						// On ne bloque plus la requête, on la laisse continuer
						console.log(`⚠️ Rate limit atteint mais requête autorisée pour traitement par SvelteKit`);
					}
					entry.count++;
				} else {
					// Première tentative
					rateLimitStore.set(key, {
						count: 1,
						resetTime: now + limit.window
					});
				}
				break; // Une seule route correspond, pas besoin de continuer
			}
		}
	}

	event.locals.supabase = createServerClient(
		PUBLIC_SUPABASE_URL,
		PUBLIC_SUPABASE_ANON_KEY,
		{
			cookies: {
				get: (key) => event.cookies.get(key),
				/**
				 * Note: You have to add the `path` variable to the
				 * set and remove method due to sveltekit's cookie API
				 * requiring this to be set, setting the path to an empty string
				 * will replicate previous/standard behaviour (https://kit.svelte.dev/docs/types#public-types-cookies)
				 */
				set: (key, value, options) => {
					event.cookies.set(key, value, { ...options, path: '/' });
				},
				remove: (key, options) => {
					event.cookies.delete(key, { ...options, path: '/' });
				},
			},
		},
	);

	event.locals.supabaseServiceRole = createClient(
		PUBLIC_SUPABASE_URL,
		PRIVATE_SUPABASE_SERVICE_ROLE,
		{ auth: { persistSession: false } },
	);

	/**
	 * Unlike `supabase.auth.getSession()`, which returns the session _without_
	 * validating the JWT, this function also calls `getUser()` to validate the
	 * JWT before returning the session.
	 */
	event.locals.safeGetSession = async () => {
		const {
			data: { session: originalSession },
		} = await event.locals.supabase.auth.getSession();
		if (!originalSession) {
			return { session: null, user: null, amr: null };
		}

		const {
			data: { user },
			error: userError,
		} = await event.locals.supabase.auth.getUser();
		if (userError) {
			// JWT validation has failed
			return { session: null, user: null, amr: null };
		}

		// TODO: Remove this once the issue is fixed
		// Hack to overcome annoying Supabase auth warnings
		// https://github.com/supabase/auth-js/issues/873#issuecomment-2081467385
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		delete originalSession.user;
		const session = Object.assign({}, originalSession, { user });
		const { data: aal, error: amrError } =
			await await event.locals.supabase.auth.mfa.getAuthenticatorAssuranceLevel();
		if (amrError) {
			return { session, user, amr: null };
		}

		return { session, user, amr: aal.currentAuthenticationMethods };
	};

	event.locals.stripe = new Stripe(PRIVATE_STRIPE_SECRET_KEY, {
		apiVersion: '2024-04-10',
	});

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		},
	});
};
