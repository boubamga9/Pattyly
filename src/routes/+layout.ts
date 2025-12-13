import {
	PUBLIC_SUPABASE_ANON_KEY,
	PUBLIC_SUPABASE_URL,
} from '$env/static/public';
import {
	createBrowserClient,
	createServerClient,
	isBrowser,
	parse,
} from '@supabase/ssr';
import type { LayoutLoad } from './$types';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface AuthData {
	supabase: ReturnType<typeof createBrowserClient> | ReturnType<typeof createServerClient>;
	session: any;
	user: any;
}

// Removed LoadContext interface - using LayoutLoad parameters directly

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Intercept fetch requests to handle invalid refresh token errors
 * When Supabase tries to refresh a token that doesn't exist, we clean up the session
 */
function createInterceptedFetch(originalFetch: typeof globalThis.fetch): typeof globalThis.fetch {
	return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
		const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

		// Only intercept Supabase auth token refresh requests
		if (url.includes('/auth/v1/token') && init?.method === 'POST') {
			const response = await originalFetch(input, init);

			// Check if it's a 400 error for refresh token
			if (response.status === 400) {
				try {
					const clonedResponse = response.clone();
					const data = await clonedResponse.json();

					// Check if it's the specific "Invalid Refresh Token" error
					if (
						data?.error === 'invalid_grant' ||
						data?.error_description?.includes('Invalid Refresh Token') ||
						data?.error_description?.includes('Refresh Token Not Found')
					) {
						// Clean up invalid session silently
						if (isBrowser()) {
							// Remove all Supabase auth cookies
							const cookies = document.cookie.split(';');
							cookies.forEach((cookie) => {
								const eqPos = cookie.indexOf('=');
								const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();

								// Remove Supabase auth cookies (they start with sb-)
								if (name.startsWith('sb-') && name.includes('auth-token')) {
									document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
									document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
								}
							});

							// Clear localStorage items related to Supabase auth
							try {
								Object.keys(localStorage).forEach((key) => {
									if (key.includes('supabase') && key.includes('auth')) {
										localStorage.removeItem(key);
									}
								});
							} catch (e) {
								// Ignore localStorage errors
							}
						}
					}
				} catch (e) {
					// If we can't parse the response, just return it as-is
				}
			}

			return response;
		}

		// For all other requests, use original fetch
		return originalFetch(input, init);
	};
}

/**
 * Create Supabase client based on environment (browser vs server)
 */
function createSupabaseClient(
	fetch: typeof globalThis.fetch,
	data: { session: any }
): ReturnType<typeof createBrowserClient> | ReturnType<typeof createServerClient> {
	if (isBrowser()) {
		// Use intercepted fetch to handle invalid refresh token errors
		const interceptedFetch = createInterceptedFetch(fetch);

		return createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
			global: {
				fetch: interceptedFetch,
			},
			cookies: {
				get(key) {
					try {
						const cookie = parse(document.cookie);
						return cookie[key];
					} catch (error) {
						return undefined;
					}
				},
			},
		});
	}

	return createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		global: {
			fetch: fetch,
		},
		cookies: {
			get() {
				try {
					return JSON.stringify(data.session);
				} catch (error) {
					return '{}';
				}
			},
		},
	});
}

/**
 * Safely retrieve authentication data with error handling
 */
async function getAuthData(supabase: ReturnType<typeof createBrowserClient> | ReturnType<typeof createServerClient>): Promise<{ session: any; user: any }> {
	try {
		// Get user data first (validated)
		const { data: { user }, error: userError } = await supabase.auth.getUser();

		// Check for invalid refresh token errors
		if (userError) {
			const errorMessage = userError.message?.toLowerCase() || '';
			if (
				errorMessage.includes('invalid refresh token') ||
				errorMessage.includes('refresh token not found') ||
				userError.status === 400
			) {
				// Session is invalid, return null
				return { session: null, user: null };
			}
		}

		if (userError || !user) {
			return { session: null, user: null };
		}

		// Get session data (for tokens)
		const { data: { session }, error: sessionError } = await supabase.auth.getSession();

		// Check for invalid refresh token errors in session
		if (sessionError) {
			const errorMessage = sessionError.message?.toLowerCase() || '';
			if (
				errorMessage.includes('invalid refresh token') ||
				errorMessage.includes('refresh token not found') ||
				sessionError.status === 400
			) {
				// Session is invalid, return null
				return { session: null, user: null };
			}
		}

		if (sessionError) {
			return { session: null, user: null };
		}

		return { session, user };
	} catch (error) {
		// Handle any unexpected errors
		return { session: null, user: null };
	}
}

// ============================================================================
// MAIN LOAD FUNCTION
// ============================================================================

export const load: LayoutLoad = async ({ fetch, data, depends }) => {
	try {
		// Mark dependency for SvelteKit's reactivity system
		depends('supabase:auth');

		// Create appropriate Supabase client
		const supabase = createSupabaseClient(fetch, data);

		// Retrieve authentication data safely
		const { session, user } = await getAuthData(supabase);

		return {
			supabase,
			session,
			user,
		};
	} catch (error) {

		// Return fallback data to prevent app crash
		return {
			supabase: createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
				global: { fetch },
				cookies: { get: () => '{}' }
			}),
			session: null,
			user: null,
		};
	}
};
