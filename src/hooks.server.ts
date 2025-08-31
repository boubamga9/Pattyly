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

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface RateLimitEntry {
	count: number;
	resetTime: number;
}

interface RateLimitConfig {
	max: number;
	window: number;
}

type RateLimitStore = Map<string, RateLimitEntry>;

interface RateLimitResult {
	isLimited: boolean;
	retryAfter?: number;
	message?: string;
}

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const RATE_LIMIT_CONFIG = {
	CLEANUP_INTERVAL: 5 * 60 * 1000, // 5 minutes
	DEFAULT_WINDOW: 3600000, // 1 hour in milliseconds
} as const;

const RATE_LIMITS: Record<string, RateLimitConfig> = {
	'/contact': { max: 3, window: RATE_LIMIT_CONFIG.DEFAULT_WINDOW },
	'/register': { max: 10, window: RATE_LIMIT_CONFIG.DEFAULT_WINDOW },
	'/login': { max: 10, window: RATE_LIMIT_CONFIG.DEFAULT_WINDOW },
	'/forgot-password': { max: 3, window: RATE_LIMIT_CONFIG.DEFAULT_WINDOW },
	'/custom': { max: 15, window: RATE_LIMIT_CONFIG.DEFAULT_WINDOW },
	'/product': { max: 15, window: RATE_LIMIT_CONFIG.DEFAULT_WINDOW }
} as const;

// ============================================================================
// RATE LIMITING CLASS
// ============================================================================

class RateLimiter {
	private store: RateLimitStore = new Map();
	private cleanupInterval!: NodeJS.Timeout;

	constructor() {
		this.startCleanupInterval();
	}

	/**
	 * Check if a client is rate limited for a specific route
	 */
	checkRateLimit(clientIP: string, route: string): RateLimitResult {
		const config = this.findRateLimitConfig(route);
		if (!config) {
			return { isLimited: false };
		}

		const key = `${clientIP}:${route}`;
		const now = Date.now();

		// Clean up expired entries
		this.cleanupExpiredEntries(key, now);

		// Check current rate limit
		const entry = this.store.get(key);
		if (!entry) {
			// First attempt
			this.store.set(key, {
				count: 1,
				resetTime: now + config.window
			});
			return { isLimited: false };
		}

		if (entry.count >= config.max) {
			const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
			const message = this.formatRateLimitMessage(retryAfter);

			return {
				isLimited: true,
				retryAfter,
				message
			};
		}

		// Increment counter
		entry.count++;
		return { isLimited: false };
	}

	/**
	 * Find rate limit configuration for a route
	 */
	private findRateLimitConfig(pathname: string): RateLimitConfig | null {
		for (const [route, config] of Object.entries(RATE_LIMITS)) {
			if (pathname === route || pathname.includes(route)) {
				return config;
			}
		}
		return null;
	}

	/**
	 * Clean up expired entries for a specific key
	 */
	private cleanupExpiredEntries(key: string, now: number): void {
		const entry = this.store.get(key);
		if (entry && now > entry.resetTime) {
			this.store.delete(key);
		}
	}

	/**
	 * Format rate limit message based on remaining time
	 */
	private formatRateLimitMessage(remainingTime: number): string {
		const minutes = Math.floor(remainingTime / 60);
		const seconds = remainingTime % 60;

		if (minutes > 0) {
			return `Trop de tentatives. Veuillez attendre ${minutes}m ${seconds}s avant de réessayer.`;
		}
		return `Trop de tentatives. Veuillez attendre ${seconds}s avant de réessayer.`;
	}

	/**
	 * Start automatic cleanup interval
	 */
	private startCleanupInterval(): void {
		this.cleanupInterval = setInterval(() => {
			this.cleanupAllExpiredEntries();
		}, RATE_LIMIT_CONFIG.CLEANUP_INTERVAL);
	}

	/**
	 * Clean up all expired entries
	 */
	private cleanupAllExpiredEntries(): void {
		const now = Date.now();
		for (const [key, entry] of this.store.entries()) {
			if (now > entry.resetTime) {
				this.store.delete(key);
			}
		}
	}

	/**
	 * Clean up resources
	 */
	destroy(): void {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
		}
	}
}

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

/**
 * Log rate limit events
 */
function logRateLimitEvent(clientIP: string, route: string, result: RateLimitResult): void {
	if (result.isLimited) {
		console.log(`🚫 Rate limit dépassé pour ${clientIP} sur ${route}`, {
			clientIP,
			route,
			retryAfter: result.retryAfter,
			message: result.message
		});
	}
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

// Initialize rate limiter
const rateLimiter = new RateLimiter();

export const handle: Handle = async ({ event, resolve }) => {
	try {
		// Rate limiting for public forms
		if (event.request.method === 'POST') {
			const pathname = event.url.pathname;
			const clientIP = event.getClientAddress();

			const rateLimitResult = rateLimiter.checkRateLimit(clientIP, pathname);

			// Apply headers if rate limited
			applyRateLimitHeaders(event.request, rateLimitResult);

			// Log the event
			logRateLimitEvent(clientIP, pathname, rateLimitResult);
		}

		// Initialize Supabase client
		event.locals.supabase = createServerClient(
			PUBLIC_SUPABASE_URL,
			PUBLIC_SUPABASE_ANON_KEY,
			{
				cookies: {
					get: (key) => event.cookies.get(key),
					set: (key, value, options) => {
						event.cookies.set(key, value, { ...options, path: '/' });
					},
					remove: (key, options) => {
						event.cookies.delete(key, { ...options, path: '/' });
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
					console.error('JWT validation failed:', userError);
					return { session: null, user: null, amr: null };
				}

				// Create clean session object
				const session = Object.assign({}, originalSession, { user });

				// Get MFA authentication methods
				const { data: aal, error: amrError } =
					await event.locals.supabase.auth.mfa.getAuthenticatorAssuranceLevel();

				if (amrError) {
					console.warn('MFA level retrieval failed:', amrError);
					return { session, user, amr: null };
				}

				return { session, user, amr: aal.currentAuthenticationMethods };
			} catch (error) {
				console.error('Error in safeGetSession:', error);
				return { session: null, user: null, amr: null };
			}
		};

		return resolve(event, {
			filterSerializedResponseHeaders(name) {
				return name === 'content-range' || name === 'x-supabase-api-version';
			},
		});
	} catch (error) {
		console.error('Critical error in handle function:', error);

		// Return a basic error response
		return new Response('Internal Server Error', {
			status: 500,
			statusText: 'Internal Server Error'
		});
	}
};

