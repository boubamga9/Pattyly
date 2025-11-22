// handlers/payment-handlers.ts
import { error } from '@sveltejs/kit';
import Stripe from 'stripe';
import { EmailService } from '$lib/services/email-service';
import { PUBLIC_SITE_URL } from '$env/static/public';
import { PRIVATE_STRIPE_SECRET_KEY } from '$env/static/private';

export async function handlePaymentSucceeded(invoice: Stripe.Invoice, locals: any): Promise<void> {

    try {

        // Récupérer le customer_id depuis l'invoice
        const customerId = invoice.customer as string;

        // Récupérer le profile_id depuis stripe_customers
        const { data: customerData } = await locals.supabaseServiceRole
            .from('stripe_customers')
            .select('profile_id')
            .eq('stripe_customer_id', customerId)
            .single();

        if (!customerData) {
            return;
        }

        const profileId = customerData.profile_id;

        // Réactiver l'abonnement après un paiement réussi
        const { error: updateError } = await locals.supabaseServiceRole
            .from('user_products')
            .update({
                subscription_status: 'active'
            })
            .eq('profile_id', profileId);

        if (updateError) {
            throw error(500, 'Failed to reactivate subscription after payment success');
        }

    } catch (err) {
        throw error(500, 'handlePaymentSucceeded failed: ' + err);
    }
}

export async function handlePaymentFailed(invoice: Stripe.Invoice, locals: any): Promise<void> {
    try {
        // Récupérer le customer_id depuis l'invoice
        const customerId = invoice.customer as string;

        // Récupérer le profile_id depuis stripe_customers
        const { data: customerData } = await locals.supabaseServiceRole
            .from('stripe_customers')
            .select('profile_id')
            .eq('stripe_customer_id', customerId)
            .single();

        if (!customerData) {
            console.log('Customer not found for payment failed notification');
            return;
        }

        const profileId = customerData.profile_id;

        // Récupérer email du pâtissier + slug + name de la boutique en une seule requête
        const { data: userShopData, error: userShopError } = await locals.supabaseServiceRole
            .from('profiles')
            .select('email, shops(name, slug)')
            .eq('id', profileId)
            .single();

        if (userShopError || !userShopData) {
            console.error('Failed to get user/shop data:', userShopError);
            return;
        }

        // Envoyer l'email de notification de paiement échoué
        if (userShopData.email) {
            try {
                // Créer une session de portail de facturation Stripe
                const stripe = new Stripe(PRIVATE_STRIPE_SECRET_KEY, {
                    apiVersion: '2024-04-10'
                });

                const portalSession = await stripe.billingPortal.sessions.create({
                    customer: customerId,
                    return_url: `${PUBLIC_SITE_URL}/dashboard/settings`,
                });

                await EmailService.sendPaymentFailedNotification({
                    pastryEmail: userShopData.email,
                    shopName: userShopData.shops.name,
                    customerPortalUrl: portalSession.url,
                    date: new Date().toLocaleDateString("fr-FR"),
                });

                console.log(`Payment failed notification sent to ${userShopData.email}`);
            } catch (emailError) {
                console.error('Failed to send payment failed notification:', emailError);
            }
        }

    } catch (err) {
        throw error(500, 'handlePaymentFailed failed: ' + err);
    }
}