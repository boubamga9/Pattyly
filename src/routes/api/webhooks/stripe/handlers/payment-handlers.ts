// handlers/payment-handlers.ts
import { error } from '@sveltejs/kit';
import Stripe from 'stripe';
import { EmailService } from '$lib/services/email-service';
import { PUBLIC_SITE_URL } from '$env/static/public';
import { PRIVATE_STRIPE_SECRET_KEY } from '$env/static/private';
import { forceRevalidateShop } from '$lib/utils/catalog/catalog-revalidation';

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

        // Récupérer le slug de la boutique avant de la réactiver
        const { data: shopData } = await locals.supabaseServiceRole
            .from('shops')
            .select('slug')
            .eq('profile_id', profileId)
            .single();

        // Réactiver is_active de la boutique
        const { error: shopUpdateError } = await locals.supabaseServiceRole
            .from('shops')
            .update({ is_active: true })
            .eq('profile_id', profileId);

        if (updateError) {
            throw error(500, 'Failed to reactivate subscription after payment success');
        }

        if (shopUpdateError) {
            throw error(500, 'Failed to reactivate shop after payment success');
        }

        // Revalider le cache ISR de la boutique
        if (shopData?.slug) {
            await forceRevalidateShop(shopData.slug);
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

        // Marquer l'abonnement comme inactif
        const { error: updateError } = await locals.supabaseServiceRole
            .from('user_products')
            .update({
                subscription_status: 'inactive'
            })
            .eq('profile_id', profileId);

        if (updateError) {
            throw error(500, 'Failed to update subscription status after payment failure');
        }

        // Désactiver la boutique et récupérer name + slug
        const { data: shopUpdateData, error: shopUpdateError } = await locals.supabaseServiceRole
            .from('shops')
            .update({
                is_custom_accepted: false,
                is_active: false
            })
            .eq('profile_id', profileId)
            .select('name, slug')
            .single();

        if (shopUpdateError) {
            throw error(500, 'Failed to disable shop after payment failure');
        }

        // Revalider le cache ISR de la boutique (ne bloque pas si erreur)
        if (shopUpdateData?.slug) {

            await forceRevalidateShop(shopUpdateData.slug);
        }

        // Envoyer l'email de notification de paiement échoué
        if (userShopData.email && shopUpdateData) {
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
                    shopName: shopUpdateData.name,
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

export async function handleTrialWillEnd(subscription: Stripe.Subscription, locals: any): Promise<void> {

    try {
        const customerId = subscription.customer as string;

        const { data: customerData, error } = await locals.supabaseServiceRole
            .from('stripe_customers')
            .select('profile_id')
            .eq('stripe_customer_id', customerId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                console.log('Customer not found for trial ending notification');
                return;
            }
            console.error('Error fetching customer from Supabase:', error);
            throw error; // ou return, selon ton besoin
        }

        if (!customerData) {
            console.log('Customer not found for trial ending notification');
            return;
        }

        const profileId = customerData.profile_id;

        // Récupérer les informations du pâtissier
        const { data: pastryData, error: pastryError } = await locals.supabaseServiceRole
            .from('profiles')
            .select('email')
            .eq('id', profileId)
            .single();

        if (pastryError || !pastryData) {
            console.error('Failed to get pastry chef data:', pastryError);
            return;
        }

        // Récupérer les informations de la boutique
        const { data: shopData, error: shopError } = await locals.supabaseServiceRole
            .from('shops')
            .select('name')
            .eq('profile_id', profileId)
            .single();

        if (shopError || !shopData) {
            console.error('Failed to get shop data:', shopError);
            return;
        }

        // Envoyer l'email de notification de fin de période d'essai
        if (pastryData.email && shopData) {
            try {
                // Créer une session de portail de facturation Stripe
                const stripe = new Stripe(PRIVATE_STRIPE_SECRET_KEY, {
                    apiVersion: '2024-04-10'
                });

                const portalSession = await stripe.billingPortal.sessions.create({
                    customer: customerId,
                    return_url: `${PUBLIC_SITE_URL}/dashboard/settings`,
                });

                await EmailService.sendTrialEndingNotification({
                    pastryEmail: pastryData.email,
                    shopName: shopData.name,
                    customerPortalUrl: portalSession.url,
                    date: new Date().toLocaleDateString("fr-FR"),
                });

                console.log(`Trial ending notification sent to ${pastryData.email}`);
            } catch (emailError) {
                console.error('Failed to send trial ending notification:', emailError);
                // Ne pas faire échouer toute la fonction si l'email échoue
            }
        }

    } catch (err) {
        console.error('handleTrialWillEnd error:', err);
        // Ne pas faire échouer le webhook si il y a une erreur
    }
}