import { redirect } from '@sveltejs/kit';

export const GET = async (event) => {
	const {
		url,
		locals: { supabase },
	} = event;

	const code = url.searchParams.get('code');
	const next = url.searchParams.get('next') ?? '/';

	if (code) {
		const { error } = await supabase.auth.exchangeCodeForSession(code);
		if (error) {
			throw redirect(303, '/auth/auth-code-error');
		}
	}

	// Nettoyer les paramètres
	const search = new URLSearchParams(url.search);
	search.delete('code');
	search.delete('next');

	// Vérifier et sécuriser `next`
	let redirectUrl = '/';
	if (next.startsWith('/')) {
		redirectUrl = next;
	} else {
		// éviter les redirections vers des URL externes ou invalides
		redirectUrl = `/${next.replace(/^\/+/, '')}`;
	}

	const finalUrl = search.toString()
		? `${redirectUrl}?${search.toString()}`
		: redirectUrl;

	console.log({ code, next, redirectUrl, finalUrl })

	throw redirect(303, finalUrl);
};
