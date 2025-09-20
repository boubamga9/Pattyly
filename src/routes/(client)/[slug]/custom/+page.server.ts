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
            .select('day, is_open')
            .eq('shop_id', shop.id);
        if (availabilitiesError) throw error(500, 'Erreur lors du chargement des disponibilités');

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
