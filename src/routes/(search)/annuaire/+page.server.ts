import type { PageServerLoad } from './$types';
import { STRIPE_PRODUCTS } from '$lib/config/server';

export const load: PageServerLoad = async ({ locals, url }) => {
	const cityParam = url.searchParams.get('city') || '';
	const cakeTypeParam = url.searchParams.get('type') || '';

	// Charger tous les pâtissiers qui ont activé leur visibilité dans l'annuaire
	let query = locals.supabase
		.from('shops')
		.select('id, name, slug, logo_url, bio, directory_city, directory_actual_city, directory_postal_code, directory_cake_types, profile_id')
		.eq('directory_enabled', true);

	// Si une ville est spécifiée, filtrer par directory_city
	if (cityParam) {
		// Convertir le slug en nom de ville
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
		};

		const slugToCity: Record<string, string> = Object.fromEntries(
			Object.entries(cityToSlug).map(([city, slug]) => [slug, city])
		);

		const cityName = slugToCity[cityParam.toLowerCase()];
		if (cityName) {
			query = query.eq('directory_city', cityName);
		}
	}

	// Si un type de gâteau est spécifié, filtrer par directory_cake_types
	// Exception : "gateau-evenement" n'applique pas de filtre par type (affiche tous les designers de la ville pour le SEO)
	if (cakeTypeParam && cakeTypeParam.toLowerCase() !== 'gateau-evenement') {
		// Mapping des slugs vers les noms de types de gâteaux
		const cakeTypeSlugToName: Record<string, string> = {
			'gateau-anniversaire': 'Gâteau d\'anniversaire',
			'gateau-mariage': 'Gâteau de mariage',
			'cupcakes': 'Cupcakes',
			'macarons': 'Macarons',
			'gateau-personnalise': 'Gâteau personnalisé',
			'gateau-evenement': 'Gâteau pour événement',
			'gateau-vegan': 'Gâteau vegan',
			'gateau-sans-gluten': 'Gâteau sans gluten',
			'patisserie-orientale': 'Pâtisserie orientale',
			'traiteur-evenementiel': 'Traiteur événementiel',
			'mignardise': 'Mignardise',
		};

		const cakeTypeName = cakeTypeSlugToName[cakeTypeParam.toLowerCase()];
		if (cakeTypeName) {
			query = query.contains('directory_cake_types', [cakeTypeName]);
		}
	}

	const { data: shops, error: shopsError } = await query;

	if (shopsError) {
		console.error('❌ [Directory] Error loading shops:', shopsError);
		// Ne pas faire échouer la page, juste retourner une liste vide
		return {
			shops: []
		};
	}

	// Récupérer tous les profile_ids des shops
	const profileIds = (shops || []).map(shop => shop.profile_id).filter(Boolean);
	
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
	const shopsWithPremium = (shops || []).map(shop => ({
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
		city: shop.directory_city || '', // Grande ville pour le filtrage
		actualCity: shop.directory_actual_city || shop.directory_city || '', // Ville précise pour le placement sur la carte
		postalCode: shop.directory_postal_code || '',
		specialties: (shop.directory_cake_types || []) as string[],
		logo: shop.logo_url || '/images/logo_icone.svg',
		bio: shop.bio || '',
		isPremium: shop.isPremium
	}));

	return {
		shops: cakeDesigners
	};
};

