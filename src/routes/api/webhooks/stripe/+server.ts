import { error, json } from '@sveltejs/kit';
import Stripe from 'stripe';
import { PRIVATE_STRIPE_WEBHOOK_SECRET } from '$env/static/private';
import type { RequestHandler } from './$types';

const endpointSecret = PRIVATE_STRIPE_WEBHOOK_SECRET;

export const POST: RequestHandler = async ({ request, locals }) => {
    const body = await request.text();
    const sig = request.headers.get('stripe-signature');

    console.log('Webhook received:', request.url);
    console.log('Webhook secret exists:', !!endpointSecret);
    console.log('Signature exists:', !!sig);
    console.log('Environment variables:', {
        PRIVATE_STRIPE_WEBHOOK_SECRET: PRIVATE_STRIPE_WEBHOOK_SECRET ? 'EXISTS' : 'MISSING'
    });

    if (!endpointSecret || !sig) {
        console.error('Missing webhook secret or signature');
        throw error(400, 'Webhook signature verification failed');
    }

    let event: Stripe.Event;

    try {
        event = Stripe.webhooks.constructEvent(body, sig, endpointSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err);
        throw error(400, 'Webhook signature verification failed');
    }

    try {
        console.log('🔍 Processing webhook event:', event.type);

        // ✅ Idempotence check
        const { data: existing } = await locals.supabaseServiceRole
            .from('stripe_events')
            .select('id')
            .eq('id', event.id)
            .maybeSingle();

        if (existing) {
            console.log('⏩ Event déjà traité:', event.id);
            return json({ received: true });
        }

        // Enregistrement de l’event.id
        const { error: insertError } = await locals.supabaseServiceRole
            .from('stripe_events')
            .insert({ id: event.id });

        if (insertError) {
            console.error('❌ Erreur enregistrement event.id:', insertError);
            throw error(500, 'Erreur idempotence');
        }

        switch (event.type) {
            case 'customer.created':
                console.log('🔍 Handling customer.created');
                await handleCustomerCreated(event.data.object as Stripe.Customer, locals);
                break;

            case 'customer.subscription.created':
                console.log('🔍 Handling customer.subscription.created');
                await upsertSubscription(event.data.object as Stripe.Subscription, locals);
                break;

            case 'customer.subscription.updated':
                console.log('🔍 Handling customer.subscription.updated');
                await upsertSubscription(event.data.object as Stripe.Subscription, locals);
                break;

            case 'customer.subscription.deleted':
                console.log('🔍 Handling customer.subscription.deleted');
                await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, locals);
                break;

            case 'invoice.payment_succeeded':
                console.log('🔍 Handling invoice.payment_succeeded');
                await handlePaymentSucceeded(event.data.object as Stripe.Invoice, locals);
                break;

            case 'invoice.payment_failed':
                console.log('🔍 Handling invoice.payment_failed');
                await handlePaymentFailed(event.data.object as Stripe.Invoice, locals);
                break;

            case 'account.updated':
                console.log('🔍 Handling account.updated');
                await handleAccountUpdated(event.data.object as Stripe.Account, locals);
                break;

            case 'account.application.authorized':
                console.log('🔍 Handling account.application.authorized');
                await handleAccountAuthorized(event.data.object as unknown as Stripe.Account, locals);
                break;

            case 'checkout.session.completed':
                console.log('🔍 Handling checkout.session.completed');
                await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session, locals);
                break;

            case 'payment_intent.succeeded':
                console.log('🔍 Handling payment_intent.succeeded');
                await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent, locals);
                break;

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        return json({ received: true });
    } catch (err) {
        console.error('Error processing webhook:', err);
        throw error(500, 'Webhook processing failed');
    }
};

async function upsertSubscription(subscription: Stripe.Subscription, locals: any) {
    const customerId = subscription.customer as string;

    // Récupérer le profile_id depuis stripe_customers
    const { data: customerData } = await locals.supabaseServiceRole
        .from('stripe_customers')
        .select('profile_id')
        .eq('stripe_customer_id', customerId)
        .single();

    if (!customerData) {
        console.error('Customer not found in database:', customerId);
        return;
    }

    const profileId = customerData.profile_id;
    const productId = subscription.items.data[0].price.product as string;
    const subscriptionId = subscription.id;

    // Déterminer le statut de l'abonnement
    let subscriptionStatus: 'active' | 'inactive' = 'inactive';

    if (subscription.status === 'active' || subscription.status === 'trialing') {
        subscriptionStatus = 'active';
    }

    console.log('🔍 upsertSubscription - Profile ID:', profileId);
    console.log('🔍 upsertSubscription - Product ID:', productId);
    console.log('🔍 upsertSubscription - Subscription Status:', subscriptionStatus);

    // Une seule logique UPSERT qui fonctionne pour tous les cas
    const { error: upsertError } = await locals.supabaseServiceRole
        .from('user_products')
        .upsert(
            {
                profile_id: profileId,
                stripe_product_id: productId,
                stripe_subscription_id: subscriptionId,
                subscription_status: subscriptionStatus
            },
            { onConflict: 'profile_id' }  // Conflit sur profile_id seulement
        );

    if (upsertError) {
        console.error('Error upserting subscription in database:', upsertError);
        throw error(500, 'Failed to upsert subscription in database');
    } else {
        console.log('✅ upsertSubscription - Successfully upserted subscription');
    }

    // Gérer is_custom_accepted selon le plan
    if (subscriptionStatus === 'active') {
        const isBasicPlan = productId === 'prod_Selbd3Ne2plHqG'; // Plan basique
        const isPremiumPlan = productId === 'prod_Selcz36pAfV3vV'; // Plan premium

        console.log('🔍 Plan detection - Basic:', isBasicPlan, 'Premium:', isPremiumPlan);

        if (isBasicPlan) {
            // Désactiver is_custom_accepted pour le plan basique
            const { error: shopUpdateError } = await locals.supabaseServiceRole
                .from('shops')
                .update({ is_custom_accepted: false })
                .eq('profile_id', profileId);

            if (shopUpdateError) {
                console.error('Error disabling custom requests for basic plan:', shopUpdateError);
                throw error(500, 'Failed to disable custom requests for basic plan');
            } else {
                console.log('✅ Disabled custom requests for basic plan user:', profileId);
            }
        } else if (isPremiumPlan) {
            // Le plan premium peut avoir is_custom_accepted activé (mais on ne le force pas)
            console.log('✅ Premium plan - custom requests can be enabled by user');
        }
    }
}

async function handleCustomerCreated(customer: Stripe.Customer, locals: any) {
    const userId = customer.metadata?.user_id;
    if (!userId) return;

    // Créer l'enregistrement dans stripe_customers
    const { error: upsertError } = await locals.supabaseServiceRole
        .from('stripe_customers')
        .upsert(
            {
                profile_id: userId,
                stripe_customer_id: customer.id
            },
            { onConflict: 'profile_id' }
        );

    if (upsertError) {
        console.error('Error saving customer to database:', upsertError);
        throw error(500, 'Failed to save customer to database');
    }
}



async function handleSubscriptionDeleted(subscription: Stripe.Subscription, locals: any) {
    console.log('🔍 handleSubscriptionDeleted - Processing subscription deletion');

    const customerId = subscription.customer as string;

    // Récupérer le profile_id depuis stripe_customers
    const { data: customerData } = await locals.supabaseServiceRole
        .from('stripe_customers')
        .select('profile_id')
        .eq('stripe_customer_id', customerId)
        .single();

    if (!customerData) {
        console.error('Customer not found in database:', customerId);
        return;
    }

    const profileId = customerData.profile_id;
    const productId = subscription.items.data[0].price.product as string;

    console.log('🔍 handleSubscriptionDeleted - Profile ID:', profileId);
    console.log('🔍 handleSubscriptionDeleted - Product ID:', productId);

    // Marquer l'abonnement comme inactif
    const { error: updateError } = await locals.supabaseServiceRole
        .from('user_products')
        .update({
            subscription_status: 'inactive'
        })
        .eq('profile_id', profileId)
        .eq('stripe_product_id', productId);

    if (updateError) {
        console.error('Error updating subscription status in database:', updateError);
        throw error(500, 'Failed to update subscription status in database');
    } else {
        console.log('✅ handleSubscriptionDeleted - Successfully marked subscription as inactive');
    }

    // Désactiver is_custom_accepted quand l'abonnement est supprimé
    const { error: shopUpdateError } = await locals.supabaseServiceRole
        .from('shops')
        .update({ is_custom_accepted: false })
        .eq('profile_id', profileId);

    if (shopUpdateError) {
        console.error('Error disabling custom requests after subscription deletion:', shopUpdateError);
        throw error(500, 'Failed to disable custom requests after subscription deletion');
    } else {
        console.log('✅ Disabled custom requests after subscription deletion for user:', profileId);
    }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice, locals: any) {
    console.log('🔍 handlePaymentSucceeded - Processing payment success');
    console.log('🔍 handlePaymentSucceeded - Invoice ID:', invoice.id);

    // Récupérer le customer_id depuis l'invoice
    const customerId = invoice.customer as string;

    // Récupérer le profile_id depuis stripe_customers
    const { data: customerData } = await locals.supabaseServiceRole
        .from('stripe_customers')
        .select('profile_id')
        .eq('stripe_customer_id', customerId)
        .single();

    if (!customerData) {
        console.error('Customer not found in database:', customerId);
        return;
    }

    const profileId = customerData.profile_id;
    console.log('🔍 handlePaymentSucceeded - Profile ID:', profileId);

    // Réactiver l'abonnement après un paiement réussi
    const { error: updateError } = await locals.supabaseServiceRole
        .from('user_products')
        .update({
            subscription_status: 'active'
        })
        .eq('profile_id', profileId);

    if (updateError) {
        console.error('Error reactivating subscription after payment success:', updateError);
        throw error(500, 'Failed to reactivate subscription after payment success');
    } else {
        console.log('✅ handlePaymentSucceeded - Successfully reactivated subscription');
    }
}

async function handlePaymentFailed(invoice: Stripe.Invoice, locals: any) {
    console.log('🔍 handlePaymentFailed - Processing payment failure');
    console.log('🔍 handlePaymentFailed - Invoice ID:', invoice.id);
    console.log('🔍 handlePaymentFailed - Amount:', invoice.amount_due);
    console.log('🔍 handlePaymentFailed - Status:', invoice.status);

    // Récupérer le customer_id depuis l'invoice
    const customerId = invoice.customer as string;

    // Récupérer le profile_id depuis stripe_customers
    const { data: customerData } = await locals.supabaseServiceRole
        .from('stripe_customers')
        .select('profile_id')
        .eq('stripe_customer_id', customerId)
        .single();

    if (!customerData) {
        console.error('Customer not found in database:', customerId);
        return;
    }

    const profileId = customerData.profile_id;
    console.log('🔍 handlePaymentFailed - Profile ID:', profileId);

    // Marquer l'abonnement comme inactif
    const { error: updateError } = await locals.supabaseServiceRole
        .from('user_products')
        .update({
            subscription_status: 'inactive'
        })
        .eq('profile_id', profileId);

    if (updateError) {
        console.error('Error updating subscription status after payment failure:', updateError);
        throw error(500, 'Failed to update subscription status after payment failure');
    } else {
        console.log('✅ handlePaymentFailed - Successfully marked subscription as inactive');
    }

    // Désactiver is_custom_accepted quand le paiement échoue
    const { error: shopUpdateError } = await locals.supabaseServiceRole
        .from('shops')
        .update({ is_custom_accepted: false })
        .eq('profile_id', profileId);

    if (shopUpdateError) {
        console.error('Error disabling custom requests after payment failure:', shopUpdateError);
        throw error(500, 'Failed to disable custom requests after payment failure');
    } else {
        console.log('✅ Disabled custom requests after payment failure for user:', profileId);
    }
}

async function handleAccountUpdated(account: Stripe.Account, locals: any) {
    console.log('🔍 Processing account.updated for account:', account.id);

    // Vérifier si le compte est maintenant actif
    if (account.charges_enabled && account.payouts_enabled) {
        // Mettre à jour is_active dans la base de données
        const { error: updateError } = await locals.supabaseServiceRole
            .from('stripe_connect_accounts')
            .update({ is_active: true })
            .eq('stripe_account_id', account.id);

        if (updateError) {
            console.error('Error updating account status:', updateError);
            throw error(500, 'Failed to update account status');
        } else {
            console.log('✅ Stripe Connect account activated:', account.id);
        }
    }
}

async function handleAccountAuthorized(account: Stripe.Account, locals: any) {
    console.log('🔍 Processing account.application.authorized for account:', account.id);

    // Quand l'application est autorisée, le compte est généralement actif
    if (account.charges_enabled && account.payouts_enabled) {
        // Mettre à jour is_active dans la base de données
        const { error: updateError } = await locals.supabaseServiceRole
            .from('stripe_connect_accounts')
            .update({ is_active: true })
            .eq('stripe_account_id', account.id);

        if (updateError) {
            console.error('Error updating account status:', updateError);
        } else {
            console.log('✅ Stripe Connect account authorized and activated:', account.id);
        }
    }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session, locals: any) {
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
}

async function handleProductOrderPayment(session: Stripe.Checkout.Session, locals: any) {
    try {
        // Récupérer les données de commande depuis les métadonnées
        const orderData = JSON.parse(session.metadata!.orderData);
        console.log('📝 Données de commande produit:', orderData);

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
                total_amount: orderData.totalPrice,
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
    } catch (err) {
        console.error('❌ Erreur traitement commande produit:', err);
    }
}

async function handleCustomOrderDeposit(session: Stripe.Checkout.Session, locals: any) {
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

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent, locals: any) {
    try {
        console.log('💰 Payment intent succeeded:', paymentIntent.id);

        // Récupérer la commande associée à ce payment intent
        const { data: order, error: orderError } = await locals.supabaseServiceRole
            .from('orders')
            .select('id, total_amount')
            .eq('stripe_payment_intent_id', paymentIntent.id)
            .single();

        if (orderError || !order) {
            console.log('⚠️ Commande non trouvée pour payment intent:', paymentIntent.id);
            return;
        }

        // Calculer le montant payé (en euros)
        const paidAmount = paymentIntent.amount / 100;

        // Mettre à jour la commande avec le montant payé
        const { error: updateError } = await locals.supabaseServiceRole
            .from('orders')
            .update({
                paid_amount: paidAmount
            })
            .eq('id', order.id);

        if (updateError) {
            console.error('❌ Erreur mise à jour paid_amount:', updateError);
            throw error(500, 'Failed to update paid amount');
        }

        console.log('✅ Montant payé mis à jour:', { orderId: order.id, paidAmount });
    } catch (err) {
        console.error('❌ Erreur traitement payment intent succeeded:', err);
    }
} 