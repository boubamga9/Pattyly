import { error } from '@sveltejs/kit';
import type { Stripe } from 'stripe';

export async function upsertSubscription(subscription: Stripe.Subscription, locals: any): Promise<void> {
    console.log('🔍 Handling subscription:', subscription.id);

    try {
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

        if (subscription.status === 'active') {
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

        console.log('✅ Subscription handled successfully');
    } catch (error) {
        console.error('❌ Error handling subscription:', error);
        throw error;
    }
}

export async function handleSubscriptionDeleted(subscription: Stripe.Subscription, locals: any): Promise<void> {
    console.log('🔍 Handling subscription deleted:', subscription.id);

    try {
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

        // Désactiver is_custom_accepted et is_active quand l'abonnement est supprimé
        const { error: shopUpdateError } = await locals.supabaseServiceRole
            .from('shops')
            .update({ is_custom_accepted: false, is_active: false })
            .eq('profile_id', profileId);

        if (shopUpdateError) {
            console.error('Error disabling custom requests after subscription deletion:', shopUpdateError);
            throw error(500, 'Failed to disable custom requests after subscription deletion');
        } else {
            console.log('✅ Disabled custom requests after subscription deletion for user:', profileId);
        }

        console.log('✅ Subscription deletion handled successfully');
    } catch (error) {
        console.error('❌ Error handling subscription deletion:', error);
        throw error;
    }
}