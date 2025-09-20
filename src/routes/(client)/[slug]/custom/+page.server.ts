import { error, fail } from '@sveltejs/kit';
import { message, superValidate, setError } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import type { PageServerLoad, Actions } from './$types';
import { createLocalDynamicSchema } from './schema';
import { sanitizeFileName } from '$lib/utils/filename-sanitizer';
import { EmailService } from '$lib/services/email-service';
import { PUBLIC_SITE_URL } from '$env/static/public';

export const load: PageServerLoad = async ({ params, locals }) => {
    try {
        const { slug } = params;

        const { data: shop, error: shopError } = await locals.supabase
            .from('shops')
            .select('id, name, bio, slug, logo_url, is_custom_accepted')
            .eq('slug', slug)
            .eq('is_active', true)
            .single();

        if (shopError) throw error(500, 'Erreur serveur lors du chargement de la boutique');
        if (!shop) throw error(404, 'Boutique non trouvée');
        if (!shop.is_custom_accepted) throw error(404, 'Demandes personnalisées non disponibles');

        const { data: customForm, error: formError } = await locals.supabase
            .from('forms')
            .select('id, title, description')
            .eq('shop_id', shop.id)
            .eq('is_custom_form', true)
            .single();

        if (formError && formError.code !== 'PGRST116') {
            throw error(500, 'Erreur lors du chargement du formulaire personnalisé');
        }

        let customFields: any[] = [];
        if (customForm) {
            const { data: formFields, error: fieldsError } = await locals.supabase
                .from('form_fields')
                .select('*')
                .eq('form_id', customForm.id)
                .order('order');
            if (fieldsError) throw error(500, 'Erreur lors du chargement des champs du formulaire');
            customFields = formFields || [];
        }

        const { data: availabilities, error: availabilitiesError } = await locals.supabase
            .from('availabilities')
            .select('day, is_open, daily_order_limit')
            .eq('shop_id', shop.id);
        if (availabilitiesError) throw error(500, 'Erreur lors du chargement des disponibilités');

        // Fonction optimisée pour obtenir les dates avec limite atteinte
        async function getDatesWithLimitReached(): Promise<Set<string>> {
            const datesWithLimitReached = new Set<string>();

            if (!availabilities) return datesWithLimitReached;

            // Collecter toutes les dates à vérifier en une fois
            const datesToCheck = new Set<string>();
            const today = new Date();

            for (const availability of availabilities) {
                if (availability.daily_order_limit && availability.is_open) {
                    // Calculer les 60 prochains jours pour cette disponibilité
                    for (let i = 0; i < 60; i++) {
                        const checkDate = new Date(today);
                        checkDate.setDate(today.getDate() + i);

                        // Vérifier si c'est le bon jour de la semaine
                        if (checkDate.getDay() === availability.day) {
                            const dateString = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
                            datesToCheck.add(dateString);
                        }
                    }
                }
            }

            if (datesToCheck.size === 0) return datesWithLimitReached;

            // Une seule requête pour récupérer toutes les commandes concernées
            const { data: orders, error: ordersError } = await locals.supabase
                .from('orders')
                .select('pickup_date')
                .eq('shop_id', shop.id)
                .in('status', ['pending', 'quoted', 'confirmed'])
                .in('pickup_date', Array.from(datesToCheck));

            if (ordersError) {
                console.error('Erreur lors du chargement des commandes:', ordersError);
                return datesWithLimitReached;
            }

            // Compter les commandes par date
            const ordersByDate = new Map<string, number>();
            orders?.forEach(order => {
                const count = ordersByDate.get(order.pickup_date) || 0;
                ordersByDate.set(order.pickup_date, count + 1);
            });

            // Vérifier les limites pour chaque date
            for (const availability of availabilities) {
                if (availability.daily_order_limit && availability.is_open) {
                    for (let i = 0; i < 60; i++) {
                        const checkDate = new Date(today);
                        checkDate.setDate(today.getDate() + i);

                        if (checkDate.getDay() === availability.day) {
                            const dateString = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
                            const orderCount = ordersByDate.get(dateString) || 0;

                            if (orderCount >= availability.daily_order_limit) {
                                datesWithLimitReached.add(dateString);
                            }
                        }
                    }
                }
            }

            return datesWithLimitReached;
        }

        const datesWithLimitReached = await getDatesWithLimitReached();

        const { data: unavailabilities, error: unavailabilitiesError } = await locals.supabase
            .from('unavailabilities')
            .select('start_date, end_date')
            .eq('shop_id', shop.id);
        if (unavailabilitiesError) throw error(500, 'Erreur lors du chargement des indisponibilités');

        const dynamicSchema = createLocalDynamicSchema(customFields);

        return {
            shop,
            customForm,
            customFields,
            availabilities: availabilities || [],
            unavailabilities: unavailabilities || [],
            datesWithLimitReached: Array.from(datesWithLimitReached),
            form: await superValidate(zod(dynamicSchema))
        };

    } catch (err) {
        throw error(500, 'Erreur inattendue lors du chargement de la page');
    }
};

export const actions: Actions = {
    createCustomOrder: async ({ request, params, locals }) => {
        console.log('🚀 createCustomOrder action appelée');
        try {
            const { slug } = params;

            const { data: shop, error: shopError } = await locals.supabase
                .from('shops')
                .select('id, name, slug, logo_url')
                .eq('slug', slug)
                .eq('is_active', true)
                .single();
            if (shopError || !shop) throw error(404, 'Boutique non trouvée');

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

            const formData = await request.formData();
            const inspirationFiles = formData.getAll('inspiration_photos') as File[];

            const dynamicSchema = createLocalDynamicSchema(customFields);
            const form = await superValidate(formData, zod(dynamicSchema));

            if (!form.valid) return fail(400, { form });

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
            let selectedDateObj: Date;
            try {
                selectedDateObj = new Date(pickup_date);
                // Utiliser les méthodes getFullYear, getMonth, getDate pour éviter les problèmes de fuseau horaire
                selectedDate = `${selectedDateObj.getFullYear()}-${String(selectedDateObj.getMonth() + 1).padStart(2, '0')}-${String(selectedDateObj.getDate()).padStart(2, '0')}`;
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
                    .in('status', ['pending', 'quoted', 'confirmed']);

                if (existingOrders && existingOrders.length >= availability.daily_order_limit) {
                    return fail(400, {
                        form,
                        error: `Limite quotidienne atteinte (${availability.daily_order_limit} commandes maximum ce jour)`
                    });
                }
            }

            const transformedCustomizationData: Record<string, any> = {};
            if (customization_data && Object.keys(customization_data).length > 0) {
                Object.entries(customization_data).forEach(([fieldId, value]) => {
                    const field = customFields.find(f => f.id === fieldId);
                    if (field) transformedCustomizationData[field.label] = value;
                });
            }

            let uploadedInspirationPhotos: string[] = [];
            if (inspirationFiles.length > 0) {
                for (let i = 0; i < inspirationFiles.length; i++) {
                    const photoFile = inspirationFiles[i];
                    if (photoFile && photoFile.size > 0) {
                        const arrayBuffer = await photoFile.arrayBuffer();
                        const buffer = Buffer.from(arrayBuffer);

                        // Generate a temporary order ID for folder organization
                        const tempOrderId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

                        // Sanitize the filename
                        const sanitizedFileName = sanitizeFileName(photoFile.name);
                        const fileName = `${tempOrderId}/inspiration-${i + 1}-${sanitizedFileName}`;

                        const { error: uploadError } = await locals.supabase.storage
                            .from('inspiration-images')
                            .upload(fileName, buffer, {
                                contentType: photoFile.type,
                                cacheControl: '3600',
                                upsert: false
                            });

                        if (uploadError) {
                            console.error('Erreur upload photo inspiration:', uploadError);
                            continue;
                        }

                        const { data: urlData } = locals.supabase.storage
                            .from('inspiration-images')
                            .getPublicUrl(fileName);

                        if (urlData?.publicUrl) uploadedInspirationPhotos.push(urlData.publicUrl);
                    }
                }
            }

            const { data: order, error: orderError } = await locals.supabase
                .from('orders')
                .insert({
                    shop_id: shop.id,
                    customer_name,
                    customer_email,
                    customer_phone,
                    customer_instagram,
                    pickup_date: (() => {
                        const date = new Date(pickup_date);
                        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                    })(),
                    additional_information,
                    customization_data: transformedCustomizationData,
                    inspiration_photos: uploadedInspirationPhotos,
                    total_amount: 0,
                    product_name: 'Demande personnalisée',
                    status: 'pending'
                })
                .select()
                .single();
            if (orderError) throw error(500, 'Erreur lors de la création de la commande');

            try {
                // Get shop owner email for notification
                const { data: ownerEmailData, error: emailError } = await locals.supabase
                    .rpc('get_shop_owner_email', { shop_uuid: shop.id }) as any;

                const pastryEmail = ownerEmailData || 'admin@pattyly.com'; // Fallback email

                await Promise.all([
                    EmailService.sendCustomRequestConfirmation({
                        customerEmail: customer_email,
                        customerName: customer_name,
                        shopName: shop.name,
                        shopLogo: shop.logo_url || undefined,
                        requestId: order.id.slice(0, 8),
                        orderUrl: `${PUBLIC_SITE_URL}/${slug}/order/${order.id}`,
                        date: new Date().toLocaleDateString("fr-FR")
                    }),
                    EmailService.sendCustomRequestNotification({
                        pastryEmail: pastryEmail,
                        customerName: customer_name,
                        customerEmail: customer_email,
                        customerInstagram: customer_instagram,
                        pickupDate: pickup_date.toLocaleDateString("fr-FR"),
                        requestId: order.id.slice(0, 8),
                        dashboardUrl: `${PUBLIC_SITE_URL}/dashboard/orders/${order.id}`,
                        date: new Date().toLocaleDateString("fr-FR")
                    })
                ]);
            } catch (e) { }

            return message(form, { redirectTo: `/${slug}/order/${order.id}` });

        } catch (err) {
            console.error('Erreur dans createCustomOrder:', err);
            const tempSchema = createLocalDynamicSchema([]);
            const form = await superValidate(request, zod(tempSchema));
            setError(form, '', 'Erreur serveur inattendue. Veuillez réessayer.');
            return { form };
        }
    }
};
