import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({
	locals: { safeGetSession },
	url,
}) => {
	const { session, user } = await safeGetSession();

	return {
		session,
		user,
		isTestDomain: url.hostname === 'test.pattyly.com',
	};
};
