import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { STRIPE_PRODUCTS } from '$lib/config/server';

const ITEMS_PER_PAGE = 12;

export const GET: RequestHandler = async ({ locals, url }) => {
	const cityParam = url.searchParams.get('city') || '';
	const cakeTypeParam = url.searchParams.get('type') || '';
	const pageParam = url.searchParams.get('page');
	const page = pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1;
	const limit = ITEMS_PER_PAGE;
	const offset = (page - 1) * limit;

	// Paramètres de filtrage géographique
	const latParam = url.searchParams.get('lat');
	const lonParam = url.searchParams.get('lon');
	const radiusParam = url.searchParams.get('radius');

	// Si on a des coordonnées GPS et un rayon, utiliser la fonction RPC
	if (latParam && lonParam && radiusParam) {
		const latitude = parseFloat(latParam);
		const longitude = parseFloat(lonParam);
		const radius = parseFloat(radiusParam);

		if (!isNaN(latitude) && !isNaN(longitude) && !isNaN(radius)) {
			const verifiedParam = url.searchParams.get('verified');
			const verifiedOnly = verifiedParam === 'true';

			const { data: shopsInRadius, error: radiusError } = await locals.supabase.rpc(
				'find_shops_in_radius' as any,
				{
					p_latitude: latitude,
					p_longitude: longitude,
					p_radius_km: radius,
					p_limit: limit * 3,
					p_offset: 0,
					p_premium_product_id: STRIPE_PRODUCTS.PREMIUM,
					p_verified_only: verifiedOnly
				}
			);

			if (radiusError) {
				console.error('❌ [Annuaire API] Error finding shops in radius:', radiusError);
				return json({ shops: [], pagination: { page, limit, total: 0, hasMore: false } }, { status: 500 });
			}

			// Filtrer par type de gâteau si spécifié
			let filteredShops = shopsInRadius || [];
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
					const shopIds = filteredShops.map((s: any) => s.shop_id);
					if (shopIds.length > 0) {
						const { data: shopsData, error: shopsError } = await locals.supabase
							.from('shops')
							.select('id, directory_cake_types')
							.in('id', shopIds);

						if (!shopsError && shopsData) {
							const shopsWithType = shopsData.filter(shop =>
								(shop.directory_cake_types || []).includes(cakeTypeName)
							);
							const validIds = new Set(shopsWithType.map(s => s.id));
							filteredShops = filteredShops.filter((s: any) => validIds.has(s.shop_id));
						}
					}
				}
			}

			// Filtrer par pâtissiers vérifiés si demandé (verifiedParam déjà déclaré ligne 27)
			if (verifiedOnly) {
				const shopIds = filteredShops.map((s: any) => s.shop_id);
				if (shopIds.length > 0) {
					const { data: shopsData, error: shopsError } = await locals.supabase
						.from('shops')
						.select('id, profile_id')
						.in('id', shopIds);

					if (!shopsError && shopsData) {
						const profileIds = shopsData.map(s => s.profile_id).filter(Boolean);
						if (profileIds.length > 0) {
							const { data: premiumIds } = await locals.supabase.rpc(
								'check_premium_profiles',
								{
									p_profile_ids: profileIds,
									p_premium_product_id: STRIPE_PRODUCTS.PREMIUM
								}
							);
							const premiumProfileIds = new Set(premiumIds || []);
							const validIds = new Set(
								shopsData
									.filter(s => s.profile_id && premiumProfileIds.has(s.profile_id))
									.map(s => s.id)
							);
							filteredShops = filteredShops.filter((s: any) => validIds.has(s.shop_id));
						}
					}
				}
			}

			// Appliquer la pagination
			const total = filteredShops.length;
			const paginatedShops = filteredShops.slice(offset, offset + limit);

			if (paginatedShops.length === 0) {
				return json({
					shops: [],
					pagination: {
						page,
						limit,
						total,
						hasMore: false
					}
				});
			}

			// Charger les données complètes
			const shopIds = paginatedShops.map((s: any) => s.shop_id);
			const { data: shops, error: shopsError } = await locals.supabase
				.from('shops')
				.select('id, name, slug, logo_url, bio, directory_city, directory_actual_city, directory_postal_code, directory_cake_types, profile_id, latitude, longitude')
				.in('id', shopIds);

			if (shopsError) {
				return json({ shops: [], pagination: { page, limit, total: 0, hasMore: false } }, { status: 500 });
			}

			const shopMap = new Map(paginatedShops.map((s: any) => [s.shop_id, s]));
			const orderedShops = shops?.filter(s => shopMap.has(s.id)).map(shop => {
				const radiusData = shopMap.get(shop.id);
				return {
					...shop,
					distance: radiusData?.distance_km || null
				};
			}) || [];

			// Vérifier les premiums
			const profileIds = orderedShops.map(shop => shop.profile_id).filter(Boolean);
			const premiumProfileIds = new Set<string>();
			if (profileIds.length > 0) {
				const { data: premiumIds } = await locals.supabase.rpc(
					'check_premium_profiles',
					{
						p_profile_ids: profileIds,
						p_premium_product_id: STRIPE_PRODUCTS.PREMIUM
					}
				);
				if (premiumIds && Array.isArray(premiumIds)) {
					premiumIds.forEach((id: string) => premiumProfileIds.add(id));
				}
			}

			// Marquer premium (is_premium est déjà calculé dans la fonction SQL)
			const shopsWithPremium = orderedShops.map(shop => ({
				...shop,
				isPremium: (shop as any).is_premium || (shop.profile_id ? premiumProfileIds.has(shop.profile_id) : false)
			}));

			// ✅ Le tri est déjà fait dans la fonction SQL (premium en premier, puis distance, puis nom)

			const cakeDesigners = shopsWithPremium.map((shop: any) => ({
				id: shop.id,
				name: shop.name,
				slug: shop.slug,
				city: shop.directory_city || '',
				actualCity: shop.directory_actual_city || shop.directory_city || '',
				postalCode: shop.directory_postal_code || '',
				specialties: (shop.directory_cake_types || []) as string[],
				logo: shop.logo_url || '/images/logo_icone.svg',
				bio: shop.bio || '',
				isPremium: shop.is_premium !== undefined ? shop.is_premium : shop.isPremium,
				distance: shop.distance,
				latitude: shop.latitude ? parseFloat(shop.latitude.toString()) : null,
				longitude: shop.longitude ? parseFloat(shop.longitude.toString()) : null
			}));

			return json({
				shops: cakeDesigners,
				pagination: {
					page,
					limit,
					total,
					hasMore: offset + limit < total
				}
			});
		}
	}

	// ✅ Utiliser la fonction SQL qui trie directement par premium (fallback sans filtrage géographique)
	const verifiedParam = url.searchParams.get('verified');
	const verifiedOnly = verifiedParam === 'true';

	// Si un type de gâteau est spécifié
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

	// Convertir cityParam en nom de ville si nécessaire
	let cityName: string | null = null;
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
		cityName = cityToSlug[cityParam.toLowerCase()] || null;
	}

	// ✅ Utiliser la fonction SQL qui trie directement par premium
	const { data: shopsData, error: shopsError } = await locals.supabase.rpc(
		'get_shops_sorted_by_premium' as any,
		{
			p_premium_product_id: STRIPE_PRODUCTS.PREMIUM,
			p_limit: limit,
			p_offset: offset,
			p_city: cityName,
			p_cake_type: cakeTypeName,
			p_verified_only: verifiedOnly
		}
	);

	if (shopsError) {
		return json({ shops: [], pagination: { page, limit, total: 0, hasMore: false } }, { status: 500 });
	}

	// Compter le total pour la pagination (avec les mêmes filtres)
	// Si verified_only est activé, filtrer les shops premium avant de compter
	let total = 0;
	if (verifiedOnly) {
		// Construire la requête de base pour les shops
		let baseQuery = locals.supabase
			.from('shops')
			.select('id, profile_id')
			.eq('directory_enabled', true)
			.eq('is_active', true);

		if (cityName) {
			baseQuery = baseQuery.eq('directory_city', cityName);
		}

		if (cakeTypeName) {
			baseQuery = baseQuery.contains('directory_cake_types', [cakeTypeName]);
		}

		const { data: shopsData, error: shopsError } = await baseQuery;

		if (!shopsError && shopsData && shopsData.length > 0) {
			const profileIds = shopsData.map(s => s.profile_id).filter(Boolean) as string[];

			if (profileIds.length > 0) {
				// Utiliser la fonction SQL avec SECURITY DEFINER pour vérifier les profiles premium
				const { data: premiumProfileIds, error: premiumError } = await locals.supabase.rpc(
					'check_premium_profiles',
					{
						p_profile_ids: profileIds,
						p_premium_product_id: STRIPE_PRODUCTS.PREMIUM
					}
				);

				if (!premiumError && premiumProfileIds && Array.isArray(premiumProfileIds) && premiumProfileIds.length > 0) {
					const premiumProfileIdsSet = new Set(premiumProfileIds);
					// Compter les shops qui ont ces profile_ids premium
					total = shopsData.filter(s => s.profile_id && premiumProfileIdsSet.has(s.profile_id)).length;
				} else {
					// Aucun shop premium trouvé = total = 0
					total = 0;
				}
			} else {
				// Aucun profile_id valide = total = 0
				total = 0;
			}
		} else {
			// En cas d'erreur ou aucun shop, total = 0
			total = 0;
		}
	} else {
		// Si verified_only n'est pas activé, compter normalement
		let countQuery = locals.supabase
			.from('shops')
			.select('*', { count: 'exact', head: true })
			.eq('directory_enabled', true)
			.eq('is_active', true);

		if (cityName) {
			countQuery = countQuery.eq('directory_city', cityName);
		}

		if (cakeTypeName) {
			countQuery = countQuery.contains('directory_cake_types', [cakeTypeName]);
		}

		const { count } = await countQuery;
		total = count || 0;
	}
	const shops = shopsData || [];

	const shopsWithPremium = shops.map((shop: any) => ({
		...shop,
		isPremium: shop.is_premium || false
	}));

	const cakeDesigners = shopsWithPremium.map((shop: any) => ({
		id: shop.id,
		name: shop.name,
		slug: shop.slug,
		city: shop.directory_city || '',
		actualCity: shop.directory_actual_city || shop.directory_city || '',
		postalCode: shop.directory_postal_code || '',
		specialties: (shop.directory_cake_types || []) as string[],
		logo: shop.logo_url || '/images/logo_icone.svg',
		bio: shop.bio || '',
		isPremium: shop.is_premium !== undefined ? shop.is_premium : shop.isPremium,
		latitude: shop.latitude ? parseFloat(shop.latitude.toString()) : null,
		longitude: shop.longitude ? parseFloat(shop.longitude.toString()) : null
	}));

	return json({
		shops: cakeDesigners,
		pagination: {
			page,
			limit,
			total,
			hasMore: offset + limit < total
		}
	});
};

