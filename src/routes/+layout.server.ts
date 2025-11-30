import type { LayoutServerLoad } from './$types';
import { PUBLIC_SITE_URL } from '$env/static/public';

export const load: LayoutServerLoad = async ({
	locals: { safeGetSession },
}) => {
	const { session, user } = await safeGetSession();

	// Vérifier si on est sur le domaine test
	const isTestDomain = PUBLIC_SITE_URL === 'https://test.pattyly.com';

	return {
		session,
		user,
		isTestDomain,
	};
};
