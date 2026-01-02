import type { PageServerLoad } from './$types';
import { STRIPE_PRODUCTS } from '$lib/config/server';

const ITEMS_PER_PAGE = 12; // Nombre d'éléments par page

export const load: PageServerLoad = async ({ locals, url }) => {
	const cityParam = url.searchParams.get('city') || '';
	const cakeTypeParam = url.searchParams.get('type') || '';
	const pageParam = url.searchParams.get('page');
	const page = pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1;
	const limit = ITEMS_PER_PAGE;
	const offset = (page - 1) * limit;

	// Paramètres de filtrage géographique (optionnels)
	const latParam = url.searchParams.get('lat');
	const lonParam = url.searchParams.get('lon');
	const radiusParam = url.searchParams.get('radius'); // en km

	// Si on a des coordonnées GPS et un rayon, utiliser la fonction RPC pour le filtrage géographique
	if (latParam && lonParam && radiusParam) {
		const latitude = parseFloat(latParam);
		const longitude = parseFloat(lonParam);
		const radius = parseFloat(radiusParam);

		if (!isNaN(latitude) && !isNaN(longitude) && !isNaN(radius)) {
			// Utiliser la fonction RPC pour trouver les shops dans le rayon
			const { data: shopsInRadius, error: radiusError } = await locals.supabase.rpc(
				'find_shops_in_radius' as any,
				{
					p_latitude: latitude,
					p_longitude: longitude,
					p_radius_km: radius,
					p_limit: limit * 3, // Charger plus pour pouvoir filtrer par type ensuite
					p_offset: 0,
					p_premium_product_id: STRIPE_PRODUCTS.PREMIUM,
					p_verified_only: false
				}
			);

			if (radiusError) {
				console.error('❌ [Annuaire] Error finding shops in radius:', radiusError);
			}

			// Filtrer par type de gâteau si spécifié
			let filteredShops: any[] = Array.isArray(shopsInRadius) ? shopsInRadius : [];
			if (cakeTypeParam && cakeTypeParam.toLowerCase() !== 'gateau-evenement') {
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
					// Charger les shops complets pour vérifier les types
					const shopIds = filteredShops.map((s: any) => s.shop_id);
					if (shopIds.length > 0) {
						const { data: shopsData, error: shopsError } = await locals.supabase
							.from('shops')
							.select('id, directory_cake_types')
							.in('id', shopIds);

						if (!shopsError && shopsData && Array.isArray(shopsData)) {
							const shopsWithType = shopsData.filter((shop: any) =>
								(shop.directory_cake_types || []).includes(cakeTypeName)
							);
							const validIds = new Set(shopsWithType.map((s: any) => s.id));
							filteredShops = filteredShops.filter((s: any) => validIds.has(s.shop_id));
						}
					}
				}
			}

			// Appliquer la pagination
			const total = filteredShops.length;
			const paginatedShops = filteredShops.slice(offset, offset + limit);

			// Charger les données complètes des shops paginés
			const shopIds = paginatedShops.map((s: any) => s.shop_id);
			if (shopIds.length === 0) {
				return {
					shops: [],
					pagination: {
						page,
						limit,
						total,
						hasMore: offset + limit < total
					}
				};
			}

			const { data: shops, error: shopsError } = await locals.supabase
				.from('shops')
				.select('id, name, slug, logo_url, bio, directory_city, directory_actual_city, directory_postal_code, directory_cake_types, profile_id, latitude, longitude')
				.in('id', shopIds);

			if (shopsError || !shops) {
				console.error('❌ [Directory] Error loading shops:', shopsError);
				return {
					shops: [],
					pagination: {
						page,
						limit,
						total: 0,
						hasMore: false
					}
				};
			}

			// Créer un map pour préserver l'ordre et les distances
			const shopMap = new Map(paginatedShops.map((s: any) => [s.shop_id, s]));
			const orderedShops = (shops || []).filter((s: any) => shopMap.has(s.id)).map((shop: any) => {
				const radiusData = shopMap.get(shop.id) as any;
				return {
					...shop,
					distance: radiusData?.distance_km || null,
					is_premium: radiusData?.is_premium || false
				};
			});

			// Récupérer les profile_ids et vérifier les premiums (fallback si is_premium n'est pas dans les données)
			const profileIds = orderedShops.map(shop => shop.profile_id).filter(Boolean);
			const premiumProfileIds = new Set<string>();
			if (profileIds.length > 0) {
				const { data: premiumIds, error: premiumError } = await locals.supabase.rpc(
					'check_premium_profiles' as any,
					{
						p_profile_ids: profileIds,
						p_premium_product_id: STRIPE_PRODUCTS.PREMIUM
					}
				);

				if (!premiumError && premiumIds && Array.isArray(premiumIds)) {
					premiumIds.forEach((id: any) => {
						if (typeof id === 'string') premiumProfileIds.add(id);
					});
				}
			}

			// Marquer premium (is_premium est déjà calculé dans la fonction SQL)
			const shopsWithPremium = orderedShops.map(shop => ({
				...shop,
				isPremium: (shop as any).is_premium !== undefined
					? (shop as any).is_premium
					: (shop.profile_id ? premiumProfileIds.has(shop.profile_id) : false)
			}));

			// ✅ Le tri est déjà fait dans la fonction SQL (premium en premier, puis distance, puis nom)
			// On garde juste l'ordre retourné par la fonction

			const cakeDesigners = shopsWithPremium.map((shop) => ({
				id: shop.id,
				name: shop.name,
				slug: shop.slug,
				city: shop.directory_city || '',
				actualCity: shop.directory_actual_city || shop.directory_city || '',
				postalCode: shop.directory_postal_code || '',
				specialties: (shop.directory_cake_types || []) as string[],
				logo: shop.logo_url || '/images/logo_icone.svg',
				bio: shop.bio || '',
				isPremium: shop.isPremium,
				distance: shop.distance,
				latitude: shop.latitude ? parseFloat(shop.latitude.toString()) : null,
				longitude: shop.longitude ? parseFloat(shop.longitude.toString()) : null
			}));

			return {
				shops: cakeDesigners,
				pagination: {
					page,
					limit,
					total,
					hasMore: offset + limit < total
				}
			};
		}
	}

	// Fallback : méthode classique sans filtrage géographique
	let query = locals.supabase
		.from('shops')
		.select('id, name, slug, logo_url, bio, directory_city, directory_actual_city, directory_postal_code, directory_cake_types, profile_id, latitude, longitude', { count: 'exact' })
		.eq('directory_enabled', true)
		.eq('is_active', true);

	// Si une ville est spécifiée, filtrer par directory_city
	if (cityParam) {
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

	// Paramètre pour filtrer uniquement les vérifiés
	const verifiedParam = url.searchParams.get('verified');
	const verifiedOnly = verifiedParam === 'true';

	// Si un type de gâteau est spécifié, filtrer par directory_cake_types
	let cakeTypeName: string | null = null;
	if (cakeTypeParam && cakeTypeParam.toLowerCase() !== 'gateau-evenement') {
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

		cakeTypeName = cakeTypeSlugToName[cakeTypeParam.toLowerCase()] || null;
	}

	// ✅ Utiliser la fonction SQL qui trie directement par premium
	const { data: shopsData, error: shopsError } = await locals.supabase.rpc(
		'get_shops_sorted_by_premium' as any,
		{
			p_premium_product_id: STRIPE_PRODUCTS.PREMIUM,
			p_limit: limit,
			p_offset: offset,
			p_city: cityParam || null,
			p_cake_type: cakeTypeName,
			p_verified_only: verifiedOnly
		}
	);

	if (shopsError) {
		console.error('❌ [Directory] Error loading shops:', shopsError);
		return {
			shops: [],
			pagination: {
				page,
				limit,
				total: 0,
				hasMore: false
			}
		};
	}

	// Compter le total pour la pagination (avec les mêmes filtres)
	let countQuery = locals.supabase
		.from('shops')
		.select('*', { count: 'exact', head: true })
		.eq('directory_enabled', true)
		.eq('is_active', true);

	if (cityParam) {
		const cityToSlug: Record<string, string> = {
			'paris': 'Paris',
			'lyon': 'Lyon',
			'marseille': 'Marseille',
			'toulouse': 'Toulouse',
			'nice': 'Nice',
			'nantes': 'Nantes',
			'strasbourg': 'Strasbourg',
			'montpellier': 'Montpellier',
			'bordeaux': 'Bordeaux',
			'lille': 'Lille',
			'rennes': 'Rennes',
			'reims': 'Reims',
		};
		const cityName = cityToSlug[cityParam.toLowerCase()];
		if (cityName) {
			countQuery = countQuery.eq('directory_city', cityName);
		}
	}

	if (cakeTypeName) {
		countQuery = countQuery.contains('directory_cake_types', [cakeTypeName]);
	}

	const { count } = await countQuery;
	const total = count || 0;
	const shops = shopsData || [];

	// Transformer les données (is_premium est déjà inclus depuis la fonction SQL)
	const cakeDesigners = shops.map((shop: any) => ({
		id: shop.id,
		name: shop.name,
		slug: shop.slug,
		city: shop.directory_city || '',
		actualCity: shop.directory_actual_city || shop.directory_city || '',
		postalCode: shop.directory_postal_code || '',
		specialties: (shop.directory_cake_types || []) as string[],
		logo: shop.logo_url || '/images/logo_icone.svg',
		bio: shop.bio || '',
		isPremium: shop.is_premium || false,
		latitude: shop.latitude ? parseFloat(shop.latitude.toString()) : null,
		longitude: shop.longitude ? parseFloat(shop.longitude.toString()) : null
	}));

	return {
		shops: cakeDesigners,
		pagination: {
			page,
			limit,
			total,
			hasMore: offset + limit < total
		}
	};
};

