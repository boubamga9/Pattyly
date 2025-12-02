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
	const verifiedParam = url.searchParams.get('verified');
	const verifiedOnly = verifiedParam === 'true';

	// Filtrer par type de gâteau si spécifié
	let cakeTypeName: string | null = null;
	if (cakeTypeParam) {
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

	let filteredShopIds: string[] = [];

	// ✅ PRIORITÉ 1 : Filtrage par rayon géographique (si coordonnées disponibles)
	if (latParam && lonParam && radiusParam) {
		const latitude = parseFloat(latParam);
		const longitude = parseFloat(lonParam);
		const radius = parseFloat(radiusParam);

		if (!isNaN(latitude) && !isNaN(longitude) && !isNaN(radius)) {
			console.log('🔍 [Tous les gateaux API] Filtering by radius:', {
				latitude,
				longitude,
				radius,
				verifiedOnly
			});

			const { data: shopsInRadius, error: radiusError } = await locals.supabase.rpc(
				'find_shops_in_radius',
				{
					p_latitude: latitude,
					p_longitude: longitude,
					p_radius_km: radius,
					p_limit: 1000,
					p_offset: 0,
					p_premium_product_id: STRIPE_PRODUCTS.PREMIUM,
					p_verified_only: verifiedOnly
				}
			);

			if (radiusError) {
				console.error('❌ [Tous les gateaux API] Error finding shops in radius:', radiusError);
				return json({
					products: [],
					pagination: { page, limit, total: 0, hasMore: false }
				}, { status: 500 });
			}

			if (shopsInRadius && Array.isArray(shopsInRadius) && shopsInRadius.length > 0) {
				filteredShopIds = shopsInRadius.map((s: any) => s.shop_id);
				console.log('✅ [Tous les gateaux API] Found shops in radius:', filteredShopIds.length);
			} else {
				console.log('⚠️ [Tous les gateaux API] No shops found in radius');
				// Aucun shop dans le rayon = retourner vide
				return json({
					products: [],
					pagination: { page, limit, total: 0, hasMore: false }
				});
			}
		}
	}
	// ✅ PRIORITÉ 2 : Filtrage par nom de ville (si pas de coordonnées mais nom de ville fourni)
	else if (cityParam) {
		console.log('🔍 [Tous les gateaux API] Filtering by city name:', cityParam);
		
		const cityName = cityParam.charAt(0).toUpperCase() + cityParam.slice(1).toLowerCase();
		const { data: shopsByCity, error: cityError } = await locals.supabase
			.from('shops')
			.select('id')
			.eq('is_active', true)
			.eq('directory_enabled', true)
			.or(`directory_city.ilike.%${cityName}%,directory_actual_city.ilike.%${cityName}%`);

		if (cityError) {
			console.error('❌ [Tous les gateaux API] Error finding shops by city:', cityError);
			return json({
				products: [],
				pagination: { page, limit, total: 0, hasMore: false }
			}, { status: 500 });
		}

		if (shopsByCity && shopsByCity.length > 0) {
			filteredShopIds = shopsByCity.map(s => s.id);
			console.log('✅ [Tous les gateaux API] Found shops by city name:', filteredShopIds.length);
		} else {
			console.log('⚠️ [Tous les gateaux API] No shops found by city name');
			// Aucun shop dans cette ville = retourner vide
			return json({
				products: [],
				pagination: { page, limit, total: 0, hasMore: false }
			});
		}
	}
	// ✅ PRIORITÉ 3 : Pas de filtre géographique, récupérer tous les shops actifs
	else {
		console.log('🔍 [Tous les gateaux API] No geographic filter, loading all active shops');
		
		const { data: allShops, error: shopsError } = await locals.supabase
			.from('shops')
			.select('id')
			.eq('is_active', true)
			.eq('directory_enabled', true);

		if (shopsError) {
			console.error('❌ [Tous les gateaux API] Error loading shops:', shopsError);
			return json({
				products: [],
				pagination: { page, limit, total: 0, hasMore: false }
			}, { status: 500 });
		}

		filteredShopIds = (allShops || []).map(s => s.id);
		console.log('✅ [Tous les gateaux API] Loaded all active shops:', filteredShopIds.length);
	}

	// Si aucun shop trouvé, retourner vide
	if (filteredShopIds.length === 0) {
		return json({
			products: [],
			pagination: { page, limit, total: 0, hasMore: false }
		});
	}

	// ✅ Utiliser la fonction SQL qui trie directement par shop premium
	const { data: productsData, error: productsError } = await locals.supabase.rpc(
		'get_products_sorted_by_shop_premium' as any,
		{
			p_premium_product_id: STRIPE_PRODUCTS.PREMIUM,
			p_limit: limit,
			p_offset: offset,
			p_cake_type: cakeTypeName,
			p_shop_ids: filteredShopIds.length > 0 ? filteredShopIds : null,
			p_verified_only: verifiedOnly
		}
	);

	if (productsError) {
		console.error('❌ [Tous les gateaux API] Error loading products:', productsError);
		return json({ products: [], pagination: { page, limit, total: 0, hasMore: false } }, { status: 500 });
	}

	// Compter le total pour la pagination (avec les mêmes filtres)
	// Si verified_only est activé, filtrer les shops premium avant de compter
	let shopIdsForCount = filteredShopIds;
	if (verifiedOnly && filteredShopIds.length > 0) {
		// Récupérer les profile_ids des shops concernés
		const { data: shopsData, error: shopsError } = await locals.supabase
			.from('shops')
			.select('id, profile_id')
			.in('id', filteredShopIds);

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
					// Filtrer les shops qui ont ces profile_ids premium
					shopIdsForCount = shopsData
						.filter(s => s.profile_id && premiumProfileIdsSet.has(s.profile_id))
						.map(s => s.id);
				} else {
					// Aucun shop premium trouvé = total = 0
					shopIdsForCount = [];
				}
			} else {
				// Aucun profile_id valide = total = 0
				shopIdsForCount = [];
			}
		} else {
			// En cas d'erreur, total = 0
			shopIdsForCount = [];
		}
	}

	let countQuery = locals.supabase
		.from('products')
		.select('*', { count: 'exact', head: true })
		.eq('is_active', true);

	// Ne faire le filtre par shop_id que si on a des shops
	if (shopIdsForCount.length > 0) {
		countQuery = countQuery.in('shop_id', shopIdsForCount);
	} else {
		// Aucun shop = aucun produit
		const total = 0;
		return json({
			products: [],
			pagination: { page, limit, total: 0, hasMore: false }
		});
	}

	if (cakeTypeName) {
		countQuery = countQuery.eq('cake_type', cakeTypeName);
	}

	const { count } = await countQuery;
	const total = count || 0;
	const products = productsData || [];

	// Transformer les données (is_shop_premium est déjà inclus depuis la fonction SQL)
	const formattedProducts = products.map((product: any) => {
		// Calculer la distance si on a les coordonnées
		let distance: number | null = null;
		if (latParam && lonParam && product.shop_latitude && product.shop_longitude) {
			const lat = parseFloat(latParam);
			const lon = parseFloat(lonParam);
			const shopLat = parseFloat(product.shop_latitude.toString());
			const shopLon = parseFloat(product.shop_longitude.toString());
			
			if (!isNaN(lat) && !isNaN(lon) && !isNaN(shopLat) && !isNaN(shopLon)) {
				// Utiliser la fonction SQL pour calculer la distance
				// (on pourrait aussi le faire côté client si nécessaire)
			}
		}

		return {
			id: product.id,
			name: product.name,
			description: product.description,
			image_url: product.image_url,
			base_price: product.base_price,
			cake_type: product.cake_type,
			shop: {
				id: product.shop_id,
				name: product.shop_name,
				slug: product.shop_slug,
				logo_url: product.shop_logo_url,
				city: product.shop_city || '',
				actualCity: product.shop_actual_city || product.shop_city || '',
				postalCode: product.shop_postal_code || '',
				isPremium: product.is_shop_premium || false,
				latitude: product.shop_latitude,
				longitude: product.shop_longitude
			},
			distance
		};
	});

	// ✅ Le tri est déjà fait dans la fonction SQL (premium shop products en premier, puis hash, puis nom)

	return json({
		products: formattedProducts,
		pagination: {
			page,
			limit,
			total,
			hasMore: offset + limit < total
		}
	});
};

