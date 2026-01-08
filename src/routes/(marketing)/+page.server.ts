import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, cookies }) => {
	// ✅ Capturer le ref depuis l'URL et le stocker dans un cookie
	const ref = url.searchParams.get('ref');
	
	if (ref) {
		// Stocker dans un cookie qui expire dans 1 heure
		cookies.set('affiliate_ref', ref, {
			path: '/',
			maxAge: 3600, // 1 heure
			httpOnly: true,
			sameSite: 'lax'
		});
		console.log('✅ [AFFILIATION] Ref capturé et stocké dans cookie:', ref);
	}

	return {};
};


