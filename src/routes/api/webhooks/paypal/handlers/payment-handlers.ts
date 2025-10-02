// handlers/payment-handlers.ts
import { error } from '@sveltejs/kit';
import { EmailService } from '$lib/services/email-service';
import { PUBLIC_SITE_URL } from '$env/static/public';

interface PayPalCaptureResource {
    id: string; // Capture ID
    status: string;
    amount: { currency_code: string; value: string };
    supplementary_data?: { related_ids?: { order_id?: string } };
    [key: string]: any;
}

export async function handlePaymentCaptureCompleted(
    resource: PayPalCaptureResource,
    locals: any
): Promise<void> {
    console.log('💰 Payment capture completed');

    try {
        const captureId = resource.id;
        const orderId = resource.supplementary_data?.related_ids?.order_id;

        if (!orderId) {
            console.error('❌ [PayPal Webhook] No order_id found in resource');
            return;
        }

        // Check si la commande existe déjà
        const { data: existingOrder } = await locals.supabaseServiceRole
            .from('orders')
            .select('id')
            .eq('paypal_order_id', orderId)
            .single();

        if (existingOrder) {
            console.log('✅ [PayPal Webhook] Order already exists, skipping creation:', existingOrder.id);
            return;
        }

        // Création de la commande finale
        await createOrderFromWebhook(resource, orderId, captureId, locals);

    } catch (err) {
        console.error('❌ [PayPal Webhook] Error processing payment capture:', err);
        throw err;
    }
}

async function createOrderFromWebhook(
    resource: PayPalCaptureResource,
    orderId: string,
    captureId: string,
    locals: any
) {
    try {
        // Récupérer la pending order
        const { data: pendingOrders, error: pendingError } = await locals.supabaseServiceRole
            .from('pending_orders')
            .select('id, order_data')
            .eq('order_data->>paypal_order_id', orderId);

        if (pendingError || !pendingOrders || pendingOrders.length === 0) {
            throw error(404, 'Pending order not found');
        }

        const pendingOrder = pendingOrders[0];
        const orderData = pendingOrder.order_data;

        // Récupérer les infos du shop
        const { data: shop } = await locals.supabaseServiceRole
            .from('shops')
            .select('slug, logo_url, name, profiles(email)')
            .eq('id', orderData.shopId)
            .single();

        const ownerEmail = shop.profiles?.email;

        // Créer la commande finale
        const orderToCreate = {
            product_id: orderData.productId,
            shop_id: orderData.shopId,
            customer_name: orderData.customerName,
            customer_email: orderData.customerEmail,
            customer_phone: orderData.customerPhone || null,
            customer_instagram: orderData.customerInstagram || null,
            pickup_date: orderData.selectedDate,
            customization_data: orderData.selectedOptions || {},
            product_name: orderData.cakeName,
            product_base_price: product.base_price,
            additional_information: orderData.specialRequest || null,
            total_amount: orderData.serverCalculatedPrice,
            paid_amount: parseFloat(resource.amount.value),
            status: 'confirmed',
            paypal_order_id: orderId,
            paypal_capture_id: captureId
        };

        const { data: finalOrder } = await locals.supabaseServiceRole
            .from('orders')
            .insert(orderToCreate)
            .select('id')
            .single();

        console.log(`✅ Order created: ${finalOrder.id} from PayPal order ${orderId}`);

        // Supprimer la pending order
        await locals.supabaseServiceRole
            .from('pending_orders')
            .delete()
            .eq('id', pendingOrder.id);

        // Envoyer les emails
        const paidAmount = parseFloat(resource.amount.value);
        const totalAmount = orderData.serverCalculatedPrice;
        const remainingAmount = totalAmount - paidAmount;

        // Email client
        await EmailService.sendOrderConfirmation({
            customerEmail: orderData.customerEmail,
            customerName: orderData.customerName,
            shopName: shop.name,
            shopLogo: shop.logo_url,
            productName: orderData.cakeName,
            pickupDate: orderData.selectedDate,
            totalAmount,
            paidAmount,
            remainingAmount,
            orderId: finalOrder.id,
            orderUrl: `${PUBLIC_SITE_URL}/${shop.slug}/order/${finalOrder.id}`,
            date: new Date().toLocaleDateString('fr-FR')
        });

        // Email patissier
        if (ownerEmail) {
            await EmailService.sendOrderNotification({
                pastryEmail: ownerEmail,
                customerName: orderData.customerName,
                customerEmail: orderData.customerEmail,
                customerInstagram: orderData.customerInstagram,
                productName: orderData.cakeName,
                pickupDate: orderData.selectedDate,
                totalAmount,
                paidAmount,
                remainingAmount,
                orderId: finalOrder.id,
                dashboardUrl: `${PUBLIC_SITE_URL}/dashboard/orders/${finalOrder.id}`,
                date: new Date().toLocaleDateString('fr-FR')
            });
        }

    } catch (err) {
        console.error('❌ Error processing payment capture:', err);
        throw err;
    }
}
