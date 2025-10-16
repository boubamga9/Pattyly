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

        // Récupérer le produit seulement pour les commandes de produits (pas custom)
        let product = null;
        if (!orderData.isCustomOrder && orderData.productId) {
            const { data: productData, error: productError } = await locals.supabaseServiceRole
                .from('products')
                .select('base_price')
                .eq('id', orderData.productId)
                .single();

            if (productError || !productData) {
                throw error(404, 'Product not found');
            }
            product = productData;
        }

        // Créer ou modifier la commande finale selon le type
        let finalOrder;

        if (orderData.isCustomOrder) {
            // Pour les commandes personnalisées : modifier la commande existante
            console.log('🔄 [PayPal Webhook] Updating existing custom order:', orderData.orderId);

            const { data: updatedOrder, error: updateError } = await locals.supabaseServiceRole
                .from('orders')
                .update({
                    status: 'confirmed',
                    paid_amount: parseFloat(resource.amount.value),
                    paypal_order_id: orderId,
                    paypal_capture_id: captureId
                })
                .eq('id', orderData.orderId)
                .select('id')
                .single();

            if (updateError || !updatedOrder) {
                console.error('❌ [PayPal Webhook] Failed to update custom order:', updateError);
                throw new Error('Failed to update custom order');
            }

            finalOrder = updatedOrder;
            console.log(`✅ Custom order updated: ${finalOrder.id} from PayPal order ${orderId}`);

        } else {
            // Pour les commandes de produits : créer une nouvelle commande
            console.log('🔄 [PayPal Webhook] Creating new product order');

            const orderToCreate = {
                product_id: orderData.productId,
                shop_id: orderData.shopId,
                customer_name: orderData.customerName,
                customer_email: orderData.customerEmail,
                customer_phone: orderData.customerPhone || null,
                customer_instagram: orderData.customerInstagram || null,
                pickup_date: orderData.selectedDate,
                customization_data: orderData.selectedOptions || {},
                product_name: orderData.productName,
                product_base_price: orderData.productBasePrice,
                additional_information: orderData.specialRequest || null,
                total_amount: orderData.serverCalculatedPrice,
                paid_amount: parseFloat(resource.amount.value),
                status: 'confirmed',
                paypal_order_id: orderId,
                paypal_capture_id: captureId
            };

            const { data: newOrder, error: createError } = await locals.supabaseServiceRole
                .from('orders')
                .insert(orderToCreate)
                .select('id')
                .single();

            if (createError || !newOrder) {
                console.error('❌ [PayPal Webhook] Failed to create product order:', createError);
                throw new Error('Failed to create product order');
            }

            finalOrder = newOrder;
            console.log(`✅ Product order created: ${finalOrder.id} from PayPal order ${orderId}`);
        }

        // Supprimer la pending order
        await locals.supabaseServiceRole
            .from('pending_orders')
            .delete()
            .eq('id', pendingOrder.id);

        // Envoyer les emails
        const paidAmount = parseFloat(resource.amount.value);
        const totalAmount = orderData.isCustomOrder ? orderData.totalAmount : orderData.serverCalculatedPrice;
        const remainingAmount = totalAmount - paidAmount;

        // Email client
        await EmailService.sendOrderConfirmation({
            customerEmail: orderData.customerEmail,
            customerName: orderData.customerName,
            shopName: shop.name,
            shopLogo: shop.logo_url,
            productName: orderData.productName,
            pickupDate: orderData.isCustomOrder ? orderData.pickupDate : orderData.selectedDate,
            pickupTime: orderData.pickupTime,
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
                productName: orderData.productName,
                pickupDate: orderData.isCustomOrder ? orderData.pickupDate : orderData.selectedDate,
                pickupTime: orderData.pickupTime,
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
