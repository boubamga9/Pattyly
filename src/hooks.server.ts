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
import { RateLimiterRedis, type RateLimitResult } from '$lib/rate-limiting';
import { RATE_LIMITS } from '$lib/rate-limiting/config';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Apply rate limiting headers to the request
 */
function applyRateLimitHeaders(request: Request, result: RateLimitResult): void {
	if (result.isLimited && result.retryAfter !== undefined) {
		request.headers.set('x-rate-limit-exceeded', 'true');
		request.headers.set('x-rate-limit-message', result.message || '');
		request.headers.set('x-rate-limit-retry-after', result.retryAfter.toString());
	}
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

// Initialize Redis rate limiter
const rateLimiter = new RateLimiterRedis();

export const handle: Handle = async ({ event, resolve }) => {
	try {
		// Rate limiting for public forms
		if (event.request.method === 'POST') {
			const pathname = event.url.pathname;
			const clientIP = event.getClientAddress();

			// Find rate limit config for this route
			const config = Object.entries(RATE_LIMITS).find(([route]) =>
				pathname === route || pathname.includes(route)
			)?.[1];

			if (config) {
				const rateLimitResult = await rateLimiter.checkRateLimit(clientIP, pathname, config);

				// Apply headers if rate limited
				applyRateLimitHeaders(event.request, rateLimitResult);
			}
		}

		// Initialize Supabase client
		event.locals.supabase = createServerClient(
			PUBLIC_SUPABASE_URL,
			PUBLIC_SUPABASE_ANON_KEY,
			{
				cookies: {
					get: (key) => event.cookies.get(key),
					set: (key, value, options) => {
						try {
							event.cookies.set(key, value, { ...options, path: '/' });
						} catch (error) {
							// Ignore cookie errors after response is sent
							console.warn('Cookie set failed (response already sent):', key);
						}
					},
					remove: (key, options) => {
						try {
							event.cookies.delete(key, { ...options, path: '/' });
						} catch (error) {
							// Ignore cookie errors after response is sent
							console.warn('Cookie delete failed (response already sent):', key);
						}
					},
				},
			},
		);

		// Initialize Supabase service role client
		event.locals.supabaseServiceRole = createClient(
			PUBLIC_SUPABASE_URL,
			PRIVATE_SUPABASE_SERVICE_ROLE,
			{ auth: { persistSession: false } },
		);

		// Initialize Stripe client
		event.locals.stripe = new Stripe(PRIVATE_STRIPE_SECRET_KEY, {
			apiVersion: '2024-04-10',
		});

		/**
		 * Safe session getter that validates JWT before returning session
		 */
		event.locals.safeGetSession = async () => {
			try {
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
					return { session: null, user: null, amr: null };
				}

				// Create clean session object
				const session = Object.assign({}, originalSession, { user });

				// Get MFA authentication methods
				const { data: aal, error: amrError } =
					await event.locals.supabase.auth.mfa.getAuthenticatorAssuranceLevel();

				if (amrError) {
					return { session, user, amr: null };
				}

				return { session, user, amr: aal.currentAuthenticationMethods };
			} catch (error) {
				return { session: null, user: null, amr: null };
			}
		};

		// Validate session early to clean up invalid tokens before response is generated
		await event.locals.supabase.auth.getSession();

		return resolve(event, {
			filterSerializedResponseHeaders(name) {
				return name === 'content-range' || name === 'x-supabase-api-version';
			},
		});
	} catch (error) {

		// Return a basic error response
		return new Response('Internal Server Error', {
			status: 500,
			statusText: 'Internal Server Error'
		});
	}
};

