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

const validCakeTypes: Record<string, { name: string; keywords: string[]; description: string }> = {
	'gateau-anniversaire': {
		name: 'Gâteau d\'anniversaire',
		keywords: ['anniversaire', 'birthday cake', 'gâteau anniversaire'],
		description: 'Gâteaux d\'anniversaire personnalisés pour tous les âges'
	},
	'gateau-mariage': {
		name: 'Gâteau de mariage',
		keywords: ['mariage', 'wedding cake', 'gâteau mariage', 'layer cake', 'wedding cake france'],
		description: 'Gâteaux de mariage élégants et sur mesure pour votre grand jour'
	},
	'cupcakes': {
		name: 'Cupcakes',
		keywords: ['cupcakes', 'petits gâteaux'],
		description: 'Cupcakes personnalisés pour tous vos événements'
	},
	'macarons': {
		name: 'Macarons',
		keywords: ['macarons', 'macarons personnalisés'],
		description: 'Macarons artisanaux et personnalisés'
	},
	'gateau-personnalise': {
		name: 'Gâteau personnalisé',
		keywords: ['gâteau personnalisé', 'custom cake', 'gâteau sur mesure'],
		description: 'Gâteaux personnalisés selon vos envies'
	},
	'gateau-evenement': {
		name: 'Gâteau pour événement',
		keywords: ['gâteau événement', 'event cake', 'gâteau pour événement'],
		description: 'Gâteaux pour tous types d\'événements'
	},
	'gateau-vegan': {
		name: 'Gâteau vegan',
		keywords: ['gâteau vegan', 'vegan cake', 'pâtisserie vegan'],
		description: 'Gâteaux vegan délicieux et respectueux de l\'environnement'
	},
	'gateau-sans-gluten': {
		name: 'Gâteau sans gluten',
		keywords: ['gâteau sans gluten', 'gluten free cake', 'pâtisserie sans gluten'],
		description: 'Gâteaux sans gluten pour tous les goûts'
	},
	'patisserie-orientale': {
		name: 'Pâtisserie orientale',
		keywords: ['pâtisserie orientale', 'oriental pastry', 'pâtisserie turque', 'pâtisserie libanaise', 'baklava', 'oriental sweets'],
		description: 'Pâtisseries orientales authentiques et délicieuses'
	},
	'traiteur-evenementiel': {
		name: 'Traiteur événementiel',
		keywords: ['traiteur événementiel', 'catering', 'traiteur', 'buffet événement', 'traiteur professionnel'],
		description: 'Services de traiteur pour tous vos événements'
	},
	'mignardise': {
		name: 'Mignardise',
		keywords: ['mignardise', 'petits fours', 'petits gâteaux', 'mignardises', 'petites douceurs'],
		description: 'Mignardises et petits fours raffinés pour vos événements'
	},
};

export const load: PageServerLoad = async ({ params, locals }) => {
	const citySlug = params.city?.toLowerCase() || '';
	const cakeTypeSlug = params.cakeType?.toLowerCase() || '';
	const cityName = slugToCity[citySlug];
	const cakeTypeName = cakeTypeSlugToName[cakeTypeSlug];

	// Vérifier que la ville est valide
	if (!cityName || !MAJOR_CITIES.includes(cityName as any)) {
		throw error(404, 'Ville non trouvée');
	}

	// Vérifier que le type de gâteau est valide
	if (!validCakeTypes[cakeTypeSlug] || !cakeTypeName) {
		throw error(404, 'Type de gâteau non trouvé');
	}

	const cakeTypeInfo = validCakeTypes[cakeTypeSlug];

	// Charger les pâtissiers depuis la base de données
	// Filtrer par directory_city (grande ville) et directory_enabled = true
	// Pour "gateau-evenement", on affiche tous les designers de la ville (pas de filtre par type) pour le SEO
	let query = locals.supabase
		.from('shops')
		.select('id, name, slug, logo_url, directory_city, directory_actual_city, directory_postal_code, directory_cake_types, profile_id')
		.eq('directory_city', cityName)
		.eq('directory_enabled', true);

	// Appliquer le filtre par type de gâteau seulement si ce n'est pas "gateau-evenement"
	if (cakeTypeSlug !== 'gateau-evenement') {
		query = query.contains('directory_cake_types', [cakeTypeName]);
	}

	const { data: shops, error: shopsError } = await query;

	if (shopsError) {
		console.error('❌ [Directory] Error loading shops:', shopsError);
		// Ne pas faire échouer la page, juste retourner une liste vide
		return {
			city: citySlug,
			cityName,
			cakeType: cakeTypeSlug,
			cakeTypeName,
			cakeTypeInfo,
			shops: []
		};
	}

	// Récupérer tous les profile_ids des shops
	const profileIds = (shops || []).map(shop => shop.profile_id).filter(Boolean);
	
	// Récupérer les plans premium pour tous les profiles en une seule requête
	// ✅ Utiliser la fonction RPC avec SECURITY DEFINER pour permettre l'accès aux utilisateurs anonymes
	const premiumProfileIds = new Set<string>();
	if (profileIds.length > 0) {
		const { data: premiumIds, error: premiumError } = await locals.supabase.rpc(
			'check_premium_profiles',
			{
				p_profile_ids: profileIds,
				p_premium_product_id: STRIPE_PRODUCTS.PREMIUM,
				p_lifetime_product_id: STRIPE_PRODUCTS.LIFETIME
			}
		);
		
		if (!premiumError && premiumIds && Array.isArray(premiumIds)) {
			premiumIds.forEach((id: string) => premiumProfileIds.add(id));
		} else if (premiumError) {
			console.error('❌ [Directory] Error checking premium profiles:', premiumError);
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
		city: shop.directory_actual_city || shop.directory_city || cityName, // Afficher la ville exacte, fallback sur grande ville
		postalCode: shop.directory_postal_code || '',
		specialties: (shop.directory_cake_types || []) as string[],
		logo: shop.logo_url || '/images/logo_icone.svg',
		isPremium: shop.isPremium
	}));

	return {
		city: citySlug,
		cityName,
		cakeType: cakeTypeSlug,
		cakeTypeName,
		cakeTypeInfo,
		shops: cakeDesigners
	};
};