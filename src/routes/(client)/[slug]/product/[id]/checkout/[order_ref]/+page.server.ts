import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { EmailService } from '$lib/services/email-service';
import { PUBLIC_SITE_URL } from '$env/static/public';
import { ErrorLogger } from '$lib/services/error-logging';
import Stripe from 'stripe';
import { PRIVATE_STRIPE_SECRET_KEY } from '$env/static/private';
import { createStripeConnectCheckoutSession } from '$lib/stripe/connect-client';
import { getShopColorFromShopId } from '$lib/emails/helpers';

const stripe = new Stripe(PRIVATE_STRIPE_SECRET_KEY, {
    apiVersion: '2024-04-10'
});

export const load: PageServerLoad = async ({ params, locals, parent }) => {
    const { slug, id, order_ref } = params;

    try {
        // Récupérer hasPolicies depuis le layout parent
        const { hasPolicies } = await parent();
        // Récupérer la pending_order
        const { data: pendingOrder, error: pendingOrderError } = await (locals.supabaseServiceRole as any)
            .from('pending_orders')
            .select('*')
            .eq('order_ref', order_ref)
            .maybeSingle();

        // Si la pending_order n'existe pas, vérifier si une order existe déjà (paiement déjà confirmé)
        if (pendingOrderError || !pendingOrder) {
            // Vérifier si une order existe déjà avec cet order_ref
            const { data: existingOrder } = await (locals.supabaseServiceRole as any)
                .from('orders')
                .select('id, shops!inner(slug)')
                .eq('order_ref', order_ref)
                .maybeSingle();

            if (existingOrder) {
                // Rediriger vers la page de l'order si elle existe déjà
                throw redirect(303, `/${existingOrder.shops.slug}/order/${existingOrder.id}`);
            }

            console.error('Error fetching pending order:', pendingOrderError);
            throw error(404, 'Commande non trouvée');
        }

        const orderData = pendingOrder.order_data as any;

        // Récupérer les informations de la boutique
        const { data: shop, error: shopError } = await (locals.supabaseServiceRole as any)
            .from('shops')
            .select('id, name, slug, logo_url, profile_id, instagram, tiktok, website')
            .eq('id', orderData.shop_id)
            .eq('slug', slug)
            .single();

        if (shopError || !shop) {
            console.error('Error fetching shop:', shopError);
            throw error(404, 'Boutique non trouvée');
        }

        // Récupérer les informations du produit
        const { data: product, error: productError } = await (locals.supabaseServiceRole as any)
            .from('products')
            .select('id, name, description, image_url, base_price, deposit_percentage')
            .eq('id', orderData.product_id)
            .single();

        if (productError || !product) {
            console.error('Error fetching product:', productError);
            throw error(404, 'Produit non trouvé');
        }


        // Récupérer les payment_links (priorité à PayPal pour rétrocompatibilité)
        const { data: paymentLinks, error: paymentLinkError } = await (locals.supabaseServiceRole as any)
            .from('payment_links')
            .select('provider_type, payment_identifier')
            .eq('profile_id', shop.profile_id)
            .eq('is_active', true)
            .order('provider_type', { ascending: true }); // PayPal en premier

        // Récupérer aussi le compte Stripe Connect si actif ET configuré pour les commandes
        const { data: stripeConnectAccount } = await (locals.supabaseServiceRole as any)
            .from('stripe_connect_accounts')
            .select('stripe_account_id, use_for_orders')
            .eq('profile_id', shop.profile_id)
            .eq('is_active', true)
            .eq('charges_enabled', true)
            .eq('use_for_orders', true) // ✅ Vérifier que Stripe Connect est activé pour les commandes
            .single();

        // Si Stripe Connect est disponible ET activé pour les commandes, l'ajouter aux payment_links
        let allPaymentLinks = [...(paymentLinks || [])];
        if (stripeConnectAccount?.stripe_account_id && stripeConnectAccount?.use_for_orders) {
            const hasStripe = allPaymentLinks.some(pl => pl.provider_type === 'stripe');
            if (!hasStripe) {
                allPaymentLinks.push({
                    provider_type: 'stripe',
                    payment_identifier: stripeConnectAccount.stripe_account_id
                });
            }
        }

        // Trier pour mettre Stripe en premier, puis Wero, puis PayPal, puis Revolut
        allPaymentLinks.sort((a, b) => {
            const order = { stripe: 0, wero: 1, paypal: 2, revolut: 3 };
            const aOrder = order[a.provider_type as keyof typeof order] ?? 99;
            const bOrder = order[b.provider_type as keyof typeof order] ?? 99;
            return aOrder - bOrder;
        });

        if ((paymentLinkError && paymentLinkError.code !== 'PGRST116') || allPaymentLinks.length === 0) {
            console.error('Error fetching payment links:', paymentLinkError);
            throw error(500, 'Erreur lors du chargement des informations de paiement');
        }

        // Récupérer PayPal en priorité, sinon le premier disponible
        const paypalLink = allPaymentLinks.find((pl: any) => pl.provider_type === 'paypal');
        const paymentLink = paypalLink || allPaymentLinks[0];

        // Les customizations sont chargées dans le layout parent

        return {
            orderData,
            paypalMe: paymentLink.payment_identifier, // Utilise payment_identifier au lieu de paypal_me
            paymentLinks: allPaymentLinks, // Pour afficher toutes les options disponibles (inclut Stripe)
            shop,
            product,
            hasPolicies: hasPolicies || false,
        };

    } catch (err) {
        // Relancer les exceptions SvelteKit (Redirect, HTTPError)
        if (err && typeof err === 'object' && 'status' in err) {
            throw err;
        }
        console.error('Error in checkout load:', err);
        throw error(500, 'Erreur lors du chargement de la commande');
    }
};

export const actions: Actions = {
    createStripeCheckoutSession: async ({ params, request, locals }) => {
        const { slug, id, order_ref } = params;
        
        try {
            const formData = await request.formData();
            const orderRefFromForm = formData.get('orderRef') as string || order_ref;

            // Récupérer la pending_order
            const { data: pendingOrder, error: pendingOrderError } = await (locals.supabaseServiceRole as any)
                .from('pending_orders')
                .select('*')
                .eq('order_ref', orderRefFromForm)
                .single();

            if (pendingOrderError || !pendingOrder) {
                throw error(404, 'Commande non trouvée');
            }

            const orderData = pendingOrder.order_data as any;

            // Récupérer le shop et le produit
            const { data: shop } = await (locals.supabaseServiceRole as any)
                .from('shops')
                .select('profile_id, name')
                .eq('id', orderData.shop_id)
                .single();

            const { data: product } = await (locals.supabaseServiceRole as any)
                .from('products')
                .select('deposit_percentage')
                .eq('id', orderData.product_id)
                .single();

            // Récupérer le compte Stripe Connect ET vérifier qu'il est activé pour les commandes
            const { data: stripeConnectAccount } = await (locals.supabaseServiceRole as any)
                .from('stripe_connect_accounts')
                .select('stripe_account_id, use_for_orders')
                .eq('profile_id', shop.profile_id)
                .eq('is_active', true)
                .eq('charges_enabled', true)
                .eq('use_for_orders', true) // ✅ Vérifier que Stripe Connect est activé pour les commandes
                .single();

            if (!stripeConnectAccount?.stripe_account_id || !stripeConnectAccount?.use_for_orders) {
                throw error(400, 'Stripe Connect non disponible pour cette boutique');
            }

            const depositPercentage = product?.deposit_percentage ?? 50;
            const depositAmount = Math.round((orderData.total_amount * depositPercentage / 100) * 100); // En centimes
            const applicationFee = 0; // Pas de frais de plateforme pour l'instant

            const session = await createStripeConnectCheckoutSession(
                stripe,
                stripeConnectAccount.stripe_account_id,
                depositAmount,
                {
                    type: 'product_order_deposit',
                    orderId: pendingOrder.id,
                    shopId: orderData.shop_id,
                    productId: orderData.product_id,
                    orderRef: orderRefFromForm,
                },
                `${PUBLIC_SITE_URL}/${slug}/product/${id}/checkout/${orderRefFromForm}?payment=success`,
                `${PUBLIC_SITE_URL}/${slug}/product/${id}/checkout/${orderRefFromForm}`,
                applicationFee,
                `Acompte - ${shop.name}`,
                orderData.customer_email
            );

            return { success: true, checkoutUrl: session.url };
        } catch (err) {
            console.error('Error creating Stripe checkout session:', err);
            if (err && typeof err === 'object' && 'status' in err) {
                throw err;
            }
            throw error(500, 'Erreur lors de la création de la session de paiement');
        }
    },
    confirmPayment: async ({ params, request, locals }) => {
        const { slug, id, order_ref } = params;

        try {
            console.log('🚀 [Confirm Payment] Starting for order_ref:', order_ref);

            const formData = await request.formData();

            // ✅ OPTIMISÉ : Récupérer shopId, productId et orderRef depuis formData (passés par le frontend)
            const shopId = formData.get('shopId') as string;
            const productId = formData.get('productId') as string;
            const orderRefFromForm = formData.get('orderRef') as string || order_ref; // Fallback sur order_ref
            const paymentProvider = formData.get('paymentProvider') as string | null; // Provider utilisé (paypal, revolut, etc.)

            // 1. Récupérer la pending_order
            const { data: pendingOrder, error: pendingOrderError } = await (locals.supabaseServiceRole as any)
                .from('pending_orders')
                .select('*')
                .eq('order_ref', orderRefFromForm)
                .single();

            if (pendingOrderError || !pendingOrder) {
                await ErrorLogger.logCritical(
                    pendingOrderError || new Error('Pending order not found'),
                    {
                        orderRef: orderRefFromForm,
                        shopId: shopId,
                        productId: productId,
                    },
                    {
                        action: 'confirmPayment',
                        step: 'fetch_pending_order',
                    }
                );
                throw error(404, 'Commande non trouvée');
            }

            const orderData = pendingOrder.order_data;
            console.log('📦 [Confirm Payment] Order data:', orderData);

            // Vérifier que les IDs correspondent
            if (shopId && orderData.shop_id !== shopId) {
                throw error(403, 'Données de boutique invalides');
            }
            if (productId && orderData.product_id !== productId) {
                throw error(403, 'Données de produit invalides');
            }

            // 2. Récupérer les informations du produit et de la boutique
            // Utiliser shopId et productId depuis formData si disponibles, sinon depuis orderData
            const finalShopId = shopId || orderData.shop_id;
            const finalProductId = productId || orderData.product_id;

            const { data: product, error: productError } = await (locals.supabaseServiceRole as any)
                .from('products')
                .select('base_price, deposit_percentage, shops(slug, logo_url, name, profile_id)')
                .eq('id', finalProductId)
                .single();

            if (productError || !product) {
                await ErrorLogger.logCritical(
                    productError || new Error('Product not found'),
                    {
                        orderRef: orderRefFromForm,
                        shopId: finalShopId,
                        productId: finalProductId,
                    },
                    {
                        action: 'confirmPayment',
                        step: 'fetch_product',
                    }
                );
                throw error(500, 'Produit non trouvé');
            }

            // Récupérer l'email du profile séparément
            let pastryEmail: string | null = null;
            if (product.shops?.profile_id) {
                const { data: profile } = await (locals.supabaseServiceRole as any)
                    .from('profiles')
                    .select('email')
                    .eq('id', product.shops.profile_id)
                    .single();
                pastryEmail = profile?.email || null;
            }

            // 3. Calculer les montants
            const totalAmount = orderData.total_amount;
            const depositPercentage = product.deposit_percentage ?? 50; // Par défaut 50% si non défini
            const paidAmount = (totalAmount * depositPercentage) / 100;
            const remainingAmount = totalAmount - paidAmount;

            console.log('💰 [Confirm Payment] Amounts:', {
                totalAmount,
                paidAmount,
                remainingAmount
            });

            // 4. Créer l'order avec statut "to_verify"
            const { data: order, error: orderError } = await (locals.supabaseServiceRole as any)
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
                    status: 'to_verify',
                    total_amount: totalAmount,
                    paid_amount: paidAmount,
                    product_name: orderData.product_name,
                    product_base_price: product.base_price || 0,
                    order_ref: order_ref,
                    payment_provider: paymentProvider || null // Sauvegarder le provider utilisé
                })
                .select()
                .single();

            if (orderError || !order) {
                console.error('Error creating order:', orderError);
                throw error(500, 'Erreur lors de la création de la commande');
            }

            console.log('✅ [Confirm Payment] Order created with ID:', order.id);

            // ✅ Tracking: Order received (fire-and-forget pour ne pas bloquer)
            const { logEventAsync, Events } = await import('$lib/utils/analytics');
            logEventAsync(
                locals.supabaseServiceRole,
                Events.ORDER_RECEIVED,
                {
                    order_id: order.id,
                    order_ref,
                    shop_id: orderData.shop_id,
                    product_id: orderData.product_id,
                    total_amount: totalAmount,
                    order_type: 'product_order'
                },
                null, // Client orders don't have userId
                `/${slug}/product/${id}/checkout/${order_ref}`
            );

            // 5. Envoyer les emails spécifiques pour PayPal.me (en attente de vérification)
            try {
                console.log('📧 [Confirm Payment] Sending emails...');

                // Récupérer la couleur de la boutique pour l'email
                const shopColor = await getShopColorFromShopId(
                    locals.supabaseServiceRole,
                    orderData.shop_id
                );

                // Email au client (en attente de vérification)
                await EmailService.sendOrderPendingVerificationClient({
                    customerEmail: orderData.customer_email,
                    customerName: orderData.customer_name,
                    shopName: product.shops.name,
                    shopLogo: product.shops.logo_url,
                    productName: orderData.product_name,
                    pickupDate: orderData.pickup_date,
                    pickupTime: orderData.pickup_time,
                    totalAmount: totalAmount,
                    paidAmount: paidAmount,
                    remainingAmount: remainingAmount,
                    orderId: order.id,
                    orderUrl: `${PUBLIC_SITE_URL}/${product.shops.slug}/order/${order.id}`,
                    orderRef: order_ref,
                    date: new Date().toLocaleDateString('fr-FR'),
                    shopColor,
                });

                // Email au pâtissier (vérification requise)
                if (pastryEmail) {
                    await EmailService.sendOrderPendingVerificationPastry({
                        pastryEmail: pastryEmail,
                        customerName: orderData.customer_name,
                        customerEmail: orderData.customer_email,
                        customerInstagram: orderData.customer_instagram,
                        productName: orderData.product_name,
                        pickupDate: orderData.pickup_date,
                        pickupTime: orderData.pickup_time,
                        totalAmount: totalAmount,
                        paidAmount: paidAmount,
                        remainingAmount: remainingAmount,
                        orderId: order.id,
                        orderRef: order_ref,
                        dashboardUrl: `${PUBLIC_SITE_URL}/dashboard/orders/${order.id}`,
                        date: new Date().toLocaleDateString('fr-FR')
                    });
                }

                console.log('✅ [Confirm Payment] Emails sent successfully');
            } catch (emailError) {
                console.error('❌ [Confirm Payment] Email error:', emailError);
                // Ne pas bloquer la commande si les emails échouent
            }

            // 6. Supprimer la pending_order
            const { error: deleteError } = await (locals.supabaseServiceRole as any)
                .from('pending_orders')
                .delete()
                .eq('order_ref', order_ref);

            if (deleteError) {
                console.error('❌ [Confirm Payment] Failed to delete pending order:', deleteError);
                // Ne pas bloquer si la suppression échoue
            } else {
                console.log('✅ [Confirm Payment] Pending order deleted');
            }

            // 7. Rediriger vers la page de confirmation
            console.log('🔄 [Confirm Payment] Redirecting to order page:', order.id);
            throw redirect(303, `/${slug}/order/${order.id}`);

        } catch (err) {
            console.error('❌ [Confirm Payment] Error:', err);
            // Si c'est une redirection ou une erreur HTTP, la relancer
            if (err && typeof err === 'object' && 'status' in err) {
                throw err;
            }
            throw error(500, 'Erreur lors de la confirmation du paiement');
        }
    }
};

