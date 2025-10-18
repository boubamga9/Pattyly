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

        // ✅ OPTIMISÉ : Un seul appel DB pour toutes les données
        const { data: customOrderData, error: dbError } = await (locals.supabaseServiceRole as any).rpc('get_order_data', {
            p_slug: slug
        });

        if (dbError) {
            console.error('Error fetching custom order data:', dbError);
            throw error(500, 'Erreur serveur lors du chargement de la boutique');
        }

        if (!customOrderData) {
            throw error(404, 'Boutique non trouvée');
        }

        const { shop, customForm, customFields, availabilities, unavailabilities, datesWithLimitReached } = customOrderData;

        // Vérifier la visibilité (essai, abonnement, admin)
        if (!shop.is_visible) {
            throw error(404, 'Boutique non trouvée');
        }

        if (!shop.is_custom_accepted) {
            throw error(404, 'Demandes personnalisées non disponibles');
        }

        // Les customizations sont chargées dans le layout parent

        const dynamicSchema = createLocalDynamicSchema(customFields || []);

        return {
            shop,
            customForm,
            customFields: customFields || [],
            availabilities: availabilities || [],
            unavailabilities: unavailabilities || [],
            datesWithLimitReached: datesWithLimitReached || [],
            form: await superValidate(zod(dynamicSchema))
        };

    } catch (err) {
        console.error('Error in custom load:', err);
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

            console.log('🔍 [Custom Order] FormData keys:', Array.from(formData.keys()));
            console.log('🔍 [Custom Order] Inspiration files received:', inspirationFiles.length);
            inspirationFiles.forEach((file, index) => {
                console.log(`🔍 [Custom Order] File ${index}:`, {
                    name: file.name,
                    size: file.size,
                    type: file.type
                });
            });

            const dynamicSchema = createLocalDynamicSchema(customFields);
            const form = await superValidate(formData, zod(dynamicSchema));

            if (!form.valid) return fail(400, { form });

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

            // 🔍 LOG: Date et heure reçues du front
            console.log('📅 [Custom Order Backend] Received pickup_date:', {
                value: pickup_date,
                type: typeof pickup_date,
                isDate: pickup_date instanceof Date,
                constructor: pickup_date?.constructor?.name
            });
            console.log('🕐 [Custom Order Backend] Received pickup_time:', {
                value: pickup_time,
                type: typeof pickup_time
            });

            // 🔐 Security: force pickup_date → Date (without timezone conversion)
            let selectedDate: string | null = null;
            let selectedDateObj: Date;
            try {
                selectedDateObj = new Date(pickup_date);
                console.log('📅 [Custom Order Backend] Date object created:', {
                    iso: selectedDateObj.toISOString(),
                    utc: selectedDateObj.toUTCString(),
                    local: selectedDateObj.toString(),
                    getDate: selectedDateObj.getDate(),
                    getUTCDate: selectedDateObj.getUTCDate()
                });

                // Utiliser les méthodes getFullYear, getMonth, getDate pour éviter les problèmes de fuseau horaire
                selectedDate = `${selectedDateObj.getFullYear()}-${String(selectedDateObj.getMonth() + 1).padStart(2, '0')}-${String(selectedDateObj.getDate()).padStart(2, '0')}`;
                console.log('📅 [Custom Order Backend] Final selectedDate:', selectedDate);
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

            const transformedCustomizationData: Record<string, any> = {};
            if (customization_data && Object.keys(customization_data).length > 0) {
                Object.entries(customization_data).forEach(([fieldId, value]) => {
                    const field = customFields.find(f => f.id === fieldId);
                    if (field) transformedCustomizationData[field.label] = value;
                });
            }

            let uploadedInspirationPhotos: string[] = [];
            console.log('🔍 [Custom Order] Starting photo upload process...');
            if (inspirationFiles.length > 0) {
                console.log(`🔍 [Custom Order] Processing ${inspirationFiles.length} inspiration files`);
                for (let i = 0; i < inspirationFiles.length; i++) {
                    const photoFile = inspirationFiles[i];
                    console.log(`🔍 [Custom Order] Processing file ${i}:`, {
                        name: photoFile.name,
                        size: photoFile.size,
                        type: photoFile.type
                    });
                    if (photoFile && photoFile.size > 0) {
                        const arrayBuffer = await photoFile.arrayBuffer();
                        const buffer = Buffer.from(arrayBuffer);

                        // Generate a temporary order ID for folder organization
                        const tempOrderId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

                        // Sanitize the filename
                        const sanitizedFileName = sanitizeFileName(photoFile.name);
                        const fileName = `${tempOrderId}/inspiration-${i + 1}-${sanitizedFileName}`;

                        const { error: uploadError } = await (locals.supabaseServiceRole as any).storage
                            .from('inspiration-images')
                            .upload(fileName, buffer, {
                                contentType: photoFile.type,
                                cacheControl: '3600',
                                upsert: false
                            });

                        if (uploadError) {
                            console.error('❌ [Custom Order] Erreur upload photo inspiration:', uploadError);
                            continue;
                        }

                        console.log(`✅ [Custom Order] Photo ${i} uploaded successfully:`, fileName);

                        const { data: urlData } = (locals.supabaseServiceRole as any).storage
                            .from('inspiration-images')
                            .getPublicUrl(fileName);

                        if (urlData?.publicUrl) {
                            uploadedInspirationPhotos.push(urlData.publicUrl);
                            console.log(`✅ [Custom Order] Photo ${i} URL generated:`, urlData.publicUrl);
                        } else {
                            console.error(`❌ [Custom Order] Failed to get URL for photo ${i}`);
                        }
                    }
                }
            }

            console.log(`🔍 [Custom Order] Final uploaded photos count: ${uploadedInspirationPhotos.length}`);
            console.log(`🔍 [Custom Order] Uploaded photos URLs:`, uploadedInspirationPhotos);

            const { data: order, error: orderError } = await locals.supabase
                .from('orders')
                .insert({
                    shop_id: shop.id,
                    customer_name,
                    customer_email,
                    customer_phone,
                    customer_instagram,
                    pickup_date: selectedDate,
                    pickup_time: pickup_time,
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
                console.log('📧 [Custom Order] Fetching pastry email for shop:', shop.id);
                const { data: ownerEmailData, error: emailError } = await locals.supabase
                    .rpc('get_shop_owner_email', { shop_uuid: shop.id }) as any;

                if (emailError) {
                    console.error('❌ [Custom Order] Error fetching owner email:', emailError);
                }

                const pastryEmail = ownerEmailData || 'admin@pattyly.com';
                console.log('📧 [Custom Order] Pastry email:', pastryEmail);

                console.log('📧 [Custom Order] Sending emails...');

                // Email au client
                await EmailService.sendCustomRequestConfirmation({
                    customerEmail: customer_email,
                    customerName: customer_name,
                    shopName: shop.name,
                    shopLogo: shop.logo_url || undefined,
                    requestId: order.id.slice(0, 8),
                    orderUrl: `${PUBLIC_SITE_URL}/${slug}/order/${order.id}`,
                    date: new Date().toLocaleDateString("fr-FR")
                });
                console.log('✅ [Custom Order] Client confirmation email sent');

                // Email au pâtissier
                await EmailService.sendCustomRequestNotification({
                    pastryEmail: pastryEmail,
                    customerName: customer_name,
                    customerEmail: customer_email,
                    customerInstagram: customer_instagram,
                    pickupDate: pickup_date,
                    pickupTime: pickup_time,
                    requestId: order.id.slice(0, 8),
                    dashboardUrl: `${PUBLIC_SITE_URL}/dashboard/orders/${order.id}`,
                    date: new Date().toLocaleDateString("fr-FR")
                });
                console.log('✅ [Custom Order] Pastry notification email sent');

            } catch (e) {
                console.error('❌ [Custom Order] Email sending error:', e);
            }

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
