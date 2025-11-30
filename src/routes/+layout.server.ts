import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({
	locals: { safeGetSession },
	url,
}) => {
	const { session, user } = await safeGetSession();

	// Détection robuste du domaine test (avec ou sans www, avec ou sans port)
	const isTestDomain = url.hostname === 'test.pattyly.com' ||
		url.hostname.endsWith('.test.pattyly.com') ||
		url.hostname.includes('test.pattyly.com');

	return {
		session,
		user,
		isTestDomain,
	};
};
