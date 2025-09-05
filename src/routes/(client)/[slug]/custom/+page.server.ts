import { error, fail, redirect } from '@sveltejs/kit';
import { message, superValidate, setError } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import type { PageServerLoad, Actions } from './$types';
import { createLocalDynamicSchema } from './schema';
import { EmailService } from '$lib/services/email-service';

export const load: PageServerLoad = async ({ params, locals }) => {
    try {
        const { slug } = params;


        // Récupérer les informations de la boutique
        const { data: shop, error: shopError } = await locals.supabase
            .from('shops')
            .select('id, name, bio, slug, logo_url, is_custom_accepted')
            .eq('slug', slug)
            .eq('is_active', true)
            .single();

        if (shopError) {
            throw error(500, 'Erreur serveur lors du chargement de la boutique');
        }

        if (!shop) {

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
                throw error(500, 'Erreur lors du chargement des champs du formulaire');
            }

            customFields = formFields || [];

        } else {

        }

        // Récupérer les disponibilités de la boutique
        const { data: availabilities, error: availabilitiesError } = await locals.supabase
            .from('availabilities')
            .select('day, is_open')
            .eq('shop_id', shop.id);

        if (availabilitiesError) {
            throw error(500, 'Erreur lors du chargement des disponibilités');
        }

        // Récupérer les indisponibilités de la boutique
        const { data: unavailabilities, error: unavailabilitiesError } = await locals.supabase
            .from('unavailabilities')
            .select('start_date, end_date')
            .eq('shop_id', shop.id);

        if (unavailabilitiesError) {
            throw error(500, 'Erreur lors du chargement des indisponibilités');
        }



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
        throw error(500, 'Erreur inattendue lors du chargement de la page');
    }
};

export const actions: Actions = {
    createCustomOrder: async ({ request, params, locals }) => {
        // Vérifier si c'est une erreur de rate limiting
        const rateLimitExceeded = request.headers.get('x-rate-limit-exceeded');
        if (rateLimitExceeded === 'true') {
            const rateLimitMessage = request.headers.get('x-rate-limit-message') || 'Trop de tentatives. Veuillez patienter.';


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
                .select('id, name, slug, logo_url, profiles(email)')
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
                    pickup_date: (() => {
                        // Convertir Date en string sans conversion de fuseau horaire
                        const date = new Date(pickup_date);
                        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                    })(), // Convertir Date en string
                    additional_information,
                    customization_data: transformedCustomizationData, // Utiliser les données transformées
                    total_amount: 0, // Prix à définir plus tard par le chef
                    product_name: 'Demande personnalisée',
                    status: 'pending'
                })
                .select()
                .single();

            if (orderError) {
                throw error(500, 'Erreur lors de la création de la commande');
            }

            try {
                await Promise.all([
                    EmailService.sendCustomRequestConfirmation({
                        customerEmail: customer_email,
                        customerName: customer_name,
                        shopName: shop.name,
                        shopLogo: shop.logo_url || undefined,
                        requestId: order.id.slice(0, 8),
                        orderUrl: `${process.env.PUBLIC_SITE_URL}/${slug}/order/${order.id}`,
                        date: new Date().toLocaleDateString("fr-FR")
                    }),

                    EmailService.sendCustomRequestNotification({
                        pastryEmail: shop.profiles.email,
                        customerName: customer_name,
                        customerEmail: customer_email,
                        customerInstagram: customer_instagram,
                        pickupDate: pickup_date.toLocaleDateString("fr-FR"),
                        requestId: order.id.slice(0, 8),
                        dashboardUrl: `${process.env.PUBLIC_SITE_URL}/dashboard/orders/${order.id}`,
                        date: new Date().toLocaleDateString("fr-FR")
                    })]);
            } catch (e) { }

            return message(form, { redirectTo: `/${slug}/order/${order.id}` })

        } catch (err) {

            // ✅ CORRECTION - Toujours retourner le form pour Superforms
            const tempSchema = createLocalDynamicSchema([]);
            const form = await superValidate(request, zod(tempSchema));
            setError(form, '', 'Erreur serveur inattendue. Veuillez réessayer.');
            return { form };
        }
    }
};
