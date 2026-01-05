import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { EmailService } from '$lib/services/email-service';
import { PUBLIC_SITE_URL } from '$env/static/public';
import Stripe from 'stripe';
import { PRIVATE_STRIPE_SECRET_KEY } from '$env/static/private';
import { createStripeConnectCheckoutSession } from '$lib/stripe/connect-client';

const stripe = new Stripe(PRIVATE_STRIPE_SECRET_KEY, {
    apiVersion: '2024-04-10'
});

export const load: PageServerLoad = async ({ params, locals, parent }) => {
    const { slug, order_ref } = params;

    try {
        // Récupérer hasPolicies depuis le layout parent
        const { hasPolicies } = await parent();
        // ✅ OPTIMISÉ : Charger order d'abord, puis shop et payment_links en parallèle
        // Récupérer l'order avec order_ref et vérification du slug
        const { data: order, error: orderError } = await (locals.supabaseServiceRole as any)
            .from('orders')
            .select('*, shops!inner(slug, id, name, logo_url, profile_id, instagram, tiktok, website)')
            .eq('order_ref', order_ref)
            .eq('shops.slug', slug)
            .eq('status', 'quoted') // Seulement les devis en attente de paiement
            .single();

        if (orderError || !order) {
            console.error('Error fetching order:', orderError);
            throw error(404, 'Devis non trouvé');
        }

        // Extraire shop depuis la relation
        const shop = order.shops;

        // Récupérer les payment_links (priorité à PayPal pour rétrocompatibilité)
        const { data: paymentLinks, error: paymentLinkError } = await (locals.supabaseServiceRole as any)
            .from('payment_links')
            .select('provider_type, payment_identifier')
            .eq('profile_id', shop.profile_id)
            .eq('is_active', true)
            .order('provider_type', { ascending: true }); // PayPal en premier

        // Récupérer aussi le compte Stripe Connect si actif
        const { data: stripeConnectAccount } = await (locals.supabaseServiceRole as any)
            .from('stripe_connect_accounts')
            .select('stripe_account_id')
            .eq('profile_id', shop.profile_id)
            .eq('is_active', true)
            .eq('charges_enabled', true)
            .single();

        // Si Stripe Connect est disponible, l'ajouter aux payment_links (seulement s'il n'existe pas déjà)
        let allPaymentLinks = [...(paymentLinks || [])];
        if (stripeConnectAccount?.stripe_account_id) {
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

        // Retourner order sans la relation shops (déjà extraite)
        const { shops, ...orderWithoutShops } = order;

        // Les customizations sont chargées dans le layout parent

        return {
            order: orderWithoutShops,
            paypalMe: paymentLink.payment_identifier, // Utilise payment_identifier au lieu de paypal_me
            paymentLinks: allPaymentLinks, // Pour afficher toutes les options disponibles (inclut Stripe)
            shop,
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
    openPayPal: async ({ params, request, locals }) => {
        // Just return success, the frontend will handle the redirect
        return { success: true };
    },
    createStripeCheckoutSession: async ({ params, request, locals }) => {
        const { slug, order_ref } = params;
        
        try {
            const formData = await request.formData();
            const orderId = formData.get('orderId') as string;

            // Récupérer la commande
            const orderQuery = (locals.supabaseServiceRole as any)
                .from('orders')
                .select('*, shops!inner(profile_id, name, slug)')
                .eq('status', 'quoted');

            if (orderId) {
                orderQuery.eq('id', orderId);
            } else {
                orderQuery.eq('order_ref', order_ref);
            }

            const { data: order, error: orderError } = await orderQuery.single();

            if (orderError || !order) {
                throw error(404, 'Devis non trouvé');
            }

            // Récupérer le compte Stripe Connect
            const { data: stripeConnectAccount } = await (locals.supabaseServiceRole as any)
                .from('stripe_connect_accounts')
                .select('stripe_account_id')
                .eq('profile_id', order.shops.profile_id)
                .eq('is_active', true)
                .eq('charges_enabled', true)
                .single();

            if (!stripeConnectAccount?.stripe_account_id) {
                throw error(400, 'Stripe Connect non disponible pour cette boutique');
            }

            const depositAmount = Math.round((order.total_amount / 2) * 100); // 50% en centimes
            const applicationFee = 0; // Pas de frais de plateforme pour l'instant

            const session = await createStripeConnectCheckoutSession(
                stripe,
                stripeConnectAccount.stripe_account_id,
                depositAmount,
                {
                    type: 'custom_order_deposit_stripe',
                    orderId: order.id,
                    shopId: order.shop_id,
                    orderRef: order_ref || order.order_ref || '',
                },
                `${PUBLIC_SITE_URL}/${slug}/order/${order.id}`,
                `${PUBLIC_SITE_URL}/${slug}/custom/checkout/${order_ref}`,
                applicationFee,
                `Acompte - ${order.shops.name}`,
                order.customer_email
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
        const { slug, order_ref } = params;

        try {
            console.log('🚀 [Confirm Custom Payment] Starting for order_ref:', order_ref);

            // ✅ OPTIMISÉ : Récupérer orderId depuis formData si disponible, sinon utiliser order_ref
            const formData = await request.formData();
            const orderId = formData.get('orderId') as string;
            const paymentProvider = formData.get('paymentProvider') as string | null; // Provider utilisé (paypal, revolut, etc.)

            // 1. Récupérer l'order (avec orderId si disponible, sinon avec order_ref)
            const orderQuery = (locals.supabaseServiceRole as any)
                .from('orders')
                .select('*, shops(slug, logo_url, name, profile_id)')
                .eq('status', 'quoted');

            if (orderId) {
                orderQuery.eq('id', orderId);
            } else {
                orderQuery.eq('order_ref', order_ref);
            }

            const { data: order, error: orderError } = await orderQuery.single();

            if (orderError || !order) {
                console.error('Error fetching order:', orderError);
                throw error(404, 'Devis non trouvé');
            }

            // Récupérer l'email du profile séparément
            let pastryEmail: string | null = null;
            if (order.shops?.profile_id) {
                const { data: profile } = await (locals.supabaseServiceRole as any)
                    .from('profiles')
                    .select('email')
                    .eq('id', order.shops.profile_id)
                    .single();
                pastryEmail = profile?.email || null;
            }

            // 2. Calculer les montants
            const totalAmount = order.total_amount;
            const paidAmount = totalAmount / 2; // Acompte de 50%
            const remainingAmount = totalAmount - paidAmount;

            console.log('💰 [Confirm Custom Payment] Amounts:', {
                totalAmount,
                paidAmount,
                remainingAmount
            });

            // 3. Mettre à jour l'order avec statut selon le provider
            // Pour Stripe Connect, on ne devrait pas arriver ici (paiement géré par webhook)
            // Pour PayPal/Revolut, on met "to_verify" pour vérification manuelle
            // Note: Si paymentProvider === 'stripe', cela ne devrait pas arriver car Stripe utilise createStripeCheckoutSession
            const orderStatus = 'to_verify';
            
            const { data: updatedOrder, error: updateError } = await (locals.supabaseServiceRole as any)
                .from('orders')
                .update({
                    status: orderStatus,
                    paid_amount: paidAmount,
                    payment_provider: paymentProvider || null // Sauvegarder le provider utilisé
                })
                .eq('id', order.id)
                .select()
                .single();

            if (updateError || !updatedOrder) {
                console.error('Error updating order:', updateError);
                throw error(500, 'Erreur lors de la confirmation du paiement');
            }

            console.log(`✅ [Confirm Custom Payment] Order updated to ${orderStatus}`);

            // 4. Envoyer les emails selon le provider
            // Pour Stripe Connect, envoyer des emails de confirmation (pas "pending verification")
            // Pour PayPal/Revolut, envoyer des emails "pending verification"
            try {
                console.log('📧 [Confirm Custom Payment] Sending emails...');

                if (paymentProvider === 'stripe') {
                    // Pour Stripe Connect, utiliser les emails de confirmation normale
                    await EmailService.sendOrderConfirmation({
                        customerEmail: order.customer_email,
                        customerName: order.customer_name,
                        shopName: order.shops.name,
                        shopLogo: order.shops.logo_url,
                        productName: 'Commande personnalisée',
                        pickupDate: order.pickup_date,
                        pickupTime: order.pickup_time,
                        totalAmount: totalAmount,
                        paidAmount: paidAmount,
                        orderId: order.id,
                        orderUrl: `${PUBLIC_SITE_URL}/${order.shops.slug}/order/${order.id}`,
                    });
                } else {
                    // Email au client (en attente de vérification pour PayPal/Revolut)
                    await EmailService.sendOrderPendingVerificationClient({
                    customerEmail: order.customer_email,
                    customerName: order.customer_name,
                    shopName: order.shops.name,
                    shopLogo: order.shops.logo_url,
                    productName: 'Commande personnalisée',
                    pickupDate: order.pickup_date,
                    pickupTime: order.pickup_time,
                    totalAmount: totalAmount,
                    paidAmount: paidAmount,
                    remainingAmount: remainingAmount,
                    orderId: order.id,
                    orderUrl: `${PUBLIC_SITE_URL}/${order.shops.slug}/order/${order.id}`,
                    orderRef: order_ref,
                    date: new Date().toLocaleDateString('fr-FR')
                });

                // Email au pâtissier (vérification requise)
                if (pastryEmail) {
                    await EmailService.sendOrderPendingVerificationPastry({
                        pastryEmail: pastryEmail,
                        customerName: order.customer_name,
                        customerEmail: order.customer_email,
                        customerInstagram: order.customer_instagram,
                        productName: 'Commande personnalisée',
                        pickupDate: order.pickup_date,
                        pickupTime: order.pickup_time,
                        totalAmount: totalAmount,
                        paidAmount: paidAmount,
                        remainingAmount: remainingAmount,
                        orderId: order.id,
                        orderRef: order_ref,
                        dashboardUrl: `${PUBLIC_SITE_URL}/dashboard/orders/${order.id}`,
                        date: new Date().toLocaleDateString('fr-FR')
                    });
                }
                }

                console.log('✅ [Confirm Custom Payment] Emails sent successfully');
            } catch (emailError) {
                console.error('❌ [Confirm Custom Payment] Email error:', emailError);
                // Ne pas bloquer la commande si les emails échouent
            }

            // 5. Rediriger vers la page de confirmation
            console.log('🔄 [Confirm Custom Payment] Redirecting to order page:', order.id);
            throw redirect(303, `/${slug}/order/${order.id}`);

        } catch (err) {
            console.error('❌ [Confirm Custom Payment] Error:', err);
            // Si c'est une redirection ou une erreur HTTP, la relancer
            if (err && typeof err === 'object' && 'status' in err) {
                throw err;
            }
            throw error(500, 'Erreur lors de la confirmation du paiement');
        }
    }
};
