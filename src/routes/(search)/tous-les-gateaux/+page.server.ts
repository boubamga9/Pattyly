import type { PageServerLoad } from './$types';
import { STRIPE_PRODUCTS } from '$lib/config/server';

export const load: PageServerLoad = async ({ locals, url }) => {
	const cityParam = url.searchParams.get('city') || '';
	const cakeTypeParam = url.searchParams.get('type') || '';

	// Charger tous les produits avec leurs shops
	// Ne pas filtrer par ville côté serveur - le filtrage par rayon se fait côté client
	// ✅ Filtrer uniquement les shops actifs ET visibles dans l'annuaire
	const { data: activeShops, error: shopsError } = await locals.supabase
		.from('shops')
		.select('id')
		.eq('is_active', true)
		.eq('directory_enabled', true);

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
			shops!inner(
				id,
				name,
				slug,
				logo_url,
				directory_city,
				directory_actual_city,
				directory_postal_code,
				profile_id
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

	// Récupérer tous les profile_ids des shops directement depuis les produits
	const profileIds = [...new Set(
		(products || [])
			.map((p: any) => p.shops?.profile_id)
			.filter(Boolean)
	)];

	// Récupérer les plans premium pour tous les profiles en une seule requête
	// ✅ Utiliser la fonction RPC avec SECURITY DEFINER pour permettre l'accès aux utilisateurs anonymes
	const premiumProfileIds = new Set<string>();
	if (profileIds.length > 0) {
		const { data: premiumIds, error: premiumError } = await locals.supabase.rpc(
			'check_premium_profiles',
			{
				p_profile_ids: profileIds,
				p_premium_product_id: STRIPE_PRODUCTS.PREMIUM
			}
		);
		
		if (!premiumError && premiumIds && Array.isArray(premiumIds)) {
			premiumIds.forEach((id: string) => premiumProfileIds.add(id));
		} else if (premiumError) {
			console.error('❌ [Tous les gateaux] Error checking premium profiles:', premiumError);
		}
	}

	// Transformer les données pour correspondre au format attendu par le frontend
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
				isPremium
			}
		};
	});

	return {
		products: formattedProducts
	};
};
