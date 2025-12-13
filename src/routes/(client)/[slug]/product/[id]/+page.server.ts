import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { superValidate, fail, message, setError } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { createLocalDynamicSchema } from './schema';
import { checkOrderLimit } from '$lib/utils/order-limits';

export const load: PageServerLoad = async ({ params, locals, url }) => {
    try {
        const { slug, id } = params;

        // Validation : vérifier que id est un UUID valide
        // Cela évite les erreurs si sw.js ou d'autres fichiers sont routés par erreur
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
            console.error('❌ Invalid product ID format:', id);
            throw error(404, 'Produit non trouvé');
        }

        // ✅ OPTIMISÉ : Un seul appel DB pour toutes les données
        const { data: productData, error: dbError } = await (locals.supabaseServiceRole as any).rpc('get_order_data', {
            p_slug: slug,
            p_product_id: id
        });

        if (dbError) {
            console.error('❌ Error fetching product data:', dbError);
            throw error(500, 'Erreur serveur lors du chargement de la boutique');
        }

        if (!productData) {
            console.error('❌ productData is null for slug:', slug, 'product_id:', id);
            throw error(404, 'Boutique non trouvée');
        }

        const { shop, product, customForm, customFields, availabilities, unavailabilities, datesWithLimitReached } = productData;

        console.log('✅ productData received:', {
            hasShop: !!shop,
            shopId: shop?.id,
            shopIsVisible: shop?.is_visible,
            shopIsActive: shop?.is_active,
            hasProduct: !!product
        });

        if (!shop) {
            console.error('❌ shop is null in productData');
            throw error(404, 'Boutique non trouvée');
        }

        if (!product) {
            console.error('❌ product is null for product_id:', id);
            throw error(404, 'Produit non trouvé');
        }

        // Vérifier la visibilité (basée uniquement sur is_active)
        if (!shop.is_visible && !url.searchParams.get('preview')) {
            console.error('❌ shop is not visible. is_visible:', shop.is_visible, 'is_active:', shop.is_active);
            throw error(404, 'Boutique non trouvée');
        }

        // ✅ OPTIMISÉ : profile_id est maintenant retourné par le RPC get_order_data
        // Vérifier la limite de commandes (seulement si on a réussi à récupérer le profile_id)
        let orderLimitStats = null;
        if (shop.profile_id) {
            try {
                orderLimitStats = await checkOrderLimit(shop.id, shop.profile_id, locals.supabaseServiceRole);
            } catch (limitError) {
                console.error('Error checking order limit:', limitError);
                // Ne pas bloquer la page si la vérification de limite échoue
            }
        }

        // Les customizations sont chargées dans le layout parent

        // Create dynamic schema based on configured fields
        const dynamicSchema = createLocalDynamicSchema(customFields || []);

        return {
            shop,
            product,
            customForm,
            customFields: customFields || [],
            availabilities: availabilities || [],
            unavailabilities: unavailabilities || [],
            datesWithLimitReached: datesWithLimitReached || [],
            orderLimitStats,
            form: await superValidate(zod(dynamicSchema))
        };

    } catch (err) {
        console.error('Error in product load:', err);
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

            const formData = await request.formData();

            // ✅ OPTIMISÉ : Récupérer shopId et productId depuis formData (passés par le frontend)
            const shopId = formData.get('shopId') as string;
            const productId = formData.get('productId') as string || id; // Fallback sur id si non fourni

            if (!shopId || !productId) {
                throw error(400, 'Données manquantes');
            }

            // Get shop (vérification de sécurité : shop existe, est actif, et correspond au slug)
            const { data: shop, error: shopError } = await locals.supabase
                .from('shops')
                .select('id, name, slug, profile_id')
                .eq('id', shopId)
                .eq('slug', slug) // ✅ SÉCURITÉ : Vérifier que shopId correspond au slug
                .eq('is_active', true)
                .single();

            if (shopError || !shop) {
                throw error(404, 'Boutique non trouvée');
            }

            // Vérifier la limite de commandes
            console.log('🔍 [Product Order] Checking order limit before creating order...');
            const orderLimitStats = await checkOrderLimit(shop.id, shop.profile_id, locals.supabase);
            if (orderLimitStats.isLimitReached) {
                console.warn('🚫 [Product Order] Order creation blocked - limit reached:', {
                    shopId: shop.id,
                    shopName: shop.name,
                    orderCount: orderLimitStats.orderCount,
                    orderLimit: orderLimitStats.orderLimit,
                    plan: orderLimitStats.plan
                });
                const tempSchema = createLocalDynamicSchema([]);
                const form = await superValidate(request, zod(tempSchema));
                setError(form, '', `Limite de commandes atteinte (${orderLimitStats.orderCount}/${orderLimitStats.orderLimit} ce mois-ci). Passez au plan supérieur pour continuer.`);
                return { form };
            }
            console.log('✅ [Product Order] Order limit check passed, proceeding with order creation');

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
                .eq('id', productId)
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
            }

            // Dynamic validation
            const dynamicSchema = createLocalDynamicSchema(customFields);
            const form = await superValidate(formData, zod(dynamicSchema));

            if (!form.valid) {
                return fail(400, { form });
            }

            const {
                customer_name,
                customer_email,
                customer_phone,
                customer_instagram,
                pickup_date,
                pickup_time,
                additional_information,
                customization_data
            } = form.data;

            // 🔍 LOG: Date reçue du front
            console.log('📅 [Product Order Backend] Received pickup_date:', {
                value: pickup_date,
                type: typeof pickup_date,
                isDate: pickup_date instanceof Date,
                constructor: pickup_date?.constructor?.name
            });

            // 🔐 Security: force pickup_date → Date (without timezone conversion)
            let selectedDate: string | null = null;
            let selectedDateObj: Date;
            try {
                selectedDateObj = new Date(pickup_date);
                console.log('📅 [Product Order Backend] Date object created:', {
                    iso: selectedDateObj.toISOString(),
                    utc: selectedDateObj.toUTCString(),
                    local: selectedDateObj.toString(),
                    getDate: selectedDateObj.getDate(),
                    getUTCDate: selectedDateObj.getUTCDate()
                });

                // Utiliser les méthodes getFullYear, getMonth, getDate pour éviter les problèmes de fuseau horaire
                selectedDate = `${selectedDateObj.getFullYear()}-${String(selectedDateObj.getMonth() + 1).padStart(2, '0')}-${String(selectedDateObj.getDate()).padStart(2, '0')}`;
                console.log('📅 [Product Order Backend] Final selectedDate:', selectedDate);
            } catch {
                return fail(400, { form, error: 'Date de retrait invalide' });
            }

            // Vérifier la limite quotidienne de commandes
            const pickupDay = selectedDateObj.getDay();
            const { data: availability } = await locals.supabase
                .from('availabilities')
                .select('daily_order_limit')
                .eq('shop_id', shop.id)
                .eq('day', pickupDay)
                .single();

            if (availability?.daily_order_limit) {
                // Compter les commandes existantes pour cette date
                const { data: existingOrders } = await locals.supabase
                    .from('orders')
                    .select('id')
                    .eq('shop_id', shop.id)
                    .eq('pickup_date', selectedDate)
                    .in('status', ['pending', 'quoted', 'confirmed', 'to_verify']);

                if (existingOrders && existingOrders.length >= availability.daily_order_limit) {
                    return fail(400, {
                        form,
                        error: `Limite quotidienne atteinte (${availability.daily_order_limit} commandes maximum ce jour)`
                    });
                }
            }

            // Transform customization data - Utiliser le label comme clé (compatible avec checkout-handlers)
            const selectedOptions: Record<string, any> = {};
            Object.entries(customization_data || {}).forEach(([fieldId, value]) => {
                const field = customFields.find((f) => f.id === fieldId);
                if (!field) return;

                // Utiliser field.label comme clé (pas fieldId)
                const key = field.label;

                // Text or number
                if (['short-text', 'long-text', 'number'].includes(field.type)) {
                    selectedOptions[key] = {
                        value: value,
                        type: field.type,
                        price: 0,
                        fieldId: fieldId,
                        fieldType: field.type
                    };
                }

                // Single-select
                else if (field.type === 'single-select' && Array.isArray(field.options)) {
                    const option = field.options.find((opt: any) => opt.label === value);
                    if (option) {
                        selectedOptions[key] = {
                            value: option.label,
                            type: field.type,
                            price: option.price || 0,
                            fieldId: fieldId,
                            fieldType: field.type
                        };
                    }
                }

                // Multi-select
                else if (field.type === 'multi-select' && Array.isArray(value) && Array.isArray(field.options)) {
                    selectedOptions[key] = {
                        values: value.map((optionLabel: string) => {
                            const option = field.options.find((opt: any) => opt.label === optionLabel);
                            return option ? { label: option.label, price: option.price || 0 } : null;
                        }).filter(Boolean),
                        type: field.type,
                        price: value.reduce((sum: number, optionLabel: string) => {
                            const option = field.options.find((opt: any) => opt.label === optionLabel);
                            return sum + (option?.price || 0);
                        }, 0),
                        fieldId: fieldId,
                        fieldType: field.type
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




            // Générer un order_ref unique avec la fonction SQL
            const { data: orderRefData, error: orderRefError } = await locals.supabase
                .rpc('generate_order_ref');

            if (orderRefError || !orderRefData) {
                console.error('Error generating order_ref:', orderRefError);
                return fail(500, { form, error: 'Erreur lors de la génération de la référence' });
            }

            const order_ref = orderRefData;
            console.log('🆔 [Product Order] Generated order_ref:', order_ref);
            console.log('🕐 [Product Order] pickup_time value:', form.pickup_time);

            // Créer la pending_order avec order_data
            const orderData = {
                shop_id: shop.id,
                product_id: id,
                customer_name,
                customer_email,
                customer_phone,
                customer_instagram,
                pickup_date: selectedDate,
                pickup_time: pickup_time,
                additional_information,
                customization_data: selectedOptions,
                total_amount: totalPrice,
                product_name: product.name,
                order_ref
            };

            console.log('📦 [Product Order] orderData before save:', JSON.stringify(orderData, null, 2));

            const { error: pendingOrderError } = await locals.supabase
                .from('pending_orders')
                .insert({
                    order_data: orderData,
                    order_ref
                });

            if (pendingOrderError) {
                console.error('Error creating pending order:', pendingOrderError);
                return fail(500, { form, error: 'Erreur lors de la création de la commande' });
            }

            console.log('✅ [Product Order] Pending order created with order_ref:', order_ref);

            // Retourner le message de redirection pour le client
            return message(form, {
                success: true,
                redirectTo: `/${slug}/product/${id}/checkout/${order_ref}`
            });

        } catch (err) {
            console.error('Erreur lors de la création de la session de paiement:', err);
            //Always return the form for Superforms
            const tempSchema = createLocalDynamicSchema([]);
            const form = await superValidate(request, zod(tempSchema));
            setError(form, '', 'Erreur serveur inattendue. Veuillez réessayer.');
            return { form };
        }
    }
};