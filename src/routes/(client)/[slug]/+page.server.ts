import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
    const { slug } = params;

    // Récupérer les informations de la boutique
    const { data: shop, error: shopError } = await locals.supabase
        .from('shops')
        .select('*')
        .eq('slug', slug)
        .single();

    if (shopError || !shop) {
        throw error(404, 'Boutique non trouvée');
    }

    // Récupérer les catégories de la boutique
    const { data: categories } = await locals.supabase
        .from('categories')
        .select('*')
        .eq('shop_id', shop.id)
        .order('name');

    // Récupérer les produits de la boutique avec leurs catégories
    const { data: products, error: productsError } = await locals.supabase
        .from('products')
        .select(`
			*,
			categories (
				id,
				name
			)
		`)
        .eq('shop_id', shop.id)
        .order('created_at', { ascending: false });

    // Récupérer les FAQ de la boutique
    const { data: faqs } = await locals.supabase
        .from('faq')
        .select('*')
        .eq('shop_id', shop.id)
        .order('created_at', { ascending: true });

    return {
        shop,
        categories: categories || [],
        products: products || [],
        faqs: faqs || []
    };
};
