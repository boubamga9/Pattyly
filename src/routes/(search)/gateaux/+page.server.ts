import type { PageServerLoad } from './$types';
import { STRIPE_PRODUCTS } from '$lib/config/server';

const ITEMS_PER_PAGE = 12;

export const load: PageServerLoad = async ({ locals, url, setHeaders }) => {
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

	// ✅ Filtrer uniquement les shops actifs ET visibles dans l'annuaire
	const { data: activeShops, error: shopsError } = await locals.supabase
		.from('shops')
		.select('id, latitude, longitude, profile_id')
		.eq('is_active', true)
		.eq('directory_enabled', true);

	if (shopsError) {
		console.error('❌ [Tous les gateaux] Error loading shops:', shopsError);
		return {
			products: [],
			pagination: {
				page,
				limit,
				total: 0,
				hasMore: false
			}
		};
	}

	const activeShopIds = (activeShops || []).map(shop => shop.id);

	if (activeShopIds.length === 0) {
		return {
			products: [],
			pagination: {
				page,
				limit,
				total: 0,
				hasMore: false
			}
		};
	}

	// Si on a des coordonnées GPS et un rayon, filtrer les shops par distance
	let filteredShopIds = activeShopIds;
	if (latParam && lonParam && radiusParam) {
		const latitude = parseFloat(latParam);
		const longitude = parseFloat(lonParam);
		const radius = parseFloat(radiusParam);

		if (!isNaN(latitude) && !isNaN(longitude) && !isNaN(radius)) {
			// Utiliser la fonction RPC pour trouver les shops dans le rayon
			const { data: shopsInRadius, error: radiusError } = await locals.supabase.rpc(
				'find_shops_in_radius',
				{
					p_latitude: latitude,
					p_longitude: longitude,
					p_radius_km: radius,
					p_limit: 1000, // Limite élevée pour avoir tous les shops dans le rayon
					p_offset: 0,
					p_premium_product_id: STRIPE_PRODUCTS.PREMIUM,
					p_lifetime_product_id: STRIPE_PRODUCTS.LIFETIME
				}
			);

			if (!radiusError && shopsInRadius) {
				filteredShopIds = shopsInRadius.map((s: any) => s.shop_id);
			}
		}
	}

	if (filteredShopIds.length === 0) {
		return {
			products: [],
			pagination: {
				page,
				limit,
				total: 0,
				hasMore: false
			}
		};
	}

	// Paramètre pour filtrer uniquement les vérifiés
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

	// ✅ Utiliser la fonction SQL qui trie directement par shop premium
	const { data: productsData, error: productsError } = await locals.supabase.rpc(
		'get_products_sorted_by_shop_premium' as any,
		{
			p_premium_product_id: STRIPE_PRODUCTS.PREMIUM,
			p_lifetime_product_id: STRIPE_PRODUCTS.LIFETIME,
			p_limit: limit,
			p_offset: offset,
			p_cake_type: cakeTypeName,
			p_shop_ids: filteredShopIds.length > 0 ? filteredShopIds : null,
			p_verified_only: verifiedOnly
		}
	);

	if (productsError) {
		console.error('❌ [Tous les gateaux] Error loading products:', productsError);
		return {
			products: [],
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
		.from('products')
		.select('*', { count: 'exact', head: true })
		.eq('is_active', true)
		.in('shop_id', filteredShopIds);

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
				// Calculer la distance (formule de Haversine simplifiée)
				// On peut aussi utiliser la fonction SQL calculate_distance_km si nécessaire
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

	// ✅ Le tri est déjà fait dans la fonction SQL (premium shop products en premier, puis nom)

	// ✅ Cache HTTP pour optimiser les performances
	// Cache de 5 minutes (300s) : bon compromis performance/fraîcheur des données
	// stale-while-revalidate de 10 minutes (600s) : sert le cache pendant la mise à jour en arrière-plan
	setHeaders({
		'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
	});

	return {
		products: formattedProducts,
		pagination: {
			page,
			limit,
			total,
			hasMore: offset + limit < total
		}
	};
};
