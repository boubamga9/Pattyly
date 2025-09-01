import { error, fail, redirect } from '@sveltejs/kit';
import { message, superValidate, setError } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import type { PageServerLoad, Actions } from './$types';
import { createLocalDynamicSchema } from './schema';

export const load: PageServerLoad = async ({ params, locals }) => {
    try {
        const { slug } = params;
        console.log('🔍 Loading custom form page for shop:', slug);

        // Récupérer les informations de la boutique
        const { data: shop, error: shopError } = await locals.supabase
            .from('shops')
            .select('id, name, bio, slug, logo_url, is_custom_accepted')
            .eq('slug', slug)
            .eq('is_active', true)
            .single();

        if (shopError) {
            console.error('❌ Database error fetching shop:', shopError);
            throw error(500, 'Erreur serveur lors du chargement de la boutique');
        }

        if (!shop) {
            console.log('⚠️ Shop not found:', slug);
            throw error(404, 'Boutique non trouvée');
        }

        console.log('✅ Shop found:', shop.id);

        // Vérifier que les demandes personnalisées sont activées
        if (!shop.is_custom_accepted) {
            console.log('⚠️ Custom orders not accepted for shop:', slug);
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
            console.error('❌ Error fetching custom form:', formError);
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
                console.error('❌ Error fetching form fields:', fieldsError);
                throw error(500, 'Erreur lors du chargement des champs du formulaire');
            }

            customFields = formFields || [];
            console.log('✅ Custom form fields loaded:', customFields.length, 'fields');
        } else {
            console.log('ℹ️ No custom form found for shop:', slug);
        }

        // Récupérer les disponibilités de la boutique
        const { data: availabilities, error: availabilitiesError } = await locals.supabase
            .from('availabilities')
            .select('day, is_open')
            .eq('shop_id', shop.id);

        if (availabilitiesError) {
            console.error('❌ Error fetching availabilities:', availabilitiesError);
            throw error(500, 'Erreur lors du chargement des disponibilités');
        }

        // Récupérer les indisponibilités de la boutique
        const { data: unavailabilities, error: unavailabilitiesError } = await locals.supabase
            .from('unavailabilities')
            .select('start_date, end_date')
            .eq('shop_id', shop.id);

        if (unavailabilitiesError) {
            console.error('❌ Error fetching unavailabilities:', unavailabilitiesError);
            throw error(500, 'Erreur lors du chargement des indisponibilités');
        }

        console.log('✅ Shop data loaded successfully');

        // Créer le schéma dynamique basé sur les champs configurés
        const dynamicSchema = createLocalDynamicSchema(customFields);

        return {
            shop,
            customForm,
            customFields,
            availabilities: availabilities || [],
            unavailabilities: unavailabilities || [],
            form: await superValidate(zod(dynamicSchema))
        };

    } catch (err) {
        console.error('💥 Unexpected error in custom form load:', err);
        throw error(500, 'Erreur inattendue lors du chargement de la page');
    }
};

export const actions: Actions = {
    createCustomOrder: async ({ request, params, locals }) => {
        // Vérifier si c'est une erreur de rate limiting
        const rateLimitExceeded = request.headers.get('x-rate-limit-exceeded');
        if (rateLimitExceeded === 'true') {
            const rateLimitMessage = request.headers.get('x-rate-limit-message') || 'Trop de tentatives. Veuillez patienter.';
            console.log('🚫 Rate limiting détecté dans l\'action createCustomOrder:', rateLimitMessage);

            // Créer un schéma temporaire pour l'erreur
            const tempSchema = createLocalDynamicSchema([]);
            const form = await superValidate(request, zod(tempSchema));
            setError(form, '', rateLimitMessage);
            return { form };
        }

        try {
            const { slug } = params;

            // Récupérer les informations de la boutique
            const { data: shop, error: shopError } = await locals.supabase
                .from('shops')
                .select('id, name, slug')
                .eq('slug', slug)
                .eq('is_active', true)
                .single();

            if (shopError || !shop) {
                throw error(404, 'Boutique non trouvée');
            }

            // Récupérer les champs du formulaire pour créer le schéma dynamique
            const { data: customForm } = await locals.supabase
                .from('forms')
                .select('id')
                .eq('shop_id', shop.id)
                .eq('is_custom_form', true)
                .single();

            let customFields: any[] = [];
            if (customForm) {
                const { data: formFields } = await locals.supabase
                    .from('form_fields')
                    .select('*')
                    .eq('form_id', customForm.id)
                    .order('order');
                customFields = formFields || [];
            }

            // Créer le schéma dynamique et valider le formulaire
            const dynamicSchema = createLocalDynamicSchema(customFields);
            const form = await superValidate(request, zod(dynamicSchema));

            if (!form.valid) {
                return fail(400, { form });
            }

            const {
                customer_name,
                customer_email,
                customer_phone,
                customer_instagram,
                pickup_date,
                additional_information,
                customization_data
            } = form.data;

            // Transformer les données de personnalisation : ID → Label
            const transformedCustomizationData: Record<string, any> = {};
            if (customization_data && Object.keys(customization_data).length > 0) {
                Object.entries(customization_data).forEach(([fieldId, value]) => {
                    const field = customFields.find(f => f.id === fieldId);
                    if (field) {
                        transformedCustomizationData[field.label] = value;
                    }
                });
            }

            // Créer la commande personnalisée
            const { data: order, error: orderError } = await locals.supabase
                .from('orders')
                .insert({
                    shop_id: shop.id,
                    customer_name,
                    customer_email,
                    customer_phone,
                    customer_instagram,
                    pickup_date: pickup_date.toISOString().split('T')[0], // Convertir Date en string
                    additional_information,
                    customization_data: transformedCustomizationData, // Utiliser les données transformées
                    total_amount: 0, // Prix à définir plus tard par le chef
                    product_name: 'Demande personnalisée',
                    status: 'pending'
                })
                .select()
                .single();

            if (orderError) {
                console.error('Error creating custom order:', orderError);
                throw error(500, 'Erreur lors de la création de la commande');
            }

            return message(form, { redirectTo: `/${slug}/order/${order.id}` })

        } catch (err) {
            console.error('❌ Error in createCustomOrder:', err);

            // ✅ CORRECTION - Toujours retourner le form pour Superforms
            const tempSchema = createLocalDynamicSchema([]);
            const form = await superValidate(request, zod(tempSchema));
            setError(form, '', 'Erreur serveur inattendue. Veuillez réessayer.');
            return { form };
        }
    }
};
