import { redirect } from '@sveltejs/kit';

export const GET = async (event) => {
	const {
		url,
		locals: { supabase },
	} = event;
	const code = url.searchParams.get('code') as string;
	const next = url.searchParams.get('next') ?? '/';

	if (code) {
		const { error } = await supabase.auth.exchangeCodeForSession(code);
		if (error) {
			console.error(error);
			throw redirect(303, '/auth/auth-code-error');
		}
	}

	const search = new URLSearchParams(url.search);
	search.delete('code');
	search.delete('next');

	// Construire l'URL complète en sortant du groupe /auth/
	const redirectUrl = next.startsWith('/') ? next : `/${next}`;
	throw redirect(303, `${redirectUrl}?${search.toString()}`);
};
