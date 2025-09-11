import { error } from '@sveltejs/kit';
import type { Stripe } from 'stripe';

export async function upsertSubscription(subscription: Stripe.Subscription, locals: any): Promise<void> {
    console.log('upsertSubscription', subscription);
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
        const subscriptionId = subscription.id;

        // Déterminer le statut de l'abonnement
        let subscriptionStatus: 'active' | 'inactive' = 'inactive';

        if (subscription.status === 'active') {
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
        } else {
        }

        // Gérer is_custom_accepted selon le plan
        if (subscriptionStatus === 'active') {
            const isBasicPlan = productId === 'prod_Selbd3Ne2plHqG'; // Plan basique
            const isPremiumPlan = productId === 'prod_Selcz36pAfV3vV'; // Plan premium


            if (isBasicPlan) {
                // Désactiver is_custom_accepted pour le plan basique
                const { error: shopUpdateError } = await locals.supabaseServiceRole
                    .from('shops')
                    .update({ is_custom_accepted: false })
                    .eq('profile_id', profileId);

                if (shopUpdateError) {
                    throw error(500, 'Failed to disable custom requests for basic plan');
                } else {
                }
            } else if (isPremiumPlan) {
                // Le plan premium peut avoir is_custom_accepted activé (mais on ne le force pas)
            }
        }

    } catch (error) {
        throw error;
    }
}

export async function handleSubscriptionDeleted(subscription: Stripe.Subscription, locals: any): Promise<void> {

    console.log('handleSubscriptionDeleted', subscription);

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

        // Désactiver is_custom_accepted et is_active quand l'abonnement est supprimé
        const { error: shopUpdateError } = await locals.supabaseServiceRole
            .from('shops')
            .update({ is_custom_accepted: false, is_active: false })
            .eq('profile_id', profileId);

        if (shopUpdateError) {
            throw error(500, 'Failed to disable custom requests after subscription deletion');
        } else {
        }

    } catch (error) {
        throw error;
    }
}