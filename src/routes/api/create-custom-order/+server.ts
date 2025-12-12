import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { checkOrderLimit } from '$lib/utils/order-limits';
import { sendNewOrderPushNotification } from '$lib/services/push-notification-service-server';
import { PUBLIC_SITE_URL } from '$env/static/public';

export const POST: RequestHandler = async ({ request, locals }) => {
    try {
        const orderData = await request.json();

        // Validation des données
        if (!orderData.shopId || !orderData.customerName || !orderData.customerEmail || !orderData.selectedDate) {
            return json({ error: 'Données manquantes' }, { status: 400 });
        }

        // Récupérer le shop pour obtenir le profile_id, slug et name
        const { data: shop, error: shopError } = await locals.supabase
            .from('shops')
            .select('id, profile_id, slug, name')
            .eq('id', orderData.shopId)
            .single();

        if (shopError || !shop) {
            return json({ error: 'Boutique non trouvée' }, { status: 404 });
        }

        // Vérifier la limite de commandes
        console.log('🔍 [API Custom Order] Checking order limit before creating order...');
        const orderLimitStats = await checkOrderLimit(shop.id, shop.profile_id, locals.supabase);
        if (orderLimitStats.isLimitReached) {
            console.warn('🚫 [API Custom Order] Order creation blocked - limit reached:', {
                shopId: shop.id,
                orderCount: orderLimitStats.orderCount,
                orderLimit: orderLimitStats.orderLimit,
                plan: orderLimitStats.plan
            });
            return json({
                error: `Limite de commandes atteinte (${orderLimitStats.orderCount}/${orderLimitStats.orderLimit} ce mois-ci). Passez au plan supérieur pour continuer.`
            }, { status: 403 });
        }
        console.log('✅ [API Custom Order] Order limit check passed, proceeding with order creation');

        // Vérifier si une commande similaire existe déjà (protection contre les doublons)
        const { data: existingOrder, error: checkError } = await locals.supabase
            .from('orders')
            .select('id')
            .eq('shop_id', orderData.shopId)
            .eq('customer_email', orderData.customerEmail)
            .eq('pickup_date', orderData.selectedDate)
            .eq('status', 'pending')
            .is('product_id', null) // Commandes custom uniquement
            .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Dans les 5 dernières minutes
            .single();

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
            return json({ error: 'Erreur lors de la vérification' }, { status: 500 });
        }

        // Si une commande similaire existe déjà, retourner l'ID existant
        if (existingOrder) {
            return json({ success: true, orderId: existingOrder.id });
        }

        // Transformer les données de personnalisation (IDs → Labels)
        const transformedCustomizationData: Record<string, string | string[]> = {};
        if (orderData.selectedOptions && Object.keys(orderData.selectedOptions).length > 0) {
            // Récupérer le formulaire custom de la boutique
            const { data: customForm } = await locals.supabase
                .from('forms')
                .select('id')
                .eq('shop_id', orderData.shopId)
                .eq('is_custom_form', true)
                .single();

            if (customForm?.id) {
                // Récupérer les champs du formulaire custom pour mapper les IDs vers les labels
                const { data: customFields } = await locals.supabase
                    .from('form_fields')
                    .select('id, label, type')
                    .eq('form_id', customForm.id)
                    .order('order');

                if (customFields) {
                    customFields.forEach((field: { id: string; label: string; type: string }) => {
                        const fieldValue = orderData.selectedOptions[field.id];
                        if (fieldValue) {
                            // Stocker directement avec le libellé au lieu de l'ID
                            transformedCustomizationData[field.label] = fieldValue;
                        }
                    });
                }
            }
        }

        // Créer la commande dans la base de données
        const { data: order, error: orderError } = await locals.supabase
            .from('orders')
            .insert({
                shop_id: orderData.shopId,
                product_id: null, // Pas de produit pour les commandes custom
                customer_name: orderData.customerName,
                customer_email: orderData.customerEmail,
                customer_phone: orderData.customerPhone || null,
                customer_instagram: orderData.customerInstagram || null,
                pickup_date: orderData.selectedDate,
                additional_information: orderData.additionalInfo || null,
                customization_data: transformedCustomizationData,
                status: 'pending',
                total_amount: orderData.estimatedPrice || 0,
                product_name: 'Demande personnalisée'
            })
            .select()
            .single();

        if (orderError) {
            return json({ error: 'Erreur lors de la création de la commande' }, { status: 500 });
        }

        // ✅ Tracking: Order received (custom order) - fire-and-forget pour ne pas bloquer
        const { logEventAsync, Events } = await import('$lib/utils/analytics');
        logEventAsync(
            locals.supabaseServiceRole,
            Events.ORDER_RECEIVED,
            {
                order_id: order.id,
                shop_id: orderData.shopId,
                total_amount: orderData.estimatedPrice || 0,
                order_type: 'custom_order'
            },
            null, // Client orders don't have userId
            `/api/create-custom-order`
        );

        // Envoyer la notification push au pâtissier (non bloquant)
        const isDev = import.meta.env?.DEV;
        if (isDev) {
            console.log('🔔 [API Custom Order] Tentative d\'envoi de notification push');
            console.log('   - Shop profile_id:', shop.profile_id);
            console.log('   - Order ID:', order.id);
        }

        if (shop.profile_id) {
            if (isDev) {
                console.log('✅ [API Custom Order] Profile ID présent, envoi de la notification...');
            }
            await sendNewOrderPushNotification(
                locals.supabaseServiceRole,
                shop.profile_id,
                {
                    orderId: order.id,
                    customerName: orderData.customerName,
                    productName: 'Demande personnalisée',
                    pickupDate: orderData.selectedDate,
                    dashboardUrl: `${PUBLIC_SITE_URL}/dashboard/orders/${order.id}`,
                }
            ).catch((error) => {
                console.error('❌ [API Custom Order] Erreur lors de l\'envoi de la notification push (non bloquant):', error);
            });
        } else {
            console.warn('⚠️ [API Custom Order] Pas de profile_id, notification push non envoyée');
        }

        return json({ success: true, orderId: order.id, redirectUrl: `/${orderData.shopSlug}/order/${order.id}` });
    } catch (error) {
        return json({ error: 'Erreur lors de la création de la commande' }, { status: 500 });
    }
}; 