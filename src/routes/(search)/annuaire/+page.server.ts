import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	// Redirection 301 permanente pour préserver le SEO
	const searchParams = url.searchParams.toString();
	const newUrl = `/patissiers${searchParams ? `?${searchParams}` : ''}`;
	throw redirect(301, newUrl);
};
