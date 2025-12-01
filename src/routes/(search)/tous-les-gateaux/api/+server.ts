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

	// Charger les shops actifs
	const { data: activeShops, error: shopsError } = await locals.supabase
		.from('shops')
		.select('id, latitude, longitude, profile_id')
		.eq('is_active', true)
		.eq('directory_enabled', true);

	if (shopsError) {
		return json({ products: [], pagination: { page, limit, total: 0, hasMore: false } }, { status: 500 });
	}

	let filteredShopIds = (activeShops || []).map(shop => shop.id);

	// Filtrer par rayon si coordonnées fournies
	if (latParam && lonParam && radiusParam) {
		const latitude = parseFloat(latParam);
		const longitude = parseFloat(lonParam);
		const radius = parseFloat(radiusParam);

		if (!isNaN(latitude) && !isNaN(longitude) && !isNaN(radius)) {
			const { data: shopsInRadius, error: radiusError } = await locals.supabase.rpc(
				'find_shops_in_radius',
				{
					p_latitude: latitude,
					p_longitude: longitude,
					p_radius_km: radius,
					p_limit: 1000,
					p_offset: 0
				}
			);

			if (!radiusError && shopsInRadius) {
				filteredShopIds = shopsInRadius.map((s: any) => s.shop_id);
			}
		}
	}

	// Filtrer par vérifiés si demandé
	if (verifiedParam === 'true' && filteredShopIds.length > 0) {
		const { data: shopsData, error: shopsError } = await locals.supabase
			.from('shops')
			.select('id, profile_id')
			.in('id', filteredShopIds);

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
				filteredShopIds = filteredShopIds.filter(id => validIds.has(id));
			}
		}
	}

	if (filteredShopIds.length === 0) {
		return json({
			products: [],
			pagination: {
				page,
				limit,
				total: 0,
				hasMore: false
			}
		});
	}

	// Charger les produits
	let query = locals.supabase
		.from('products')
		.select(`
			id,
			name,
			description,
			image_url,
			base_price,
			cake_type,
			shops!inner(
				id,
				name,
				slug,
				logo_url,
				directory_city,
				directory_actual_city,
				directory_postal_code,
				profile_id,
				latitude,
				longitude
			)
		`, { count: 'exact' })
		.eq('is_active', true)
		.in('shop_id', filteredShopIds);

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

		const cakeTypeName = cakeTypeSlugToName[cakeTypeParam.toLowerCase()];
		if (cakeTypeName) {
			query = query.eq('cake_type', cakeTypeName);
		}
	}

	query = query.order('name', { ascending: true }).range(offset, offset + limit - 1);

	const { data: products, error: productsError, count } = await query;

	if (productsError) {
		return json({ products: [], pagination: { page, limit, total: 0, hasMore: false } }, { status: 500 });
	}

	const total = count || 0;

	// Vérifier les premiums
	const profileIds = [...new Set(
		(products || [])
			.map((p: any) => p.shops?.profile_id)
			.filter(Boolean)
	)];

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

	const formattedProducts = (products || []).map((product: any) => {
		const shopProfileId = product.shops?.profile_id;
		const isPremium = shopProfileId ? premiumProfileIds.has(shopProfileId) : false;

		return {
			id: product.id,
			name: product.name,
			description: product.description,
			image_url: product.image_url,
			base_price: product.base_price,
			cake_type: product.cake_type,
			shop: {
				id: product.shops.id,
				name: product.shops.name,
				slug: product.shops.slug,
				logo_url: product.shops.logo_url,
				city: product.shops.directory_city || '',
				actualCity: product.shops.directory_actual_city || product.shops.directory_city || '',
				postalCode: product.shops.directory_postal_code || '',
				isPremium,
				latitude: product.shops.latitude,
				longitude: product.shops.longitude
			}
		};
	});

	formattedProducts.sort((a, b) => {
		if (a.shop.isPremium && !b.shop.isPremium) return -1;
		if (!a.shop.isPremium && b.shop.isPremium) return 1;
		return a.name.localeCompare(b.name);
	});

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

