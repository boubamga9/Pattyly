import { error } from '@sveltejs/kit';
import type { Stripe } from 'stripe';
import { forceRevalidateShop } from '$lib/utils/catalog/catalog-revalidation';
import { STRIPE_PRICES } from '$lib/config/server';

export async function upsertSubscription(subscription: Stripe.Subscription, locals: any): Promise<void> {
    try {
        const customerId = subscription.customer as string;

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
        const productId = subscription.items.data[0].price.product as string;
        const productLookupKey = subscription.items.data[0].price.lookup_key as string;
        const subscriptionId = subscription.id;

        // Déterminer le statut de l'abonnement
        let subscriptionStatus: 'active' | 'inactive' = 'inactive';

        if (subscription.status === 'active' || subscription.status === 'trialing' || subscription.status === 'past_due' || subscription.status === 'unpaid') {
            subscriptionStatus = 'active';
        }

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
            throw error(500, 'Failed to upsert subscription in database');
        }

        // Récupérer le slug de la boutique avant modification
        const { data: shopData } = await locals.supabaseServiceRole
            .from('shops')
            .select('slug')
            .eq('profile_id', profileId)
            .single();

        // Gérer l'état de la boutique selon le statut de l'abonnement
        if (subscriptionStatus === 'active') {


            if (productLookupKey === 'price_basic_monthly') {
                // Désactiver is_custom_accepted pour le plan basique (Starter)
                const { error: shopUpdateError } = await locals.supabaseServiceRole
                    .from('shops')
                    .update({ is_custom_accepted: false })
                    .eq('profile_id', profileId);

                if (shopUpdateError) {
                    throw error(500, 'Failed to disable custom requests for basic plan');
                }
            } else {
                // Pour Premium, activer is_custom_accepted
                const { error: shopUpdateError } = await locals.supabaseServiceRole
                    .from('shops')
                    .update({ is_custom_accepted: true })
                    .eq('profile_id', profileId);

                if (shopUpdateError) {
                    throw error(500, 'Failed to enable custom requests for premium plan');
                }
            }

            // Revalider le cache ISR avec délai pour éviter les race conditions
            if (shopData?.slug) {
                setTimeout(async () => {
                    await forceRevalidateShop(shopData.slug);
                }, 3000);
            }
        } else {
            // Abonnement inactif : désactiver les commandes personnalisées (retour au plan gratuit)
            const { error: shopUpdateError } = await locals.supabaseServiceRole
                .from('shops')
                .update({ is_custom_accepted: false })
                .eq('profile_id', profileId);

            if (shopUpdateError) {
                throw error(500, 'Failed to disable custom requests after subscription deactivation');
            }

            // Revalider le cache ISR avec délai
            if (shopData?.slug) {
                setTimeout(async () => {
                    await forceRevalidateShop(shopData.slug);
                }, 3000);
            }
        }

    } catch (err) {
        throw error(500, 'upsertSubscription failed: ' + err);
    }
}

export async function handleSubscriptionDeleted(subscription: Stripe.Subscription, locals: any): Promise<void> {

    try {

        const customerId = subscription.customer as string;

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
        const productId = subscription.items.data[0].price.product as string;

        // Marquer l'abonnement comme inactif
        const { error: updateError } = await locals.supabaseServiceRole
            .from('user_products')
            .update({
                subscription_status: 'inactive'
            })
            .eq('profile_id', profileId)
            .eq('stripe_product_id', productId);

        if (updateError) {
            throw error(500, 'Failed to update subscription status in database');
        }


    } catch (err) {
        throw error(500, 'handleSubscriptionDeleted failed: ' + err);
    }
}