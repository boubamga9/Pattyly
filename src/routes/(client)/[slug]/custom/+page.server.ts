import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
    const { slug } = params;

    // Récupérer les informations de la boutique
    const { data: shop, error: shopError } = await locals.supabase
        .from('shops')
        .select('id, name, bio, slug, logo_url, is_custom_accepted')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

    if (shopError || !shop) {
        throw error(404, 'Boutique non trouvée');
    }

    // Vérifier que les demandes personnalisées sont activées
    if (!shop.is_custom_accepted) {
        throw error(404, 'Demandes personnalisées non disponibles');
    }

    // Récupérer le formulaire personnalisé
    const { data: customForm, error: formError } = await locals.supabase
        .from('forms')
        .select('id, is_custom_form, title, description')
        .eq('shop_id', shop.id)
        .eq('is_custom_form', true)
        .single();

    if (formError && formError.code !== 'PGRST116') {
        console.error('Error fetching custom form:', formError);
        throw error(500, 'Erreur lors du chargement du formulaire personnalisé');
    }

    // Récupérer les champs du formulaire s'il existe
    let customFields: any[] = [];
    if (customForm) {
        const { data: formFields, error: fieldsError } = await locals.supabase
            .from('form_fields')
            .select('*')
            .eq('form_id', customForm.id)
            .order('order');

        if (fieldsError) {
            console.error('Error fetching form fields:', fieldsError);
            throw error(500, 'Erreur lors du chargement des champs du formulaire');
        }

        customFields = formFields || [];
    }

    // Récupérer les disponibilités de la boutique
    const { data: availabilities, error: availabilitiesError } = await locals.supabase
        .from('availabilities')
        .select('day, is_open')
        .eq('shop_id', shop.id);

    if (availabilitiesError) {
        console.error('Error fetching availabilities:', availabilitiesError);
        throw error(500, 'Erreur lors du chargement des disponibilités');
    }

    // Récupérer les indisponibilités de la boutique
    const { data: unavailabilities, error: unavailabilitiesError } = await locals.supabase
        .from('unavailabilities')
        .select('start_date, end_date')
        .eq('shop_id', shop.id);

    if (unavailabilitiesError) {
        console.error('Error fetching unavailabilities:', unavailabilitiesError);
        throw error(500, 'Erreur lors du chargement des indisponibilités');
    }

    return {
        shop,
        customForm,
        customFields,
        availabilities: availabilities || [],
        unavailabilities: unavailabilities || []
    };
};
