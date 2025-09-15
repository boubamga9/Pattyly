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

		if (userError || !user) {
			return { session: null, user: null };
		}

		// Get session data (for tokens)
		const { data: { session }, error: sessionError } = await supabase.auth.getSession();

		if (sessionError) {
			return { session: null, user: null };
		}

		return { session, user };
	} catch (error) {
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
