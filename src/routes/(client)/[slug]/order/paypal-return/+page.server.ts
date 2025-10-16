// src/routes/(client)/[slug]/order/paypal-return/+page.server.ts
import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, params, locals }) => {
    const { slug } = params;
    const pendingId = url.searchParams.get('pendingId');

    if (!pendingId) {
        console.error('❌ Missing pendingId parameter');
        throw redirect(303, `/${slug}?payment=error&reason=missing_pendingId`);
    }

    let finalOrderId: string | null = null;

    try {
        // 1️⃣ Récupérer la boutique
        const { data: shop, error: shopError } = await locals.supabase
            .from('shops')
            .select('id')
            .eq('slug', slug)
            .single();
        if (shopError || !shop) throw error(404, 'Boutique non trouvée');

        // 2️⃣ Récupérer la pending order
        const { data: pendingOrder, error: pendingError } = await locals.supabaseServiceRole
            .from('pending_orders')
            .select('id, order_data')
            .eq('id', pendingId)
            .single();
        if (pendingError || !pendingOrder) {
            console.error('❌ Pending order not found for ID:', pendingId);
            throw redirect(303, `/${slug}?payment=error&reason=pending_not_found`);
        }

        const orderData = pendingOrder.order_data;

        // 3️⃣ Vérifier si la commande finale existe déjà (webhook peut avoir créé)
        const { data: existingOrder } = await locals.supabase
            .from('orders')
            .select('id')
            .eq('paypal_order_id', orderData.paypal_order_id)
            .single();

        if (existingOrder) {
            console.log('ℹ️ Order already exists, skipping creation');
            finalOrderId = existingOrder.id;
        } else {
            // 4️⃣ Vérifier le statut et capturer si nécessaire
            const { paypalClient } = await import('$lib/paypal/client');

            // Vérifier le statut de l'ordre avant de capturer
            const orderDetails = await paypalClient.getOrder(orderData.paypal_order_id);
            console.log('🔍 [PayPal Return] Order status:', orderDetails.status);
            console.log('🔍 [PayPal Return] Full order details:', JSON.stringify(orderDetails, null, 2));

            let captureResult;
            let paidAmount = 0;

            if (orderDetails.status === 'APPROVED') {
                // Vérifier si des captures existent déjà
                const existingCaptures = orderDetails.purchase_units?.[0]?.payments?.captures;
                if (existingCaptures && existingCaptures.length > 0) {
                    console.log('✅ [PayPal Return] Order already has captures, skipping manual capture');
                    captureResult = orderDetails;
                    paidAmount = parseFloat(
                        existingCaptures[0]?.amount?.value || '0'
                    );
                } else {
                    // Ordre approuvé mais pas encore capturé (compte PayPal)
                    console.log('🎯 [PayPal Return] Capturing approved order...');
                    try {
                        captureResult = await paypalClient.captureOrder(orderData.paypal_order_id);
                        paidAmount = parseFloat(
                            captureResult.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value || '0'
                        );
                    } catch (captureError) {
                        console.error('❌ [PayPal Return] Capture failed, checking if already captured:', captureError);

                        // Vérifier si l'ordre a été capturé entre temps (par webhook par exemple)
                        const updatedOrderDetails = await paypalClient.getOrder(orderData.paypal_order_id);
                        if (updatedOrderDetails.status === 'COMPLETED' ||
                            updatedOrderDetails.purchase_units?.[0]?.payments?.captures) {
                            console.log('✅ [PayPal Return] Order was captured by webhook, using updated details');
                            captureResult = updatedOrderDetails;
                            paidAmount = parseFloat(
                                updatedOrderDetails.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value || '0'
                            );
                        } else {
                            throw captureError; // Re-throw si vraiment pas capturé
                        }
                    }
                }
            } else if (orderDetails.status === 'COMPLETED') {
                // Ordre déjà capturé (carte bancaire)
                console.log('✅ [PayPal Return] Order already captured (card payment)');
                captureResult = orderDetails;
                paidAmount = parseFloat(
                    orderDetails.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value || '0'
                );
            } else {
                throw new Error(`Unexpected order status: ${orderDetails.status}`);
            }

            // 5️⃣ Créer la commande finale
            const finalOrder = await createOrderFromCapture(captureResult, pendingOrder, shop.id, locals, paidAmount);
            finalOrderId = finalOrder.id;
        }

    } catch (err) {
        console.error('❌ PayPal return processing failed:', err);
        throw redirect(303, `/${slug}?payment=error&reason=processing_failed`);
    }

    // 6️⃣ Vérifier que finalOrderId est défini avant redirection
    if (!finalOrderId) {
        console.error('❌ finalOrderId is null or undefined');
        throw redirect(303, `/${slug}?payment=error&reason=no_order_id`);
    }

    console.log('🔄 [PayPal Return] Redirecting to order:', finalOrderId);
    throw redirect(303, `/${slug}/order/${finalOrderId}`);
};

async function createOrderFromCapture(captureResult: any, pendingOrder: any, shopId: string, locals: any, paidAmount: number) {
    const orderData = pendingOrder.order_data;

    console.log('🔍 [PayPal Return] Order data:', orderData);
    console.log('🔍 [PayPal Return] Shop ID from params:', shopId);
    console.log('🔍 [PayPal Return] Shop ID from orderData:', orderData.shopId);

    // 1️⃣ Récupérer produit seulement pour les commandes de produits (pas custom)
    let product = null;
    if (!orderData.isCustomOrder && orderData.productId) {
        const { data: productData, error: productError } = await locals.supabaseServiceRole
            .from('products')
            .select('*')
            .eq('id', orderData.productId)
            .single();
        if (productError || !productData) throw new Error('Product not found');
        product = productData;
    }

    // 2️⃣ Récupérer boutique et email du propriétaire
    const { data: shop, error: shopError } = await locals.supabaseServiceRole
        .from('shops')
        .select('slug, logo_url, name, profiles(email)')
        .eq('id', orderData.shopId)
        .single();

    if (shopError || !shop) {
        console.error('❌ [PayPal Return] Shop not found:', shopError);
        throw new Error('Shop not found');
    }

    const ownerEmail = shop.profiles?.email;

    // 3️⃣ Créer ou modifier la commande finale selon le type
    let finalOrder;

    if (orderData.isCustomOrder) {
        // Pour les commandes personnalisées : modifier la commande existante
        console.log('🔄 [PayPal Return] Updating existing custom order:', orderData.orderId);

        const { data: updatedOrder, error: updateError } = await locals.supabaseServiceRole
            .from('orders')
            .update({
                status: 'confirmed',
                paid_amount: paidAmount,
                paypal_order_id: orderData.paypal_order_id,
                paypal_capture_id: captureResult.purchase_units?.[0]?.payments?.captures?.[0]?.id || captureResult.id
            })
            .eq('id', orderData.orderId)
            .select('id')
            .single();

        if (updateError || !updatedOrder) {
            console.error('❌ [PayPal Return] Failed to update custom order:', updateError);
            throw new Error('Failed to update custom order');
        }

        finalOrder = updatedOrder;
        console.log('✅ [PayPal Return] Custom order updated:', finalOrder.id);
        console.log('🔍 [PayPal Return] Final order object:', JSON.stringify(finalOrder, null, 2));

    } else {
        // Pour les commandes de produits : créer une nouvelle commande
        console.log('🔄 [PayPal Return] Creating new product order');

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
            product_base_price: product.base_price,
            additional_information: orderData.specialRequest || null,
            total_amount: orderData.serverCalculatedPrice,
            paid_amount: paidAmount,
            status: 'confirmed',
            paypal_order_id: orderData.paypal_order_id,
            paypal_capture_id: captureResult.id
        };

        const { data: newOrder, error: createError } = await locals.supabaseServiceRole
            .from('orders')
            .insert(orderToCreate)
            .select('id')
            .single();

        if (createError || !newOrder) {
            console.error('❌ [PayPal Return] Failed to create product order:', createError);
            throw new Error('Failed to create product order');
        }

        finalOrder = newOrder;
        console.log('✅ [PayPal Return] Product order created:', finalOrder.id);
        console.log('🔍 [PayPal Return] Final order object:', JSON.stringify(finalOrder, null, 2));
    }

    // 4️⃣ Supprimer la pending order (non bloquant)
    try {
        await locals.supabaseServiceRole
            .from('pending_orders')
            .delete()
            .eq('id', pendingOrder.id);
    } catch (err) {
        console.error('❌ Failed to delete pending order:', err);
    }

    // 5️⃣ Envoyer emails (non bloquant)
    if (ownerEmail) {
        try {
            const { EmailService } = await import('$lib/services/email-service');
            const { PUBLIC_SITE_URL } = await import('$env/static/public');

            const totalAmount = orderData.isCustomOrder ? orderData.totalAmount : orderData.serverCalculatedPrice;
            const remainingAmount = totalAmount - paidAmount;
            const pickupDate = orderData.isCustomOrder ? orderData.pickupDate : orderData.selectedDate;
            const currentDate = new Date().toLocaleDateString('fr-FR');

            await EmailService.sendOrderConfirmation({
                customerEmail: orderData.customerEmail,
                customerName: orderData.customerName,
                shopName: shop.name,
                shopLogo: shop.logo_url,
                productName: orderData.productName,
                pickupDate,
                pickupTime: orderData.pickupTime,
                totalAmount,
                paidAmount,
                remainingAmount,
                orderId: finalOrder.id,
                orderUrl: `${PUBLIC_SITE_URL}/${shop.slug}/order/${finalOrder.id}`,
                date: currentDate
            });

            await EmailService.sendOrderNotification({
                pastryEmail: ownerEmail,
                customerName: orderData.customerName,
                customerEmail: orderData.customerEmail,
                customerInstagram: orderData.customerInstagram,
                productName: orderData.productName,
                pickupDate,
                pickupTime: orderData.pickupTime,
                totalAmount,
                paidAmount,
                remainingAmount,
                orderId: finalOrder.id,
                dashboardUrl: `${PUBLIC_SITE_URL}/dashboard/orders/${finalOrder.id}`,
                date: currentDate
            });
        } catch (err) {
            console.error('❌ Failed to send emails:', err);
        }
    }

    console.log('✅ [PayPal Return] Order created and emails processed:', finalOrder.id);
    console.log('🔍 [PayPal Return] Returning finalOrder with id:', finalOrder.id);
    return finalOrder;
}
