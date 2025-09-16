import type { Stripe } from 'stripe';
import { error } from '@sveltejs/kit';
import { EmailService } from '$lib/services/email-service';
import { PUBLIC_SITE_URL } from '$env/static/public';

export async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session, locals: any): Promise<void> {
    console.log('handleCheckoutSessionCompleted', session);

    try {
        // Vérifier que c'est un paiement de commande (pas un abonnement)
        if (session.mode !== 'payment') return;

        const sessionType = session.metadata?.type;

        if (sessionType === 'product_order') {
            await handleProductOrderPayment(session, locals);
        } else if (sessionType === 'custom_order_deposit') {
            await handleCustomOrderDeposit(session, locals);
        } else {
            console.warn('Unknown session type:', sessionType);
        }
    } catch (err) {
        console.error('handleCheckoutSessionCompleted failed:', err);
        throw error(500, 'handleCheckoutSessionCompleted failed: ' + err);
    }
}

export async function handleProductOrderPayment(session: Stripe.Checkout.Session, locals: any): Promise<void> {
    try {
        console.log('handleProductOrderPayment', session);

        const orderId = session.metadata!.orderId;

        const { data: pendingOrder, error: pendingOrderError } = await locals.supabaseServiceRole
            .from('pending_orders')
            .select('order_data')
            .eq('id', orderId)
            .single();

        if (pendingOrderError || !pendingOrder) {
            throw error(500, 'Pending order not found');
        }

        const orderData = pendingOrder.order_data;

        const { data: product, error: productError } = await locals.supabaseServiceRole
            .from('products')
            .select('base_price, shops(slug, logo_url, name, profiles(email))')
            .eq('id', orderData.productId)
            .single();

        if (productError || !product) {
            throw error(500, 'Failed to get product');
        }

        const totalAmount = orderData.serverCalculatedPrice || orderData.totalPrice;
        const paidAmount = session.amount_total ?? 0;

        const { data: order, error: orderError } = await locals.supabaseServiceRole
            .from('orders')
            .insert({
                shop_id: orderData.shopId,
                product_id: orderData.productId,
                customer_name: orderData.customerName,
                customer_email: orderData.customerEmail,
                customer_phone: orderData.customerPhone || null,
                customer_instagram: orderData.customerInstagram || null,
                pickup_date: orderData.selectedDate,
                additional_information: orderData.additionalInfo || null,
                customization_data: orderData.selectedOptions || null,
                status: 'confirmed',
                total_amount: totalAmount,
                paid_amount: paidAmount / 100,
                product_name: orderData.cakeName,
                product_base_price: product?.base_price || 0,
                stripe_payment_intent_id: session.payment_intent as string,
                stripe_session_id: session.id
            })
            .select()
            .single();

        if (orderError || !order) {
            throw error(500, 'Failed to create product order');
        }

        try {
            await EmailService.sendOrderConfirmation({
                customerEmail: orderData.customerEmail,
                customerName: orderData.customerName,
                shopName: product.shops.name,
                shopLogo: product.shops.logo_url,
                productName: orderData.cakeName,
                pickupDate: orderData.selectedDate,
                totalAmount: totalAmount,
                paidAmount: paidAmount / 100,
                remainingAmount: totalAmount - (paidAmount / 100),
                orderId: order.id,
                orderUrl: `${PUBLIC_SITE_URL}/${product.shops.slug}/orders/${order.id}`,
                date: new Date().toLocaleDateString("fr-FR"),
            });

            await EmailService.sendOrderNotification({
                pastryEmail: product.shops.profiles.email,
                customerName: orderData.customerName,
                customerEmail: orderData.customerEmail,
                customerInstagram: orderData.customerInstagram,
                productName: orderData.cakeName,
                pickupDate: orderData.selectedDate,
                totalAmount: totalAmount,
                paidAmount: paidAmount / 100,
                remainingAmount: totalAmount - (paidAmount / 100),
                orderId: order.id,
                dashboardUrl: `${PUBLIC_SITE_URL}/${product.shops.slug}/orders/${order.id}`,
                date: new Date().toLocaleDateString("fr-FR"),
            });
        } catch (err) {
            console.error('Email sending failed:', err);
            throw error(500, 'Failed to send order emails: ' + err);
        }

        const { error: deleteError } = await locals.supabaseServiceRole
            .from('pending_orders')
            .delete()
            .eq('id', orderId);

        if (deleteError) {
            console.error('Failed to delete pending order:', deleteError);
            throw error(500, 'Failed to delete pending order');
        }

    } catch (err) {
        console.error('handleProductOrderPayment failed:', err);
        throw error(500, 'handleProductOrderPayment failed: ' + err);
    }
}

export async function handleCustomOrderDeposit(session: Stripe.Checkout.Session, locals: any): Promise<void> {
    console.log('handleCustomOrderDeposit', session);

    try {
        const orderId = session.metadata!.orderId;
        const totalPrice = parseFloat(session.metadata!.totalPrice);
        const depositAmount = parseFloat(session.metadata!.depositAmount);

        const { data: order, error: orderError } = await locals.supabaseServiceRole
            .from('orders')
            .update({
                status: 'confirmed',
                paid_amount: depositAmount / 100,
                stripe_payment_intent_id: session.payment_intent as string,
                stripe_session_id: session.id
            })
            .eq('id', orderId)
            .select('customer_email, customer_name, shops(name, slug, logo_url, profiles(email)), pickup_date')
            .single();

        if (orderError || !order) {
            throw error(500, 'Failed to update custom order');
        }

        try {
            await EmailService.sendQuoteConfirmation({
                customerEmail: order.customer_email,
                customerName: order.customer_name,
                shopName: order.shops.name,
                shopLogo: order.shops.logo_url,
                pickupDate: order.pickup_date,
                totalPrice: totalPrice,
                depositAmount: depositAmount / 100,
                remainingAmount: totalPrice - (depositAmount / 100),
                orderId: orderId,
                orderUrl: `${PUBLIC_SITE_URL}/${order.shops.slug}/orders/${orderId}`,
                date: new Date().toLocaleDateString("fr-FR"),
            });

            await EmailService.sendQuotePayment({
                pastryEmail: order.shops.profiles.email,
                customerName: order.customer_name,
                customerEmail: order.customer_email,
                pickupDate: order.pickup_date,
                totalPrice: totalPrice,
                depositAmount: depositAmount / 100,
                remainingAmount: totalPrice - (depositAmount / 100),
                orderId: orderId,
                dashboardUrl: `${PUBLIC_SITE_URL}/dashboard/orders/${orderId}`,
                date: new Date().toLocaleDateString("fr-FR"),
            });
        } catch (err) {
            console.error('Email sending for deposit failed:', err);
            throw error(500, 'Failed to send deposit emails: ' + err);
        }

    } catch (err) {
        console.error('handleCustomOrderDeposit failed:', err);
        throw error(500, 'handleCustomOrderDeposit failed: ' + err);
    }
}
