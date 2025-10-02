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
            // 4️⃣ Capturer la commande PayPal
            const { paypalClient } = await import('$lib/paypal/client');
            const captureResult = await paypalClient.captureOrder(orderData.paypal_order_id);

            const paidAmount = parseFloat(
                captureResult.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value || '0'
            );

            // 5️⃣ Créer la commande finale
            const finalOrder = await createOrderFromCapture(captureResult, pendingOrder, shop.id, locals, paidAmount);
            finalOrderId = finalOrder.id;
        }

    } catch (err) {
        console.error('❌ PayPal return processing failed:', err);
        throw redirect(303, `/${slug}?payment=error&reason=processing_failed`);
    }

    // 6️⃣ Redirection vers la commande
    throw redirect(303, `/${slug}/order/${finalOrderId}`);
};

async function createOrderFromCapture(captureResult: any, pendingOrder: any, shopId: string, locals: any, paidAmount: number) {
    const orderData = pendingOrder.order_data;

    // 1️⃣ Récupérer produit
    const { data: product, error: productError } = await locals.supabaseServiceRole
        .from('products')
        .select('*')
        .eq('id', orderData.productId)
        .single();
    if (productError || !product) throw new Error('Product not found');

    // 2️⃣ Récupérer boutique et email du propriétaire
    const { data: shop } = await locals.supabaseServiceRole
        .from('shops')
        .select('slug, logo_url, name, profiles(email)')
        .eq('id', orderData.shopId)
        .single();
    const ownerEmail = shop.profiles?.email;

    // 3️⃣ Créer la commande finale
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
        paid_amount: paidAmount,
        status: 'confirmed',
        paypal_order_id: orderData.paypal_order_id,
        paypal_capture_id: captureResult.id
    };

    const { data: finalOrder, error: finalOrderError } = await locals.supabaseServiceRole
        .from('orders')
        .insert(orderToCreate)
        .select('id')
        .single();
    if (finalOrderError || !finalOrder) throw new Error('Failed to create order');

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
            const emailService = new EmailService();

            await emailService.sendOrderConfirmation({
                customerEmail: orderData.customerEmail,
                customerName: orderData.customerName,
                shopName: shop.name,
                orderId: finalOrder.id,
                productName: orderData.cakeName,
                pickupDate: orderData.selectedDate,
                totalAmount: orderData.serverCalculatedPrice,
                paidAmount
            });

            await emailService.sendNewOrderNotification({
                chefEmail: ownerEmail,
                customerName: orderData.customerName,
                customerEmail: orderData.customerEmail,
                shopName: shop.name,
                orderId: finalOrder.id,
                productName: orderData.cakeName,
                pickupDate: orderData.selectedDate,
                totalAmount: orderData.serverCalculatedPrice,
                paidAmount
            });
        } catch (err) {
            console.error('❌ Failed to send emails:', err);
        }
    }

    console.log('✅ [PayPal Return] Order created and emails processed:', finalOrder.id);
    return finalOrder;
}
