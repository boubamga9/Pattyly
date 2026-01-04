import type { Stripe } from 'stripe';
import StripeLib from 'stripe';
import { error } from '@sveltejs/kit';
import { EmailService } from '$lib/services/email-service';
import { PUBLIC_SITE_URL } from '$env/static/public';
import { PRIVATE_STRIPE_SECRET_KEY } from '$env/static/private';
import { fetchCurrentUsersSubscription } from '$lib/stripe/client-helpers';
import { STRIPE_PRODUCTS } from '$lib/config/server';
import { ErrorLogger } from '$lib/services/error-logging';

export async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session, locals: any): Promise<void> {
    console.log('handleCheckoutSessionCompleted', session);

    try {
        // Vérifier que c'est un paiement de commande (pas un abonnement)
        if (session.mode !== 'payment') return;

        const sessionType = session.metadata?.type;

        if (sessionType === 'product_order') {
            await handleProductOrderPayment(session, locals);
        } else if (sessionType === 'product_order_deposit') {
            await handleProductOrderDeposit(session, locals);
        } else if (sessionType === 'custom_order_deposit') {
            await handleCustomOrderDeposit(session, locals);
        } else if (sessionType === 'custom_order_deposit_stripe') {
            await handleCustomOrderDepositStripe(session, locals);
        } else if (sessionType === 'lifetime_plan') {
            await handleLifetimePlanPayment(session, locals);
        } else {
            console.warn('Unknown session type:', sessionType);
        }
    } catch (err) {
        await ErrorLogger.logCritical(err, {
            stripeSessionId: session.id,
            stripeEventType: session.metadata?.type,
            customerEmail: session.customer_details?.email,
        }, {
            handler: 'handleCheckoutSessionCompleted',
            sessionId: session.id,
        });
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
            await ErrorLogger.logCritical(
                pendingOrderError || new Error('Pending order not found'),
                {
                    stripeSessionId: session.id,
                    orderId: orderId,
                },
                {
                    handler: 'handleProductOrderPayment',
                    step: 'fetch_pending_order',
                }
            );
            throw error(500, 'Pending order not found');
        }

        const orderData = pendingOrder.order_data;

        const { data: product, error: productError } = await locals.supabaseServiceRole
            .from('products')
            .select('base_price, shops(slug, logo_url, name, profile_id)')
            .eq('id', orderData.productId)
            .single();

        if (productError || !product) {
            await ErrorLogger.logCritical(
                productError || new Error('Failed to get product'),
                {
                    stripeSessionId: session.id,
                    orderId: orderId,
                    productId: orderData.productId,
                    shopId: orderData.shopId,
                },
                {
                    handler: 'handleProductOrderPayment',
                    step: 'fetch_product',
                }
            );
            throw error(500, 'Failed to get product');
        }

        // Récupérer l'email du profile séparément
        let pastryEmail: string | null = null;
        if (product.shops?.profile_id) {
            const { data: profile } = await locals.supabaseServiceRole
                .from('profiles')
                .select('email')
                .eq('id', product.shops.profile_id)
                .single();
            pastryEmail = profile?.email || null;
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
            await ErrorLogger.logCritical(
                orderError || new Error('Failed to create product order'),
                {
                    stripeSessionId: session.id,
                    stripePaymentIntentId: session.payment_intent as string,
                    orderId: orderId,
                    productId: orderData.productId,
                    shopId: orderData.shopId,
                    customerEmail: orderData.customerEmail,
                    paidAmount: paidAmount / 100,
                },
                {
                    handler: 'handleProductOrderPayment',
                    step: 'create_order',
                    critical: true, // Paiement réussi mais commande non créée
                }
            );
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
                pickupTime: orderData.pickupTime,
                totalAmount: totalAmount,
                paidAmount: paidAmount / 100,
                remainingAmount: totalAmount - (paidAmount / 100),
                orderId: order.id,
                orderUrl: `${PUBLIC_SITE_URL}/${product.shops.slug}/orders/${order.id}`,
                date: new Date().toLocaleDateString("fr-FR"),
            });

            if (pastryEmail && product.shops?.profile_id) {
                // Envoyer l'email de notification
                await EmailService.sendOrderNotification({
                    pastryEmail: pastryEmail,
                    customerName: orderData.customerName,
                    customerEmail: orderData.customerEmail,
                    customerInstagram: orderData.customerInstagram,
                    productName: orderData.cakeName,
                    pickupDate: orderData.selectedDate,
                    pickupTime: orderData.pickupTime,
                    totalAmount: totalAmount,
                    paidAmount: paidAmount / 100,
                    remainingAmount: totalAmount - (paidAmount / 100),
                    orderId: order.id,
                    dashboardUrl: `${PUBLIC_SITE_URL}/dashboard/orders/${order.id}`,
                    date: new Date().toLocaleDateString("fr-FR"),
                });
            }
        } catch (err) {
            // Ne pas faire échouer le webhook si l'envoi des emails échoue
            // La commande est déjà créée avec succès
            await ErrorLogger.logCritical(err, {
                stripeSessionId: session.id,
                orderId: order.id,
                shopId: orderData.shopId,
                customerEmail: orderData.customerEmail,
            }, {
                handler: 'handleProductOrderPayment',
                step: 'send_emails',
            });
            console.error('Failed to send order emails, but order was created successfully:', err);
            // Ne pas throw - continuer le traitement même si les emails échouent
        }

        const { error: deleteError } = await locals.supabaseServiceRole
            .from('pending_orders')
            .delete()
            .eq('id', orderId);

        if (deleteError) {
            await ErrorLogger.logCritical(deleteError, {
                stripeSessionId: session.id,
                orderId: orderId,
            }, {
                handler: 'handleProductOrderPayment',
                step: 'delete_pending_order',
            });
            throw error(500, 'Failed to delete pending order');
        }

    } catch (err) {
        await ErrorLogger.logCritical(err, {
            stripeSessionId: session.id,
            orderId: orderId,
        }, {
            handler: 'handleProductOrderPayment',
            step: 'general_error',
        });
        throw error(500, 'handleProductOrderPayment failed: ' + err);
    }
}

export async function handleProductOrderDeposit(session: Stripe.Checkout.Session, locals: any): Promise<void> {
    try {
        console.log('handleProductOrderDeposit (Stripe Connect)', session);

        const orderId = session.metadata!.orderId; // pending_order.id

        const { data: pendingOrder, error: pendingOrderError } = await locals.supabaseServiceRole
            .from('pending_orders')
            .select('order_data')
            .eq('id', orderId)
            .single();

        if (pendingOrderError || !pendingOrder) {
            await ErrorLogger.logCritical(
                pendingOrderError || new Error('Pending order not found'),
                {
                    stripeSessionId: session.id,
                    orderId: orderId,
                },
                {
                    handler: 'handleProductOrderDeposit',
                    step: 'fetch_pending_order',
                }
            );
            throw error(500, 'Pending order not found');
        }

        const orderData = pendingOrder.order_data;

        const { data: product, error: productError } = await locals.supabaseServiceRole
            .from('products')
            .select('base_price, deposit_percentage, shops(slug, logo_url, name, profile_id)')
            .eq('id', orderData.product_id)
            .single();

        if (productError || !product) {
            await ErrorLogger.logCritical(
                productError || new Error('Failed to get product'),
                {
                    stripeSessionId: session.id,
                    orderId: orderId,
                    productId: orderData.product_id,
                    shopId: orderData.shop_id,
                },
                {
                    handler: 'handleProductOrderDeposit',
                    step: 'fetch_product',
                }
            );
            throw error(500, 'Failed to get product');
        }

        // Récupérer l'email du profile
        let pastryEmail: string | null = null;
        if (product.shops?.profile_id) {
            const { data: profile } = await locals.supabaseServiceRole
                .from('profiles')
                .select('email')
                .eq('id', product.shops.profile_id)
                .single();
            pastryEmail = profile?.email || null;
        }

        const totalAmount = orderData.total_amount;
        const depositPercentage = product.deposit_percentage ?? 50;
        const paidAmount = session.amount_total ?? 0; // En centimes
        const remainingAmount = totalAmount - (paidAmount / 100);

        // Créer l'order avec statut "confirmed" (automatique pour Stripe Connect)
        const { data: order, error: orderError } = await locals.supabaseServiceRole
            .from('orders')
            .insert({
                shop_id: orderData.shop_id,
                product_id: orderData.product_id,
                customer_name: orderData.customer_name,
                customer_email: orderData.customer_email,
                customer_phone: orderData.customer_phone || null,
                customer_instagram: orderData.customer_instagram || null,
                pickup_date: orderData.pickup_date,
                pickup_time: orderData.pickup_time || null,
                additional_information: orderData.additional_information || null,
                customization_data: orderData.customization_data || null,
                status: 'confirmed', // Automatique pour Stripe Connect
                total_amount: totalAmount,
                paid_amount: paidAmount / 100,
                product_name: orderData.product_name,
                product_base_price: product?.base_price || 0,
                order_ref: session.metadata!.orderRef || '',
                payment_provider: 'stripe',
                stripe_payment_intent_id: session.payment_intent as string,
                stripe_session_id: session.id
            })
            .select()
            .single();

        if (orderError || !order) {
            await ErrorLogger.logCritical(
                orderError || new Error('Failed to create product order'),
                {
                    stripeSessionId: session.id,
                    stripePaymentIntentId: session.payment_intent as string,
                    orderId: orderId,
                    productId: orderData.product_id,
                    shopId: orderData.shop_id,
                    customerEmail: orderData.customer_email,
                    paidAmount: paidAmount / 100,
                },
                {
                    handler: 'handleProductOrderDeposit',
                    step: 'create_order',
                    critical: true,
                }
            );
            throw error(500, 'Failed to create product order');
        }

        try {
            await EmailService.sendOrderConfirmation({
                customerEmail: orderData.customer_email,
                customerName: orderData.customer_name,
                shopName: product.shops.name,
                shopLogo: product.shops.logo_url,
                productName: orderData.product_name,
                pickupDate: orderData.pickup_date,
                pickupTime: orderData.pickup_time || null,
                totalAmount: totalAmount,
                paidAmount: paidAmount / 100,
                remainingAmount: remainingAmount,
                orderId: order.id,
                orderUrl: `${PUBLIC_SITE_URL}/${product.shops.slug}/order/${order.id}`,
            });

            if (pastryEmail && product.shops?.profile_id) {
                await EmailService.sendOrderNotification({
                    pastryEmail: pastryEmail,
                    customerName: orderData.customer_name,
                    customerEmail: orderData.customer_email,
                    customerInstagram: orderData.customer_instagram,
                    productName: orderData.product_name,
                    pickupDate: orderData.pickup_date,
                    pickupTime: orderData.pickup_time || null,
                    totalAmount: totalAmount,
                    paidAmount: paidAmount / 100,
                    remainingAmount: remainingAmount,
                    orderId: order.id,
                    dashboardUrl: `${PUBLIC_SITE_URL}/dashboard/orders/${order.id}`,
                });
            }
        } catch (err) {
            // Ne pas faire échouer le webhook si l'envoi des emails échoue
            // La commande est déjà créée avec succès
            await ErrorLogger.logCritical(err, {
                stripeSessionId: session.id,
                orderId: order.id,
                shopId: orderData.shop_id,
                customerEmail: orderData.customer_email,
            }, {
                handler: 'handleProductOrderDeposit',
                step: 'send_emails',
            });
            console.error('Failed to send order emails, but order was created successfully:', err);
            // Ne pas throw - continuer le traitement même si les emails échouent
        }

        // Supprimer la pending_order
        const { error: deleteError } = await locals.supabaseServiceRole
            .from('pending_orders')
            .delete()
            .eq('id', orderId);

        if (deleteError) {
            await ErrorLogger.logCritical(deleteError, {
                stripeSessionId: session.id,
                orderId: orderId,
            }, {
                handler: 'handleProductOrderDeposit',
                step: 'delete_pending_order',
            });
            throw error(500, 'Failed to delete pending order');
        }

    } catch (err) {
        await ErrorLogger.logCritical(err, {
            stripeSessionId: session.id,
            orderId: session.metadata?.orderId,
        }, {
            handler: 'handleProductOrderDeposit',
            step: 'general_error',
        });
        throw error(500, 'handleProductOrderDeposit failed: ' + err);
    }
}

export async function handleCustomOrderDepositStripe(session: Stripe.Checkout.Session, locals: any): Promise<void> {
    try {
        console.log('handleCustomOrderDepositStripe (Stripe Connect)', session);

        const orderId = session.metadata!.orderId; // order.id (déjà créée avec statut quoted)

        const { data: order, error: orderError } = await locals.supabaseServiceRole
            .from('orders')
            .select('*, shops(slug, logo_url, name, profile_id)')
            .eq('id', orderId)
            .eq('status', 'quoted') // S'assurer que c'est bien un devis en attente
            .single();

        if (orderError || !order) {
            await ErrorLogger.logCritical(
                orderError || new Error('Order not found'),
                {
                    stripeSessionId: session.id,
                    orderId: orderId,
                },
                {
                    handler: 'handleCustomOrderDepositStripe',
                    step: 'fetch_order',
                }
            );
            throw error(500, 'Order not found');
        }

        const paidAmount = session.amount_total ?? 0; // En centimes
        const remainingAmount = order.total_amount - (paidAmount / 100);

        // Mettre à jour l'order avec statut "confirmed" (automatique pour Stripe Connect)
        const { data: updatedOrder, error: updateError } = await locals.supabaseServiceRole
            .from('orders')
            .update({
                status: 'confirmed',
                paid_amount: paidAmount / 100,
                payment_provider: 'stripe',
                stripe_payment_intent_id: session.payment_intent as string,
                stripe_session_id: session.id
            })
            .eq('id', orderId)
            .select()
            .single();

        if (updateError || !updatedOrder) {
            await ErrorLogger.logCritical(
                updateError || new Error('Failed to update custom order'),
                {
                    stripeSessionId: session.id,
                    stripePaymentIntentId: session.payment_intent as string,
                    orderId: orderId,
                    paidAmount: paidAmount / 100,
                },
                {
                    handler: 'handleCustomOrderDepositStripe',
                    step: 'update_order',
                    critical: true,
                }
            );
            throw error(500, 'Failed to update custom order');
        }

        // Récupérer l'email du profile
        let pastryEmail: string | null = null;
        if (order.shops?.profile_id) {
            const { data: profile } = await locals.supabaseServiceRole
                .from('profiles')
                .select('email')
                .eq('id', order.shops.profile_id)
                .single();
            pastryEmail = profile?.email || null;
        }

        try {
            await EmailService.sendOrderConfirmation({
                customerEmail: order.customer_email,
                customerName: order.customer_name,
                shopName: order.shops.name,
                shopLogo: order.shops.logo_url,
                productName: 'Commande personnalisée',
                pickupDate: order.pickup_date,
                pickupTime: order.pickup_time,
                totalAmount: order.total_amount,
                paidAmount: paidAmount / 100,
                remainingAmount: remainingAmount,
                orderId: order.id,
                orderUrl: `${PUBLIC_SITE_URL}/${order.shops.slug}/order/${order.id}`,
            });

            if (pastryEmail) {
                await EmailService.sendOrderNotification({
                    pastryEmail: pastryEmail,
                    customerName: order.customer_name,
                    customerEmail: order.customer_email,
                    customerInstagram: order.customer_instagram,
                    productName: 'Commande personnalisée',
                    pickupDate: order.pickup_date,
                    pickupTime: order.pickup_time,
                    totalAmount: order.total_amount,
                    paidAmount: paidAmount / 100,
                    remainingAmount: remainingAmount,
                    orderId: order.id,
                    dashboardUrl: `${PUBLIC_SITE_URL}/dashboard/orders/${order.id}`,
                });
            }
        } catch (err) {
            // Ne pas faire échouer le webhook si l'envoi des emails échoue
            // La commande est déjà mise à jour avec succès
            await ErrorLogger.logCritical(err, {
                stripeSessionId: session.id,
                orderId: orderId,
            }, {
                handler: 'handleCustomOrderDepositStripe',
                step: 'send_emails',
            });
            console.error('Failed to send confirmation emails, but order was updated successfully:', err);
            // Ne pas throw - continuer le traitement même si les emails échouent
        }

    } catch (err) {
        await ErrorLogger.logCritical(err, {
            stripeSessionId: session.id,
            orderId: session.metadata?.orderId,
        }, {
            handler: 'handleCustomOrderDepositStripe',
            step: 'general_error',
        });
        throw error(500, 'handleCustomOrderDepositStripe failed: ' + err);
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
            .select('customer_email, customer_name, shops(name, slug, logo_url, profile_id), pickup_date')
            .single();

        if (orderError || !order) {
            await ErrorLogger.logCritical(
                orderError || new Error('Failed to update custom order'),
                {
                    stripeSessionId: session.id,
                    stripePaymentIntentId: session.payment_intent as string,
                    orderId: orderId,
                    depositAmount: depositAmount / 100,
                },
                {
                    handler: 'handleCustomOrderDeposit',
                    step: 'update_order',
                    critical: true, // Paiement réussi mais commande non mise à jour
                }
            );
            throw error(500, 'Failed to update custom order');
        }

        // Récupérer l'email du profile séparément
        let pastryEmail: string | null = null;
        if (order.shops?.profile_id) {
            const { data: profile } = await locals.supabaseServiceRole
                .from('profiles')
                .select('email')
                .eq('id', order.shops.profile_id)
                .single();
            pastryEmail = profile?.email || null;
        }

        try {
            await EmailService.sendQuoteConfirmation({
                customerEmail: order.customer_email,
                customerName: order.customer_name,
                shopName: order.shops.name,
                shopLogo: order.shops.logo_url,
                pickupDate: order.pickup_date,
                pickupTime: order.pickup_time,
                totalPrice: totalPrice,
                depositAmount: depositAmount / 100,
                remainingAmount: totalPrice - (depositAmount / 100),
                orderId: orderId,
                orderUrl: `${PUBLIC_SITE_URL}/${order.shops.slug}/orders/${orderId}`,
                date: new Date().toLocaleDateString("fr-FR"),
            });

            if (pastryEmail) {
                await EmailService.sendQuotePayment({
                    pastryEmail: pastryEmail,
                    customerName: order.customer_name,
                    customerEmail: order.customer_email,
                    pickupDate: order.pickup_date,
                    pickupTime: order.pickup_time,
                    totalPrice: totalPrice,
                    depositAmount: depositAmount / 100,
                    remainingAmount: totalPrice - (depositAmount / 100),
                    orderId: orderId,
                    dashboardUrl: `${PUBLIC_SITE_URL}/dashboard/orders/${orderId}`,
                    date: new Date().toLocaleDateString("fr-FR"),
                });
            }
        } catch (err) {
            // Ne pas faire échouer le webhook si l'envoi des emails échoue
            // La commande est déjà mise à jour avec succès
            await ErrorLogger.logCritical(err, {
                stripeSessionId: session.id,
                orderId: orderId,
            }, {
                handler: 'handleCustomOrderDeposit',
                step: 'send_emails',
            });
            console.error('Failed to send deposit emails, but order was updated successfully:', err);
            // Ne pas throw - continuer le traitement même si les emails échouent
        }

    } catch (err) {
        await ErrorLogger.logCritical(err, {
            stripeSessionId: session.id,
            orderId: orderId,
        }, {
            handler: 'handleCustomOrderDeposit',
            step: 'general_error',
        });
        throw error(500, 'handleCustomOrderDeposit failed: ' + err);
    }
}

export async function handleLifetimePlanPayment(
    session: Stripe.Checkout.Session,
    locals: any
): Promise<void> {
    try {
        console.log('🔄 [Lifetime Plan] Processing lifetime plan purchase', session.id);

        const customerId = session.customer as string;
        const stripe = new StripeLib(PRIVATE_STRIPE_SECRET_KEY, {
            apiVersion: '2024-04-10'
        });

        // 1. Récupérer le profile_id depuis stripe_customers
        const { data: customerData, error: customerError } = await locals.supabaseServiceRole
            .from('stripe_customers')
            .select('profile_id')
            .eq('stripe_customer_id', customerId)
            .single();

        if (customerError || !customerData) {
            await ErrorLogger.logCritical(
                customerError || new Error('Customer not found'),
                {
                    stripeSessionId: session.id,
                    stripeCustomerId: customerId,
                },
                {
                    handler: 'handleLifetimePlanPayment',
                    step: 'fetch_customer',
                    critical: true, // Paiement réussi mais client non trouvé
                }
            );
            throw error(500, 'Customer not found');
        }

        const profileId = customerData.profile_id;

        // 2. Récupérer les abonnements actifs et les annuler
        const currentSubscriptions = await fetchCurrentUsersSubscription(
            stripe,
            customerId
        );

        if (currentSubscriptions.length > 0) {
            console.log(`🔄 [Lifetime Plan] Cancelling ${currentSubscriptions.length} active subscription(s)`);

            const cancelPromises = currentSubscriptions.map(async (sub) => {
                try {
                    await stripe.subscriptions.cancel(sub.id);
                    console.log(`✅ [Lifetime Plan] Cancelled subscription ${sub.id}`);
                } catch (cancelError) {
                    console.error(`❌ [Lifetime Plan] Failed to cancel subscription ${sub.id}:`, cancelError);
                    // On continue même si une annulation échoue
                }
            });

            await Promise.all(cancelPromises);

            // 3. Mettre à jour les abonnements dans la base de données (passer à inactive)
            const subscriptionIds = currentSubscriptions.map(s => s.id);
            const { error: updateError } = await locals.supabaseServiceRole
                .from('user_products')
                .update({ subscription_status: 'inactive' })
                .eq('profile_id', profileId)
                .in('stripe_subscription_id', subscriptionIds);

            if (updateError) {
                await ErrorLogger.logCritical(updateError, {
                    stripeSessionId: session.id,
                    profileId: profileId,
                    subscriptionIds: subscriptionIds,
                }, {
                    handler: 'handleLifetimePlanPayment',
                    step: 'update_subscription_status',
                });
            } else {
                console.log('✅ [Lifetime Plan] Updated subscription status to inactive');
            }
        }

        // 4. Enregistrer le plan à vie dans user_products
        const lifetimeProductId = STRIPE_PRODUCTS.LIFETIME;
        if (!lifetimeProductId) {
            const configError = new Error('STRIPE_PRODUCTS.LIFETIME not configured');
            await ErrorLogger.logCritical(configError, {
                stripeSessionId: session.id,
                profileId: profileId,
            }, {
                handler: 'handleLifetimePlanPayment',
                step: 'check_config',
                critical: true,
            });
            throw error(500, 'Lifetime product not configured');
        }

        const { error: upsertError } = await locals.supabaseServiceRole
            .from('user_products')
            .upsert({
                profile_id: profileId,
                stripe_product_id: lifetimeProductId,
                stripe_subscription_id: null, // Pas d'abonnement pour le plan à vie
                subscription_status: 'active'
            }, {
                onConflict: 'profile_id'
            });

        if (upsertError) {
            await ErrorLogger.logCritical(upsertError, {
                stripeSessionId: session.id,
                profileId: profileId,
                lifetimeProductId: lifetimeProductId,
            }, {
                handler: 'handleLifetimePlanPayment',
                step: 'upsert_lifetime_plan',
                critical: true, // Paiement réussi mais plan non enregistré
            });
            throw error(500, 'Failed to save lifetime plan');
        }

        console.log('✅ [Lifetime Plan] Lifetime plan activated successfully');

        // 5. Activer les fonctionnalités Premium (is_custom_accepted)
        const { error: shopUpdateError } = await locals.supabaseServiceRole
            .from('shops')
            .update({ is_custom_accepted: true })
            .eq('profile_id', profileId);

        if (shopUpdateError) {
            await ErrorLogger.logCritical(shopUpdateError, {
                stripeSessionId: session.id,
                profileId: profileId,
            }, {
                handler: 'handleLifetimePlanPayment',
                step: 'enable_custom_requests',
            });
        } else {
            console.log('✅ [Lifetime Plan] Enabled custom requests for shop');
        }

    } catch (err) {
        await ErrorLogger.logCritical(err, {
            stripeSessionId: session.id,
            customerId: customerId,
        }, {
            handler: 'handleLifetimePlanPayment',
            step: 'general_error',
        });
        throw error(500, 'handleLifetimePlanPayment failed: ' + err);
    }
}
