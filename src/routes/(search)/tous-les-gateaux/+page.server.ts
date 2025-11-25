import type { PageServerLoad } from './$types';
import { STRIPE_PRODUCTS } from '$lib/config/server';

export const load: PageServerLoad = async ({ locals, url }) => {
	const cityParam = url.searchParams.get('city') || '';
	const cakeTypeParam = url.searchParams.get('type') || '';

	// Charger tous les produits avec leurs shops
	// Ne pas filtrer par ville côté serveur - le filtrage par rayon se fait côté client
	const { data: activeShops, error: shopsError } = await locals.supabase
		.from('shops')
		.select('id')
		.eq('is_active', true);

	if (shopsError) {
		console.error('❌ [Tous les gateaux] Error loading shops:', shopsError);
		return { products: [] };
	}

	const activeShopIds = (activeShops || []).map(shop => shop.id);

	if (activeShopIds.length === 0) {
		return { products: [] };
	}

	// Ensuite, charger les produits de ces shops
	let query = locals.supabase
		.from('products')
		.select(`
			id,
			name,
			description,
			image_url,
			base_price,
			cake_type,
			shops(
				id,
				name,
				slug,
				logo_url,
				directory_city,
				directory_actual_city,
				directory_postal_code
			)
		`)
		.eq('is_active', true)
		.in('shop_id', activeShopIds);

	// Filtrer par type de gâteau si spécifié
	if (cakeTypeParam) {
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
			query = query.eq('cake_type', cakeTypeName);
		}
	}

	const { data: products, error: productsError } = await query;

	if (productsError) {
		console.error('❌ [Tous les gateaux] Error loading products:', productsError);
		return {
			products: []
		};
	}

	// Récupérer tous les profile_ids des shops uniques
	const shopProfileIds = new Set<string>();
	(products || []).forEach((product: any) => {
		if (product.shops?.id) {
			// Récupérer le profile_id du shop
			const shopId = product.shops.id;
			// On va devoir faire une requête pour obtenir les profile_ids
		}
	});

	// Récupérer les profile_ids des shops
	const shopIds = [...new Set((products || []).map((p: any) => p.shops?.id).filter(Boolean))];
	const { data: shopsData } = await locals.supabase
		.from('shops')
		.select('id, profile_id')
		.in('id', shopIds);

	const shopIdToProfileId = new Map<string, string>();
	(shopsData || []).forEach((shop: any) => {
		if (shop.profile_id) {
			shopIdToProfileId.set(shop.id, shop.profile_id);
		}
	});

	// Récupérer tous les profile_ids uniques
	const profileIds = [...new Set(Array.from(shopIdToProfileId.values()))];

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

	// Transformer les données pour correspondre au format attendu par le frontend
	const formattedProducts = (products || []).map((product: any) => {
		const shopProfileId = shopIdToProfileId.get(product.shops.id);
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
				isPremium
			}
		};
	});

	return {
		products: formattedProducts
	};
};

