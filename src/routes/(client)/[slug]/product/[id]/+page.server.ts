import { error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { superValidate, fail, message } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { createLocalDynamicSchema } from './schema';

export const load: PageServerLoad = async ({ params, locals }) => {
    const { slug, id } = params;

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

    // Récupérer le produit actif avec ses informations
    const { data: product, error: productError } = await locals.supabase
        .from('products')
        .select(`
			id,
			name,
			description,
			base_price,
			form_id,
            image_url,
            min_days_notice,
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

    if (!product.form_id) {
        throw error(404, 'Produit non trouvé');
    }

    // Récupérer le formulaire personnalisé
    const { data: customForm, error: formError } = await locals.supabase
        .from('forms')
        .select('id, is_custom_form, title, description')
        .eq('shop_id', shop.id)
        .eq('id', product.form_id)
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
    const { data: availabilities } = await locals.supabase
        .from('availabilities')
        .select('day, is_open')
        .eq('shop_id', shop.id);

    // Récupérer les indisponibilités de la boutique
    const { data: unavailabilities } = await locals.supabase
        .from('unavailabilities')
        .select('start_date, end_date')
        .eq('shop_id', shop.id);

    // Créer le schéma dynamique basé sur les champs configurés
    const dynamicSchema = createLocalDynamicSchema(customFields);

    return {
        shop,
        product,
        customForm,
        customFields,
        availabilities: availabilities || [],
        unavailabilities: unavailabilities || [],
        form: await superValidate(zod(dynamicSchema))
    };
};

export const actions: Actions = {
    createProductOrder: async ({ request, params, locals }) => {
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

            // Récupérer le produit actif avec ses informations
            const { data: product, error: productError } = await locals.supabase
                .from('products')
                .select(`
        id,
        name,
        description,
        base_price,
        form_id
    `)
                .eq('id', params.id)
                .eq('shop_id', shop.id)
                .eq('is_active', true)
                .single();

            if (productError || !product) {
                throw error(404, 'Produit non trouvé');
            }


            let customFields: any[] = [];
            if (product.form_id) {
                const { data: formFields } = await locals.supabase
                    .from('form_fields')
                    .select('*')
                    .eq('form_id', product.form_id)
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
            const selectedOptions: Record<string, any> = {};
            Object.entries(customization_data).forEach(([fieldId, value]) => {
                const field = customFields.find((f) => f.id === fieldId);
                if (!field) return;

                // Cas texte / nombre → garder la valeur brute
                if (field.type === 'short-text' || field.type === 'long-text' || field.type === 'number') {
                    selectedOptions[field.label] = value;
                }

                // Cas single-select → un objet { price, value }
                else if (field.type === 'single-select') {
                    const option = field.options.find((opt: any) => opt.label === value);
                    if (option) {
                        selectedOptions[field.label] = {
                            value: option.label,
                            price: option.price || 0
                        };
                    }
                }

                // Cas multi-select → tableau d'objets { price, value }
                else if (field.type === 'multi-select' && Array.isArray(value)) {
                    selectedOptions[field.label] = value
                        .map((optionLabel: string) => {
                            const option = field.options.find((opt: any) => opt.label === optionLabel);
                            if (option) {
                                return { value: option.label, price: option.price || 0 };
                            }
                            return null;
                        })
                        .filter(Boolean); // enlever les null si jamais
                }
            });

            // Calculer le prix total (prix de base + options)
            let totalPrice = product.base_price || 0;
            Object.values(selectedOptions).forEach((val: any) => {
                if (Array.isArray(val)) {
                    // multi-select
                    val.forEach((opt) => {
                        totalPrice += opt.price || 0;
                    });
                } else if (typeof val === 'object' && val?.price !== undefined) {
                    // single-select
                    totalPrice += val.price || 0;
                }
            });



            try {
                // Préparer les données de la commande
                const orderData = {
                    productId: params.id,
                    shopId: shop.id,
                    selectedDate: pickup_date.toISOString().split('T')[0],
                    customerName: customer_name,
                    customerEmail: customer_email,
                    customerPhone: customer_phone,
                    customerInstagram: customer_instagram,
                    additionalInfo: additional_information,
                    selectedOptions,
                    totalPrice,
                    cakeName: product.name,
                };

                // Créer la session de paiement Stripe
                const response = await fetch('/api/create-payment-session', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(orderData),
                });

                if (!response.ok) {
                    throw new Error('Erreur lors de la création de la session de paiement');
                }

                const { sessionUrl } = await response.json();

                return message(form, { redirectTo: sessionUrl })

            } catch (error) {
                console.error('Erreur:', error);

            }



        } catch (err) {
            console.error('Error in createCustomOrder:', err);
            throw error(500, 'Erreur serveur');
        }
    }
};