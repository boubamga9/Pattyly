import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
    const { slug, id } = params;

    // Récupérer les informations de la boutique
    const { data: shop, error: shopError } = await locals.supabase
        .from('shops')
        .select('*')
        .eq('slug', slug)
        .single();

    if (shopError || !shop) {
        throw error(404, 'Boutique non trouvée');
    }

    // Récupérer le produit actif avec ses informations
    const { data: product, error: productError } = await locals.supabase
        .from('products')
        .select(`
			*,
			categories (
				id,
				name
			)
		`)
        .eq('id', id)
        .eq('shop_id', shop.id)
        .eq('is_active', true)
        .single();

    if (productError || !product) {
        throw error(404, 'Produit non trouvé');
    }

    // Récupérer le formulaire de personnalisation si il existe
    let customizationForm = null;
    let customizationFields = [];

    if (product.form_id) {
        const { data: form } = await locals.supabase
            .from('forms')
            .select('*')
            .eq('id', product.form_id)
            .single();

        if (form) {
            const { data: fields } = await locals.supabase
                .from('form_fields')
                .select('*')
                .eq('form_id', form.id)
                .order('order');

            customizationForm = form;
            customizationFields = fields || [];
        }
    }

    // Récupérer les disponibilités de la boutique
    const { data: availabilities } = await locals.supabase
        .from('availabilities')
        .select('day, is_open')
        .eq('shop_id', shop.id);

    // Récupérer les indisponibilités de la boutique
    const { data: unavailabilities } = await locals.supabase
        .from('unavailabilities')
        .select('start_date, end_date')
        .eq('shop_id', shop.id);

    return {
        shop,
        product,
        customizationForm,
        customizationFields,
        availabilities: availabilities || [],
        unavailabilities: unavailabilities || []
    };
}; 