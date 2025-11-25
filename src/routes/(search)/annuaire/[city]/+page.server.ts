import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { MAJOR_CITIES } from '$lib/services/city-autocomplete';
import { STRIPE_PRODUCTS } from '$lib/config/server';

// Mapping des villes vers leurs slugs URL
const cityToSlug: Record<string, string> = {
	'Paris': 'paris',
	'Lyon': 'lyon',
	'Marseille': 'marseille',
	'Toulouse': 'toulouse',
	'Nice': 'nice',
	'Nantes': 'nantes',
	'Strasbourg': 'strasbourg',
	'Montpellier': 'montpellier',
	'Bordeaux': 'bordeaux',
	'Lille': 'lille',
	'Rennes': 'rennes',
	'Reims': 'reims',
	'Grenoble': 'grenoble',
	'Dijon': 'dijon',
	'Angers': 'angers',
	'Le Havre': 'le-havre',
	'Toulon': 'toulon',
	'Nancy': 'nancy',
	'Rouen': 'rouen',
	'Amiens': 'amiens',
	'Caen': 'caen',
};

const slugToCity: Record<string, string> = Object.fromEntries(
	Object.entries(cityToSlug).map(([city, slug]) => [slug, city])
);

export const load: PageServerLoad = async ({ params, locals }) => {
	const citySlug = params.city?.toLowerCase() || '';
	const cityName = slugToCity[citySlug];

	// Vérifier que la ville est valide
	if (!cityName || !MAJOR_CITIES.includes(cityName as any)) {
		throw error(404, 'Ville non trouvée');
	}

	// Charger les pâtissiers depuis la base de données
	// Filtrer par directory_city (grande ville) et directory_enabled = true
	console.log('📋 [Directory] Loading shops for city:', cityName);
	const { data: shops, error: shopsError } = await locals.supabase
		.from('shops')
		.select('id, name, slug, logo_url, directory_city, directory_actual_city, directory_postal_code, directory_cake_types, profile_id')
		.eq('directory_city', cityName)
		.eq('directory_enabled', true);
	
	console.log('📋 [Directory] Shops found:', shops?.length || 0, shops);

	if (shopsError) {
		console.error('❌ [Directory] Error loading shops:', shopsError);
		// Ne pas faire échouer la page, juste retourner une liste vide
		return {
			city: citySlug,
			cityName,
			shops: []
		};
	}

	// S'assurer que shops est toujours un tableau
	const shopsArray = Array.isArray(shops) ? shops : [];

	// Récupérer tous les profile_ids des shops
	const profileIds = shopsArray.map(shop => shop.profile_id).filter(Boolean);
	
	// Récupérer les plans premium pour tous les profiles en une seule requête
	const premiumProfileIds = new Set<string>();
	if (profileIds.length > 0) {
		const { data: userProducts } = await locals.supabase
			.from('user_products')
			.select('profile_id, stripe_product_id')
			.in('profile_id', profileIds)
			.eq('subscription_status', 'active')
			.eq('stripe_product_id', STRIPE_PRODUCTS.PREMIUM);
		
		if (userProducts) {
			userProducts.forEach(up => premiumProfileIds.add(up.profile_id));
		}
	}

	// Marquer les shops premium et trier
	const shopsWithPremium = shopsArray.map(shop => ({
		...shop,
		isPremium: shop.profile_id ? premiumProfileIds.has(shop.profile_id) : false
	}));

	// Trier : premium en premier, puis par nom
	shopsWithPremium.sort((a, b) => {
		if (a.isPremium && !b.isPremium) return -1;
		if (!a.isPremium && b.isPremium) return 1;
		return a.name.localeCompare(b.name);
	});

	// Transformer les données pour correspondre au format attendu par le frontend
	const cakeDesigners = shopsWithPremium.map((shop) => ({
		id: shop.id,
		name: shop.name,
		slug: shop.slug,
		city: shop.directory_actual_city || shop.directory_city || cityName, // Afficher la ville exacte, fallback sur grande ville
		postalCode: shop.directory_postal_code || '',
		specialties: (shop.directory_cake_types || []) as string[],
		logo: shop.logo_url || '/images/logo_icone.svg',
		isPremium: shop.isPremium
	}));

	return {
		city: citySlug,
		cityName,
		shops: cakeDesigners
	};
};
