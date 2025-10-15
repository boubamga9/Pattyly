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
        const priceId = subscription.items.data[0].price.id as string;
        const productLookupKey = subscription.items.data[0].price.lookup_key as string;
        const subscriptionId = subscription.id;

        // Déterminer le statut de l'abonnement
        let subscriptionStatus: 'active' | 'inactive' = 'inactive';

        if (subscription.status === 'active' || subscription.status === 'trialing') {
            subscriptionStatus = 'active';
        }

        // Vérifier si c'est un Early Adopter (prix spécial à 15€)
        const isEarlyAdopterPrice = priceId === STRIPE_PRICES.EARLY;

        if (isEarlyAdopterPrice && subscriptionStatus === 'active') {
            // Marquer l'utilisateur comme Early Adopter
            await locals.supabaseServiceRole
                .from('profiles')
                .update({
                    is_early_adopter: true,
                    early_adopter_offer_shown_at: new Date().toISOString()
                })
                .eq('id', profileId);

            console.log('✅ User marked as Early Adopter:', profileId);
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

        // Gérer is_custom_accepted selon le plan
        if (subscriptionStatus === 'active') {

            if (productLookupKey === 'price_basic_monthly') {
                // Désactiver is_custom_accepted pour le plan basique
                const { error: shopUpdateError } = await locals.supabaseServiceRole
                    .from('shops')
                    .update({ is_custom_accepted: false })
                    .eq('profile_id', profileId);

                if (shopUpdateError) {
                    throw error(500, 'Failed to disable custom requests for basic plan');
                }
            }

            // Revalider le cache ISR avec délai pour éviter les race conditions
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
        } else {
        }

        // Récupérer le slug de la boutique avant de la désactiver
        const { data: shopData } = await locals.supabaseServiceRole
            .from('shops')
            .select('slug')
            .eq('profile_id', profileId)
            .single();

        // Désactiver is_custom_accepted et is_active quand l'abonnement est supprimé
        const { error: shopUpdateError } = await locals.supabaseServiceRole
            .from('shops')
            .update({ is_custom_accepted: false, is_active: false })
            .eq('profile_id', profileId);

        if (shopUpdateError) {
            throw error(500, 'Failed to disable custom requests after subscription deletion');
        }

        // Revalider le cache ISR de la boutique avec délai
        if (shopData?.slug) {

            setTimeout(async () => {
                await forceRevalidateShop(shopData.slug);
            }, 3000);
        }

    } catch (err) {
        throw error(500, 'handleSubscriptionDeleted failed: ' + err);
    }
}