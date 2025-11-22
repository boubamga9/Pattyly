import type { LayoutServerLoad } from './$types';

export const ssr = true;

export const load: LayoutServerLoad = async ({ locals }) => {
	const { session } = await locals.safeGetSession();
	return {
		user: session?.user || null
	};
};
