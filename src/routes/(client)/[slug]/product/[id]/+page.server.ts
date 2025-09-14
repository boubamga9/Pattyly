import { error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { superValidate, fail, message, setError } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { createLocalDynamicSchema } from './schema';

export const load: PageServerLoad = async ({ params, locals, url }) => {
    try {
        const { slug, id } = params;


        // Get shop information
        const { data: shop, error: shopError } = await locals.supabase
            .from('shops')
            .select('id, name, bio, slug, logo_url, is_custom_accepted, is_active')
            .eq('slug', slug)
            .single();

        if (shopError) {
            throw error(500, 'Erreur serveur lors du chargement de la boutique');
        }

        if (!shop) {
            throw error(404, 'Boutique non trouvée');
        }

        if (!shop.is_active && !url.searchParams.get('preview')) {
            throw error(404, 'Boutique non trouvée');
        }


        // Get active product with its information


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

        // Get custom form only if it exists
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
                throw error(500, 'Erreur lors du chargement du formulaire personnalisé');
            }

            customForm = formData;

            // Get form fields if it exists
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
            }
        }

        // Get availabilities of the shop
        const { data: availabilities } = await locals.supabase
            .from('availabilities')
            .select('day, is_open')
            .eq('shop_id', shop.id);

        // Get unavailabilities of the shop
        const { data: unavailabilities } = await locals.supabase
            .from('unavailabilities')
            .select('start_date, end_date')
            .eq('shop_id', shop.id);


        // Create dynamic schema based on configured fields
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
        throw error(500, 'Erreur inattendue lors du chargement du produit');
    }
};

export const actions: Actions = {
    createProductOrder: async ({ request, params, locals, fetch }) => {


        // Check if it's a rate limiting error
        const rateLimitExceeded = request.headers.get('x-rate-limit-exceeded');
        if (rateLimitExceeded === 'true') {
            const rateLimitMessage = request.headers.get('x-rate-limit-message') || 'Trop de tentatives. Veuillez patienter.';


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

            // Get shop
            const { data: shop, error: shopError } = await locals.supabase
                .from('shops')
                .select('id, name, slug')
                .eq('slug', slug)
                .eq('is_active', true)
                .single();

            if (shopError || !shop) {
                throw error(404, 'Boutique non trouvée');
            }

            // Get product
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

            // Get custom fields
            let customFields: any[] = [];
            if (product.form_id) {
                const { data: formFields } = await locals.supabase
                    .from('form_fields')
                    .select('*')
                    .eq('form_id', product.form_id)
                    .order('order');
                customFields = formFields || [];
            } else {

            }

            // Dynamic validation
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

            // 🔐 Security: force pickup_date → Date (without timezone conversion)
            let selectedDate: string | null = null;
            try {
                const date = new Date(pickup_date);
                // Utiliser les méthodes getFullYear, getMonth, getDate pour éviter les problèmes de fuseau horaire
                selectedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            } catch {
                return fail(400, { form, error: 'Date de retrait invalide' });
            }

            // Transform customization data - Keep IDs for traceability
            const selectedOptions: Record<string, any> = {};
            Object.entries(customization_data || {}).forEach(([fieldId, value]) => {
                const field = customFields.find((f) => f.id === fieldId);
                if (!field) return;

                // Text or number
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

            // Calculate total price with the new structure
            let totalPrice = product.base_price || 0;
            Object.values(selectedOptions).forEach((val: any) => {
                if (val?.price !== undefined) {
                    totalPrice += val.price || 0;
                }
            });




            // Prepare order data
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

            // Create Stripe session
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

            //Always return the form for Superforms
            const tempSchema = createLocalDynamicSchema([]);
            const form = await superValidate(request, zod(tempSchema));
            setError(form, '', 'Erreur serveur inattendue. Veuillez réessayer.');
            return { form };
        }
    }

};