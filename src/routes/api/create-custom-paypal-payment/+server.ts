import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
    try {
        const { orderId, shopSlug } = await request.json();

        console.log('🚀 [Custom PayPal] Received request:', { orderId, shopSlug });

        if (!orderId || !shopSlug) {
            console.error('❌ [Custom PayPal] Missing data');
            return json({ error: 'Données manquantes' }, { status: 400 });
        }

        // Récupérer la commande
        const { data: order, error: orderError } = await locals.supabase
            .from('orders')
            .select('*, shops(name, slug)')
            .eq('id', orderId)
            .single();

        console.log('🔍 [Custom PayPal] Order query result:', { order, orderError });

        if (orderError || !order) {
            console.error('❌ [Custom PayPal] Order not found');
            return json({ error: 'Commande non trouvée' }, { status: 404 });
        }

        console.log('📋 [Custom PayPal] Order details:', {
            id: order.id,
            product_id: order.product_id,
            status: order.status,
            total_amount: order.total_amount
        });

        // Vérifier que c'est une commande custom avec statut "quoted"
        if (order.product_id || order.status !== 'quoted') {
            console.error('❌ [Custom PayPal] Invalid order:', {
                hasProductId: !!order.product_id,
                status: order.status
            });
            return json({ error: 'Commande invalide' }, { status: 400 });
        }

        // Vérifier que le prix est défini
        if (!order.total_amount || order.total_amount <= 0) {
            console.error('❌ [Custom PayPal] No price defined:', order.total_amount);
            return json({ error: 'Prix non défini' }, { status: 400 });
        }

        // Calculer l'acompte (50% du prix total)
        const depositAmount = order.total_amount * 0.5;

        // Récupérer le compte PayPal de la boutique
        const { data: paypalAccountData, error: paypalError } = await locals.supabase
            .rpc('get_paypal_account_for_shop', { shop_uuid: order.shop_id });

        if (paypalError || !paypalAccountData || !Array.isArray(paypalAccountData) || paypalAccountData.length === 0) {
            return json({ error: 'Boutique non configurée pour les paiements PayPal' }, { status: 400 });
        }

        const paypalMerchantId = paypalAccountData[0].paypal_merchant_id;

        // Créer une pending order pour stocker les données
        console.log('🔄 [Custom PayPal] Creating pending order...');

        const { data: pendingOrder, error: pendingOrderError } = await locals.supabaseServiceRole
            .from('pending_orders')
            .insert({
                order_data: {
                    orderId,
                    shopSlug,
                    shopId: order.shop_id,
                    totalAmount: order.total_amount,
                    depositAmount,
                    customerName: order.customer_name,
                    customerEmail: order.customer_email,
                    customerPhone: order.customer_phone,
                    customerInstagram: order.customer_instagram,
                    pickupDate: order.pickup_date,
                    customizationData: order.customization_data,
                    additionalInformation: order.additional_information,
                    inspirationPhotos: order.inspiration_photos,
                    productName: order.product_name,
                    isCustomOrder: true
                }
            })
            .select('id, order_data')
            .single();

        console.log('📝 [Custom PayPal] Pending order result:', { pendingOrder, pendingOrderError });

        if (pendingOrderError || !pendingOrder) {
            console.error('❌ [Custom PayPal] Failed to create pending order:', pendingOrderError);
            return json({ error: 'Erreur lors de la création de la commande temporaire' }, { status: 500 });
        }

        // Créer la commande PayPal
        const { paypalClient } = await import('$lib/paypal/client');
        const paypalOrder = await paypalClient.createOrder({
            intent: 'CAPTURE',
            purchase_units: [{
                reference_id: pendingOrder.id,
                amount: {
                    currency_code: 'EUR',
                    value: depositAmount.toFixed(2)
                },
                payee: { merchant_id: paypalMerchantId }
            }],
            application_context: {
                return_url: `${request.headers.get('origin')}/${shopSlug}/order/paypal-return?pendingId=${pendingOrder.id}`,
                cancel_url: `${request.headers.get('origin')}/${shopSlug}/order/${orderId}`,
                user_action: 'PAY_NOW',
                shipping_preference: 'NO_SHIPPING',
                landing_page: 'BILLING'
            }
        });

        // Mettre à jour la pending order avec l'ID PayPal
        await locals.supabaseServiceRole
            .from('pending_orders')
            .update({
                order_data: {
                    ...pendingOrder.order_data,
                    paypal_order_id: paypalOrder.id
                }
            })
            .eq('id', pendingOrder.id);

        return json({ approvalUrl: paypalOrder.links.find(link => link.rel === 'approve')?.href });

    } catch (error) {
        console.error('❌ Error creating custom PayPal payment:', error);
        return json({ error: 'Erreur interne' }, { status: 500 });
    }
};
