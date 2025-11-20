import type { RequestHandler } from './$types';

const baseUrl = 'https://pattyly.com';

// Pages marketing publiques
const pages = [
	{
		url: '',
		changefreq: 'weekly',
		priority: 1.0,
	},
	{
		url: '/pricing',
		changefreq: 'monthly',
		priority: 0.9,
	},
	{
		url: '/contact',
		changefreq: 'monthly',
		priority: 0.8,
	},
	{
		url: '/faq',
		changefreq: 'monthly',
		priority: 0.8,
	},
	{
		url: '/about',
		changefreq: 'monthly',
		priority: 0.7,
	},
	{
		url: '/boutique-en-ligne-patissier',
		changefreq: 'monthly',
		priority: 0.8,
	},
	{
		url: '/logiciel-gestion-patisserie',
		changefreq: 'monthly',
		priority: 0.8,
	},
	{
		url: '/formulaire-commande-gateau',
		changefreq: 'monthly',
		priority: 0.8,
	},
	{
		url: '/devis-factures-cake-designer',
		changefreq: 'monthly',
		priority: 0.8,
	},
	{
		url: '/cgu',
		changefreq: 'yearly',
		priority: 0.3,
	},
	{
		url: '/legal',
		changefreq: 'yearly',
		priority: 0.3,
	},
	{
		url: '/privacy',
		changefreq: 'yearly',
		priority: 0.3,
	},
];

export const GET: RequestHandler = async () => {
	const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
	.map(
		(page) => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`,
	)
	.join('\n')}
</urlset>`;

	return new Response(sitemap, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'public, max-age=3600',
		},
	});
};

