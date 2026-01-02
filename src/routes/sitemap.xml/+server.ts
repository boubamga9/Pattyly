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
		url: '/trouver-un-cake-designer',
		changefreq: 'weekly',
		priority: 0.9,
	},
	{
		url: '/patissiers',
		changefreq: 'weekly',
		priority: 0.9,
	},
	// Pages patissiers par ville (SEO local)
	{
		url: '/patissiers/paris',
		changefreq: 'weekly',
		priority: 0.9,
	},
	{
		url: '/patissiers/lyon',
		changefreq: 'weekly',
		priority: 0.9,
	},
	{
		url: '/patissiers/marseille',
		changefreq: 'weekly',
		priority: 0.9,
	},
	{
		url: '/patissiers/toulouse',
		changefreq: 'weekly',
		priority: 0.9,
	},
	{
		url: '/patissiers/nice',
		changefreq: 'weekly',
		priority: 0.9,
	},
	{
		url: '/patissiers/nantes',
		changefreq: 'weekly',
		priority: 0.9,
	},
	{
		url: '/patissiers/strasbourg',
		changefreq: 'weekly',
		priority: 0.9,
	},
	{
		url: '/patissiers/montpellier',
		changefreq: 'weekly',
		priority: 0.9,
	},
	{
		url: '/patissiers/bordeaux',
		changefreq: 'weekly',
		priority: 0.9,
	},
	{
		url: '/patissiers/lille',
		changefreq: 'weekly',
		priority: 0.9,
	},
	{
		url: '/patissiers/rennes',
		changefreq: 'weekly',
		priority: 0.9,
	},
	{
		url: '/patissiers/reims',
		changefreq: 'weekly',
		priority: 0.9,
	},
	// Landing pages par type de gâteau
	{
		url: '/gateau-anniversaire',
		changefreq: 'weekly',
		priority: 0.8,
	},
	{
		url: '/gateau-mariage',
		changefreq: 'weekly',
		priority: 0.8,
	},
	{
		url: '/cupcakes',
		changefreq: 'weekly',
		priority: 0.8,
	},
	{
		url: '/macarons',
		changefreq: 'weekly',
		priority: 0.8,
	},
	{
		url: '/gateau-personnalise',
		changefreq: 'weekly',
		priority: 0.8,
	},
	// Pages combinées ville + type (principales combinaisons)
	// Paris
	{
		url: '/patissiers/paris/gateau-anniversaire',
		changefreq: 'weekly',
		priority: 0.7,
	},
	{
		url: '/patissiers/paris/gateau-mariage',
		changefreq: 'weekly',
		priority: 0.7,
	},
	{
		url: '/patissiers/paris/layer-cake',
		changefreq: 'weekly',
		priority: 0.7,
	},
	{
		url: '/patissiers/paris/cupcakes',
		changefreq: 'weekly',
		priority: 0.6,
	},
	{
		url: '/patissiers/paris/gateau-personnalise',
		changefreq: 'weekly',
		priority: 0.6,
	},
	// Lyon
	{
		url: '/patissiers/lyon/gateau-anniversaire',
		changefreq: 'weekly',
		priority: 0.7,
	},
	{
		url: '/patissiers/lyon/gateau-mariage',
		changefreq: 'weekly',
		priority: 0.7,
	},
	{
		url: '/patissiers/lyon/cupcakes',
		changefreq: 'weekly',
		priority: 0.6,
	},
	// Marseille
	{
		url: '/patissiers/marseille/gateau-anniversaire',
		changefreq: 'weekly',
		priority: 0.7,
	},
	{
		url: '/patissiers/marseille/gateau-mariage',
		changefreq: 'weekly',
		priority: 0.7,
	},
	{
		url: '/patissiers/marseille/macarons',
		changefreq: 'weekly',
		priority: 0.6,
	},
	// Toulouse
	{
		url: '/patissiers/toulouse/gateau-mariage',
		changefreq: 'weekly',
		priority: 0.7,
	},
	{
		url: '/patissiers/toulouse/gateau-anniversaire',
		changefreq: 'weekly',
		priority: 0.6,
	},
	// Nice
	{
		url: '/patissiers/nice/gateau-anniversaire',
		changefreq: 'weekly',
		priority: 0.6,
	},
	{
		url: '/patissiers/nice/cupcakes',
		changefreq: 'weekly',
		priority: 0.6,
	},
	// Nantes
	{
		url: '/patissiers/nantes/gateau-anniversaire',
		changefreq: 'weekly',
		priority: 0.6,
	},
	{
		url: '/patissiers/nantes/gateau-mariage',
		changefreq: 'weekly',
		priority: 0.6,
	},
	// Bordeaux
	{
		url: '/patissiers/bordeaux/gateau-mariage',
		changefreq: 'weekly',
		priority: 0.6,
	},
	// Lille
	{
		url: '/patissiers/lille/gateau-anniversaire',
		changefreq: 'weekly',
		priority: 0.6,
	},
	// Montpellier
	{
		url: '/patissiers/montpellier/gateau-anniversaire',
		changefreq: 'weekly',
		priority: 0.6,
	},
	{
		url: '/patissiers/montpellier/gateau-mariage',
		changefreq: 'weekly',
		priority: 0.6,
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

