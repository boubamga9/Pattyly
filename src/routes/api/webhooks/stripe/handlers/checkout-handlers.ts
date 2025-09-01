import type { Stripe } from 'stripe';
import { error } from '@sveltejs/kit';

export async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session, locals: any): Promise<void> {


    try {




        // Vérifier que c'est un paiement de commande (pas un abonnement)
        if (session.mode !== 'payment') {

            return;
        }

        const sessionType = session.metadata?.type;

        if (sessionType === 'product_order') {
            await handleProductOrderPayment(session, locals);
        } else if (sessionType === 'custom_order_deposit') {
            await handleCustomOrderDeposit(session, locals);
        } else {

        }


    } catch (error) {
        throw error;
    }
}

export async function handleProductOrderPayment(
    session: Stripe.Checkout.Session,
    locals: any
): Promise<void> {
    try {
        // 🗄️ RÉCUPÉRER LES DONNÉES COMPLÈTES DEPUIS pending_orders
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


        // Récupérer le prix de base du produit
        const { data: product, error: productError } = await locals.supabaseServiceRole
            .from('products')
            .select('base_price')
            .eq('id', orderData.productId)
            .single();

        if (productError) {
        }

        // Créer la commande dans la base de données
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
                total_amount: orderData.serverCalculatedPrice || orderData.totalPrice,
                paid_amount: orderData.serverCalculatedPrice || orderData.totalPrice, // ✅ Ajouter le montant payé
                product_name: orderData.cakeName,
                product_base_price: product?.base_price || 0,
                stripe_payment_intent_id: session.payment_intent as string,
                stripe_session_id: session.id
            })
            .select()
            .single();

        if (orderError) {
            throw error(500, 'Failed to create product order');
        }



        // 🗑️ SUPPRIMER LA LIGNE pending_orders UTILISÉE

        const { error: deleteError } = await locals.supabaseServiceRole
            .from('pending_orders')
            .delete()
            .eq('id', orderId);

        if (deleteError) {
        } else {

        }

    } catch (err) {
    }
}

export async function handleCustomOrderDeposit(
    session: Stripe.Checkout.Session,
    locals: any
): Promise<void> {
    try {
        const orderId = session.metadata!.orderId;
        const totalPrice = parseFloat(session.metadata!.totalPrice);
        const depositAmount = parseFloat(session.metadata!.depositAmount);



        // Mettre à jour la commande existante
        const { data: order, error: orderError } = await locals.supabaseServiceRole
            .from('orders')
            .update({
                status: 'confirmed',
                paid_amount: depositAmount, // ✅ Ajouter le montant de l'acompte payé
                stripe_payment_intent_id: session.payment_intent as string,
                stripe_session_id: session.id
            })
            .eq('id', orderId)
            .select()
            .single();

        if (orderError) {
            throw error(500, 'Failed to update custom order');
        }


    } catch (err) {
    }
}