// src/hooks.server.ts
import {
	PRIVATE_STRIPE_SECRET_KEY,
	PRIVATE_SUPABASE_SERVICE_ROLE,
} from '$env/static/private';
import {
	PUBLIC_SUPABASE_ANON_KEY,
	PUBLIC_SUPABASE_URL,
	PUBLIC_SITE_URL,
} from '$env/static/public';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { Handle } from '@sveltejs/kit';
import Stripe from 'stripe';
import { RateLimiterRedis, type RateLimitResult } from '$lib/rate-limiting';
import { RATE_LIMITS } from '$lib/rate-limiting/config';
import { gzip, brotliCompress } from 'zlib';
import { promisify } from 'util';

// ============================================================================
// COMPRESSION UTILITIES
// ============================================================================

const gzipAsync = promisify(gzip);
const brotliCompressAsync = promisify(brotliCompress);

/**
 * Check if content should be compressed
 */
function shouldCompress(contentType: string | null): boolean {
	if (!contentType) return false;
	
	const compressibleTypes = [
		'text/html',
		'text/css',
		'text/javascript',
		'application/javascript',
		'application/json',
		'application/xml',
		'text/xml',
		'text/plain',
		'application/wasm',
		'application/manifest+json',
		'text/markdown',
		'application/xhtml+xml',
		'application/rss+xml',
		'application/atom+xml',
		'image/svg+xml',
		'font/woff',
		'font/woff2',
		'application/font-woff',
		'application/font-woff2'
	];
	
	return compressibleTypes.some(type => contentType.includes(type));
}

/**
 * Compress response body
 */
async function compressResponse(
	body: string | Uint8Array,
	encoding: 'gzip' | 'br'
): Promise<Uint8Array> {
	const buffer = typeof body === 'string' ? Buffer.from(body, 'utf-8') : Buffer.from(body);
	
	if (encoding === 'br') {
		return await brotliCompressAsync(buffer);
	} else {
		return await gzipAsync(buffer);
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
 * Apply performance and security headers
 */
function applyPerformanceHeaders(response: Response, pathname: string): void {
	// Security headers
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('X-Frame-Options', 'SAMEORIGIN');
	response.headers.set('X-XSS-Protection', '1; mode=block');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	
	// Block indexing for test domain
	if (PUBLIC_SITE_URL === 'https://test.pattyly.com') {
		response.headers.set('X-Robots-Tag', 'noindex, nofollow');
	}
	
	// Performance headers
	response.headers.set('X-DNS-Prefetch-Control', 'on');
	
	// Cache headers for static assets
	if (pathname.startsWith('/_app/') || pathname.match(/\.(js|css|woff|woff2|png|jpg|jpeg|gif|svg|ico|webp)$/)) {
		response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
	} else if (pathname.match(/\.(json|xml)$/)) {
		response.headers.set('Cache-Control', 'public, max-age=3600');
	} else {
		// HTML pages - short cache with revalidation
		response.headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
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

		// Resolve the request
		const response = await resolve(event, {
			filterSerializedResponseHeaders(name) {
				return name === 'content-range' || name === 'x-supabase-api-version';
			},
		});

		// Apply performance headers
		applyPerformanceHeaders(response, event.url.pathname);

		// Compression (only if not already compressed and not on Vercel)
		// Vercel handles compression automatically, so we skip it in production
		const isVercel = process.env.VERCEL === '1';
		const isAlreadyCompressed = response.headers.get('content-encoding');
		
		if (!isVercel && !isAlreadyCompressed) {
			const acceptEncoding = event.request.headers.get('accept-encoding') || '';
			const contentType = response.headers.get('content-type');
			
			// Only compress text-based content
			if (shouldCompress(contentType) && response.body) {
				// Prefer Brotli, fallback to Gzip
				const supportsBrotli = acceptEncoding.includes('br');
				const supportsGzip = acceptEncoding.includes('gzip');
				
				if (supportsBrotli || supportsGzip) {
					try {
						// Clone response to read body
						const clonedResponse = response.clone();
						const bodyText = await clonedResponse.text();
						
						// Skip compression for very small responses (overhead not worth it)
						// Only compress responses larger than 2KB to avoid overhead
						if (bodyText.length > 2048) {
							const encoding = supportsBrotli ? 'br' : 'gzip';
							const compressed = await compressResponse(bodyText, encoding);
							
							// Only compress if we achieve at least 10% reduction
							if (compressed.length < bodyText.length * 0.9) {
								// Create new response with compressed body
								const compressedResponse = new Response(compressed, {
									status: response.status,
									statusText: response.statusText,
									headers: new Headers(response.headers),
								});
								
								compressedResponse.headers.set('Content-Encoding', encoding);
								compressedResponse.headers.set('Content-Length', compressed.length.toString());
								compressedResponse.headers.set('Vary', 'Accept-Encoding');
								
								return compressedResponse;
							}
						}
					} catch (error) {
						// If compression fails, return original response
						console.warn('Compression failed:', error);
					}
				}
			}
		}

		return response;
	} catch (error) {
		console.error('Error in handle:', error);

		// Return a basic error response
		return new Response('Internal Server Error', {
			status: 500,
			statusText: 'Internal Server Error',
			headers: {
				'Content-Type': 'text/plain; charset=utf-8',
				'X-Content-Type-Options': 'nosniff',
			},
		});
	}
};

