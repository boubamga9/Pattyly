import type { Stripe } from 'stripe';
import { error } from '@sveltejs/kit';

export async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session, locals: any): Promise<void> {
    console.log('🔍 Handling checkout completed:', session.id);

    try {
        console.log('✅ Checkout completion handled successfully');

        console.log('🔍 Checkout session completed:', session.id);

        // Vérifier que c'est un paiement de commande (pas un abonnement)
        if (session.mode !== 'payment') {
            console.log('⚠️ Session non-payment ignorée:', session.mode);
            return;
        }

        const sessionType = session.metadata?.type;

        if (sessionType === 'product_order') {
            await handleProductOrderPayment(session, locals);
        } else if (sessionType === 'custom_order_deposit') {
            await handleCustomOrderDeposit(session, locals);
        } else {
            console.log('⚠️ Type de session non reconnu:', sessionType);
        }


    } catch (error) {
        console.error('❌ Error handling checkout completion:', error);
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
        console.log('🔍 Récupération des données depuis pending_orders avec ID:', orderId);

        const { data: pendingOrder, error: pendingOrderError } = await locals.supabaseServiceRole
            .from('pending_orders')
            .select('order_data')
            .eq('id', orderId)
            .single();

        if (pendingOrderError || !pendingOrder) {
            console.error('❌ Erreur récupération pending_order:', pendingOrderError);
            throw error(500, 'Pending order not found');
        }

        const orderData = pendingOrder.order_data;
        console.log('📝 Données de commande produit récupérées:', orderData);

        // Récupérer le prix de base du produit
        const { data: product, error: productError } = await locals.supabaseServiceRole
            .from('products')
            .select('base_price')
            .eq('id', orderData.productId)
            .single();

        if (productError) {
            console.error('❌ Erreur récupération prix de base:', productError);
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
            console.error('❌ Erreur création commande produit:', orderError);
            throw error(500, 'Failed to create product order');
        }

        console.log('✅ Commande produit créée avec succès:', order.id);

        // 🗑️ SUPPRIMER LA LIGNE pending_orders UTILISÉE
        console.log('🗑️ Suppression de la ligne pending_orders utilisée...');
        const { error: deleteError } = await locals.supabaseServiceRole
            .from('pending_orders')
            .delete()
            .eq('id', orderId);

        if (deleteError) {
            console.error('⚠️ Erreur suppression pending_order (non critique):', deleteError);
        } else {
            console.log('✅ Ligne pending_orders supprimée avec succès');
        }

    } catch (err) {
        console.error('❌ Erreur traitement commande produit:', err);
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

        console.log('📝 Paiement acompte commande custom:', { orderId, totalPrice, depositAmount });

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
            console.error('❌ Erreur mise à jour commande custom:', orderError);
            throw error(500, 'Failed to update custom order');
        }

        console.log('✅ Acompte commande custom payé avec succès:', order.id);
    } catch (err) {
        console.error('❌ Erreur traitement acompte commande custom:', err);
    }
}