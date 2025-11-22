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
		url: '/annuaire',
		changefreq: 'weekly',
		priority: 0.9,
	},
	// Pages annuaire par ville (SEO local)
	{
		url: '/annuaire/paris',
		changefreq: 'weekly',
		priority: 0.9,
	},
	{
		url: '/annuaire/lyon',
		changefreq: 'weekly',
		priority: 0.9,
	},
	{
		url: '/annuaire/marseille',
		changefreq: 'weekly',
		priority: 0.9,
	},
	{
		url: '/annuaire/toulouse',
		changefreq: 'weekly',
		priority: 0.9,
	},
	{
		url: '/annuaire/nice',
		changefreq: 'weekly',
		priority: 0.9,
	},
	{
		url: '/annuaire/nantes',
		changefreq: 'weekly',
		priority: 0.9,
	},
	{
		url: '/annuaire/strasbourg',
		changefreq: 'weekly',
		priority: 0.9,
	},
	{
		url: '/annuaire/montpellier',
		changefreq: 'weekly',
		priority: 0.9,
	},
	{
		url: '/annuaire/bordeaux',
		changefreq: 'weekly',
		priority: 0.9,
	},
	{
		url: '/annuaire/lille',
		changefreq: 'weekly',
		priority: 0.9,
	},
	{
		url: '/annuaire/rennes',
		changefreq: 'weekly',
		priority: 0.9,
	},
	{
		url: '/annuaire/reims',
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
		url: '/annuaire/paris/gateau-anniversaire',
		changefreq: 'weekly',
		priority: 0.7,
	},
	{
		url: '/annuaire/paris/gateau-mariage',
		changefreq: 'weekly',
		priority: 0.7,
	},
	{
		url: '/annuaire/paris/layer-cake',
		changefreq: 'weekly',
		priority: 0.7,
	},
	{
		url: '/annuaire/paris/cupcakes',
		changefreq: 'weekly',
		priority: 0.6,
	},
	{
		url: '/annuaire/paris/gateau-personnalise',
		changefreq: 'weekly',
		priority: 0.6,
	},
	// Lyon
	{
		url: '/annuaire/lyon/gateau-anniversaire',
		changefreq: 'weekly',
		priority: 0.7,
	},
	{
		url: '/annuaire/lyon/gateau-mariage',
		changefreq: 'weekly',
		priority: 0.7,
	},
	{
		url: '/annuaire/lyon/cupcakes',
		changefreq: 'weekly',
		priority: 0.6,
	},
	// Marseille
	{
		url: '/annuaire/marseille/gateau-anniversaire',
		changefreq: 'weekly',
		priority: 0.7,
	},
	{
		url: '/annuaire/marseille/gateau-mariage',
		changefreq: 'weekly',
		priority: 0.7,
	},
	{
		url: '/annuaire/marseille/macarons',
		changefreq: 'weekly',
		priority: 0.6,
	},
	// Toulouse
	{
		url: '/annuaire/toulouse/gateau-mariage',
		changefreq: 'weekly',
		priority: 0.7,
	},
	{
		url: '/annuaire/toulouse/gateau-anniversaire',
		changefreq: 'weekly',
		priority: 0.6,
	},
	// Nice
	{
		url: '/annuaire/nice/gateau-anniversaire',
		changefreq: 'weekly',
		priority: 0.6,
	},
	{
		url: '/annuaire/nice/cupcakes',
		changefreq: 'weekly',
		priority: 0.6,
	},
	// Nantes
	{
		url: '/annuaire/nantes/gateau-anniversaire',
		changefreq: 'weekly',
		priority: 0.6,
	},
	{
		url: '/annuaire/nantes/gateau-mariage',
		changefreq: 'weekly',
		priority: 0.6,
	},
	// Bordeaux
	{
		url: '/annuaire/bordeaux/gateau-mariage',
		changefreq: 'weekly',
		priority: 0.6,
	},
	// Lille
	{
		url: '/annuaire/lille/gateau-anniversaire',
		changefreq: 'weekly',
		priority: 0.6,
	},
	// Montpellier
	{
		url: '/annuaire/montpellier/gateau-anniversaire',
		changefreq: 'weekly',
		priority: 0.6,
	},
	{
		url: '/annuaire/montpellier/gateau-mariage',
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

