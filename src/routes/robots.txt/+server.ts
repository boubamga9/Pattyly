import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const hostname = url.hostname;

	// Si c'est le domaine de test, retourner le robots.txt qui bloque tout
	if (hostname === 'test.pattyly.com' || hostname.includes('test.pattyly.com')) {
		const testRobotsTxt = `User-agent: *
Disallow: /
`;

		return new Response(testRobotsTxt, {
			headers: {
				'Content-Type': 'text/plain; charset=utf-8',
				'Cache-Control': 'public, max-age=3600',
			},
		});
	}

	// Pour le domaine de production, retourner le robots.txt normal
	const productionRobotsTxt = `User-agent: *
# Bloquer les pages privées et API
Disallow: /dashboard/
Disallow: /api/
Disallow: /test/
Disallow: /onboarding/
Disallow: /checkout/
Disallow: /subscription/

# Autoriser les pages publiques
Allow: /
Allow: /pricing
Allow: /contact
Allow: /faq
Allow: /about
Allow: /cgu
Allow: /legal
Allow: /privacy

# Sitemap
Sitemap: https://pattyly.com/sitemap.xml
`;

	return new Response(productionRobotsTxt, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': 'public, max-age=3600',
		},
	});
};

