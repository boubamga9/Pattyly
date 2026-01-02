import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	// Redirection 301 permanente pour préserver le SEO
	const searchParams = url.searchParams.toString();
	const newUrl = `/patissiers/api${searchParams ? `?${searchParams}` : ''}`;
	throw redirect(301, newUrl);
};
