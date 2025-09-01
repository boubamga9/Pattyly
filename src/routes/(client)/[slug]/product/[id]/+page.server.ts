import { error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { superValidate, fail, message, setError } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { createLocalDynamicSchema } from './schema';

export const load: PageServerLoad = async ({ params, locals }) => {
    try {
        const { slug, id } = params;
        console.log('🔍 Loading product page:', { slug, id });

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

        // Récupérer le produit actif avec ses informations
        console.log('🔍 Fetching product with ID:', id, 'for shop:', shop.id);

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
            console.error('❌ Product error:', productError);
            console.error('❌ Product data:', product);
            throw error(404, 'Produit non trouvé');
        }

        // Si le produit n'a pas de formulaire, on utilise un formulaire par défaut
        if (!product.form_id) {
            console.log('⚠️ Product has no form_id, using default form');
            // Pas d'erreur, on continue avec un formulaire vide
        }

        console.log('✅ Product found:', { id: product.id, name: product.name, form_id: product.form_id });

        // Récupérer le formulaire personnalisé seulement s'il existe
        let customForm = null;
        let customFields: any[] = [];

        if (product.form_id) {
            const { data: formData, error: formError } = await locals.supabase
                .from('forms')
                .select('id, is_custom_form, title, description')
                .eq('shop_id', shop.id)
                .eq('id', product.form_id)
                .single();

            if (formError && formError.code !== 'PGRST116') {
                console.error('Error fetching custom form:', formError);
                throw error(500, 'Erreur lors du chargement du formulaire personnalisé');
            }

            customForm = formData;

            // Récupérer les champs du formulaire s'il existe
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
        } else {
            console.log('ℹ️ No custom form for this product, using basic order form');
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

    } catch (err) {
        console.error('💥 Unexpected error in product load:', err);
        throw error(500, 'Erreur inattendue lors du chargement du produit');
    }
};

export const actions: Actions = {
    createProductOrder: async ({ request, params, locals, fetch }) => {
        console.log('🔍 createProductOrder action called');

        // Vérifier si c'est une erreur de rate limiting
        const rateLimitExceeded = request.headers.get('x-rate-limit-exceeded');
        if (rateLimitExceeded === 'true') {
            const rateLimitMessage = request.headers.get('x-rate-limit-message') || 'Trop de tentatives. Veuillez patienter.';
            console.log('🚫 Rate limiting détecté dans createProductOrder:', rateLimitMessage);

            const tempSchema = createLocalDynamicSchema([]);
            const form = await superValidate(request, zod(tempSchema));
            setError(form, '', rateLimitMessage);
            return { form };
        }

        try {
            const { slug, id } = params;

            if (!id) {
                throw error(400, 'Paramètre produit manquant');
            }

            // Récupérer la boutique
            const { data: shop, error: shopError } = await locals.supabase
                .from('shops')
                .select('id, name, slug')
                .eq('slug', slug)
                .eq('is_active', true)
                .single();

            if (shopError || !shop) {
                throw error(404, 'Boutique non trouvée');
            }

            // Récupérer le produit
            const { data: product, error: productError } = await locals.supabase
                .from('products')
                .select(`
                    id,
                    name,
                    description,
                    base_price,
                    form_id
                `)
                .eq('id', id)
                .eq('shop_id', shop.id)
                .eq('is_active', true)
                .single();

            if (productError || !product) {
                throw error(404, 'Produit non trouvé');
            }

            // Récupérer les champs personnalisés
            let customFields: any[] = [];
            if (product.form_id) {
                const { data: formFields } = await locals.supabase
                    .from('form_fields')
                    .select('*')
                    .eq('form_id', product.form_id)
                    .order('order');
                customFields = formFields || [];
            } else {
                console.log('ℹ️ Aucun formulaire personnalisé pour ce produit');
            }

            // Validation dynamique
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

            // 🔐 Sécurité : forcer pickup_date → Date
            let selectedDate: string | null = null;
            try {
                selectedDate = new Date(pickup_date).toISOString().split('T')[0];
            } catch {
                return fail(400, { form, error: 'Date de retrait invalide' });
            }

            // Transformer les données de personnalisation - Garder les IDs pour la traçabilité
            const selectedOptions: Record<string, any> = {};
            Object.entries(customization_data || {}).forEach(([fieldId, value]) => {
                const field = customFields.find((f) => f.id === fieldId);
                if (!field) return;

                // Texte ou nombre
                if (['short-text', 'long-text', 'number'].includes(field.type)) {
                    selectedOptions[fieldId] = {
                        value: value,
                        label: field.label,
                        type: field.type,
                        price: 0
                    };
                }

                // Single-select
                else if (field.type === 'single-select' && Array.isArray(field.options)) {
                    const option = field.options.find((opt: any) => opt.label === value);
                    if (option) {
                        selectedOptions[fieldId] = {
                            value: option.label,
                            label: field.label,
                            type: field.type,
                            price: option.price || 0
                        };
                    }
                }

                // Multi-select
                else if (field.type === 'multi-select' && Array.isArray(value) && Array.isArray(field.options)) {
                    selectedOptions[fieldId] = {
                        values: value.map((optionLabel: string) => {
                            const option = field.options.find((opt: any) => opt.label === optionLabel);
                            return option ? { label: option.label, price: option.price || 0 } : null;
                        }).filter(Boolean),
                        label: field.label,
                        type: field.type,
                        price: value.reduce((sum: number, optionLabel: string) => {
                            const option = field.options.find((opt: any) => opt.label === optionLabel);
                            return sum + (option?.price || 0);
                        }, 0)
                    };
                }
            });

            // Calcul du prix total avec la nouvelle structure
            let totalPrice = product.base_price || 0;
            Object.values(selectedOptions).forEach((val: any) => {
                if (val?.price !== undefined) {
                    totalPrice += val.price || 0;
                }
            });

            console.log('selectedOptions', selectedOptions);
            console.log('totalPrice', totalPrice);

            // Préparer les données de commande
            const orderData = {
                productId: id,
                shopId: shop.id,
                selectedDate,
                customerName: customer_name,
                customerEmail: customer_email,
                customerPhone: customer_phone,
                customerInstagram: customer_instagram,
                additionalInfo: additional_information,
                selectedOptions,
                totalPrice,
                cakeName: product.name,
            };

            // Créer la session Stripe
            const response = await fetch('/api/create-payment-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData),
            });

            if (!response.ok) {
                throw error(500, 'Erreur lors de la création de la session de paiement');
            }

            const { sessionUrl } = await response.json();
            return message(form, { redirectTo: sessionUrl });

        } catch (err) {
            console.error('❌ Error in createProductOrder:', err);

            // ✅ CORRECTION - Toujours retourner le form pour Superforms
            const tempSchema = createLocalDynamicSchema([]);
            const form = await superValidate(request, zod(tempSchema));
            setError(form, '', 'Erreur serveur inattendue. Veuillez réessayer.');
            return { form };
        }
    }

};