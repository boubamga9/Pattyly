import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	// Redirection 301 permanente pour préserver le SEO
	const searchParams = url.searchParams.toString();
	const newUrl = `/patissiers/${params.city}${searchParams ? `?${searchParams}` : ''}`;
	throw redirect(301, newUrl);
};
