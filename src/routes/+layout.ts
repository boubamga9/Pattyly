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

interface LoadContext {
	fetch: typeof globalThis.fetch;
	data: { session: any };
	depends: (key: string) => void;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create Supabase client based on environment (browser vs server)
 */
function createSupabaseClient(context: LoadContext): ReturnType<typeof createBrowserClient> | ReturnType<typeof createServerClient> {
	if (isBrowser()) {
		return createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
			global: {
				fetch: context.fetch,
			},
			cookies: {
				get(key) {
					try {
						const cookie = parse(document.cookie);
						return cookie[key];
					} catch (error) {
						console.warn('Failed to parse browser cookies:', error);
						return undefined;
					}
				},
			},
		});
	}

	return createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		global: {
			fetch: context.fetch,
		},
		cookies: {
			get() {
				try {
					return JSON.stringify(context.data.session);
				} catch (error) {
					console.warn('Failed to stringify server session:', error);
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
		// Get session data
		const { data: { session }, error: sessionError } = await supabase.auth.getSession();

		if (sessionError) {
			console.error('Session retrieval failed:', sessionError);
			return { session: null, user: null };
		}

		// Get user data
		const { data: { user }, error: userError } = await supabase.auth.getUser();

		if (userError) {
			console.error('User retrieval failed:', userError);
			return { session, user: null };
		}

		return { session, user };
	} catch (error) {
		console.error('Critical authentication error:', error);
		return { session: null, user: null };
	}
}

// ============================================================================
// MAIN LOAD FUNCTION
// ============================================================================

export const load: LayoutLoad = async ({ fetch, data, depends }: LoadContext): Promise<AuthData> => {
	try {
		// Mark dependency for SvelteKit's reactivity system
		depends('supabase:auth');

		// Create appropriate Supabase client
		const supabase = createSupabaseClient({ fetch, data, depends });

		// Retrieve authentication data safely
		const { session, user } = await getAuthData(supabase);

		// Log authentication status for debugging
		if (process.env.NODE_ENV === 'development') {
			console.log('🔐 Auth status:', {
				hasSession: !!session,
				hasUser: !!user,
				environment: isBrowser() ? 'browser' : 'server'
			});
		}

		return {
			supabase,
			session,
			user,
		};
	} catch (error) {
		console.error('🚨 Critical error in layout load function:', error);

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
