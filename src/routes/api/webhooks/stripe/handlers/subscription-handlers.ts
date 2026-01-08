import { error } from '@sveltejs/kit';
import type { Stripe } from 'stripe';
import { forceRevalidateShop } from '$lib/utils/catalog/catalog-revalidation';
import { STRIPE_PRICES } from '$lib/config/server';
import { ErrorLogger } from '$lib/services/error-logging';
import { logger } from '$lib/utils/logger';

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

        // ✅ Vérifier si l'abonnement existait déjà AVANT l'upsert (pour éviter de logger plusieurs fois)
        const { data: existingSubscription, error: existingError } = await locals.supabaseServiceRole
            .from('user_products')
            .select('stripe_subscription_id, subscription_status')
            .eq('profile_id', profileId)
            .maybeSingle(); // Utiliser maybeSingle() au lieu de single() pour éviter les erreurs si non trouvé

        const isNewSubscription = !existingSubscription || !existingSubscription.stripe_subscription_id;
        const wasInactive = existingSubscription && existingSubscription.subscription_status === 'inactive';
        const hasDifferentSubscriptionId = existingSubscription && 
            existingSubscription.stripe_subscription_id && 
            existingSubscription.stripe_subscription_id !== subscriptionId;

        logger.log('🔍 [Subscription Webhook] Checking subscription:', {
            profileId,
            subscriptionId,
            subscriptionStatus,
            stripeStatus: subscription.status,
            isNewSubscription,
            wasInactive,
            hasDifferentSubscriptionId,
            existingSubscription: existingSubscription ? {
                stripe_subscription_id: existingSubscription.stripe_subscription_id,
                subscription_status: existingSubscription.subscription_status
            } : null
        });

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
            await ErrorLogger.logCritical(upsertError, {
                stripeSubscriptionId: subscriptionId,
                profileId: profileId,
                productId: productId,
            }, {
                handler: 'upsertSubscription',
                step: 'upsert_subscription',
                critical: true, // Abonnement Stripe actif mais non enregistré en base
            });
            throw error(500, 'Failed to upsert subscription in database');
        }

        // Récupérer le slug de la boutique avant modification
        const { data: shopData } = await locals.supabaseServiceRole
            .from('shops')
            .select('slug')
            .eq('profile_id', profileId)
            .single();

        // ✅ Mettre à jour Resend avec le nouveau plan (fire-and-forget)
        try {
            const { data: authUser } = await locals.supabaseServiceRole.auth.admin.getUserById(profileId);
            if (authUser?.user?.email) {
                const { syncPastryToResend } = await import('$lib/utils/resend-sync');
                syncPastryToResend(profileId, authUser.user.email, locals.supabaseServiceRole).catch(err => {
                    console.error('Erreur synchronisation Resend après changement plan:', err);
                });
            }
        } catch (err) {
            console.error('Erreur récupération email pour Resend:', err);
        }

        // ✅ NOUVEAU : Activer l'affiliation si elle existe
        // Activer si : nouvelle souscription OU passage de inactive à active
        const shouldActivateAffiliation = subscriptionStatus === 'active' && (isNewSubscription || wasInactive);
        
        if (shouldActivateAffiliation) {
            logger.log('🔍 [Affiliation] Vérification activation affiliation:', {
                profileId,
                isNewSubscription,
                wasInactive,
                subscriptionStatus
            });

            // Récupérer l'affiliation en attente
            const { data: affiliation, error: affiliationError } = await locals.supabaseServiceRole
                .from('affiliations')
                .select('*')
                .eq('referred_profile_id', profileId)
                .eq('status', 'pending')
                .maybeSingle();
            
            if (affiliationError) {
                logger.log('❌ [Affiliation] Erreur récupération affiliation:', affiliationError);
            } else if (affiliation) {
                logger.log('✅ [Affiliation] Affiliation trouvée:', {
                    affiliationId: affiliation.id,
                    referrerProfileId: affiliation.referrer_profile_id
                });

                // Vérifier que le parrain a toujours un compte Stripe Connect actif (requête séparée)
                const { data: stripeConnect, error: stripeError } = await locals.supabaseServiceRole
                    .from('stripe_connect_accounts')
                    .select('stripe_account_id, is_active, charges_enabled, payouts_enabled')
                    .eq('profile_id', affiliation.referrer_profile_id)
                    .eq('is_active', true)
                    .eq('charges_enabled', true)
                    .eq('payouts_enabled', true)
                    .maybeSingle();
                
                if (stripeError) {
                    logger.log('❌ [Affiliation] Erreur récupération Stripe Connect:', stripeError);
                } else if (stripeConnect) {
                    // Activer l'affiliation
                    const { error: updateError } = await locals.supabaseServiceRole
                        .from('affiliations')
                        .update({
                            status: 'active',
                            subscription_started_at: new Date().toISOString()
                        })
                        .eq('id', affiliation.id);
                    
                    if (updateError) {
                        logger.log('❌ [Affiliation] Erreur activation affiliation:', updateError);
                        await ErrorLogger.logCritical(updateError, {
                            affiliationId: affiliation.id,
                            profileId
                        }, {
                            handler: 'upsertSubscription',
                            step: 'activate_affiliation'
                        });
                    } else {
                        logger.log('✅ [Affiliation] Affiliation activée avec succès:', affiliation.id);
                        
                        // ✅ La commission sera traitée automatiquement par le webhook invoice.payment_succeeded
                        // Cela évite les doublons et garantit que la commission est créée au bon moment (quand le paiement est confirmé)
                        logger.log('ℹ️ [Affiliation] La commission sera traitée par le webhook invoice.payment_succeeded');
                    }
                } else {
                    logger.log('⚠️ [Affiliation] Stripe Connect non configuré ou inactif pour le referrer:', affiliation.referrer_profile_id);
                }
            } else {
                logger.log('ℹ️ [Affiliation] Aucune affiliation pending trouvée pour ce profil');
            }
        }

        // ✅ Tracking: Subscription started (fire-and-forget pour ne pas bloquer le webhook)
        // Logger l'événement si l'abonnement est actif (active ou trialing) ET :
        // 1. C'est une nouvelle souscription (n'existait pas avant)
        // 2. L'abonnement passe de inactif à actif
        // 3. C'est un nouvel ID de souscription (changement de plan)
        const isActivating = subscriptionStatus === 'active';
        const shouldLog = isActivating && (
            isNewSubscription || 
            wasInactive || 
            hasDifferentSubscriptionId
        );

        logger.log('📊 [Subscription Webhook] Logging decision:', {
            isActivating,
            shouldLog,
            subscriptionStatus,
            stripeStatus: subscription.status
        });

        if (shouldLog) {
            const { logEventAsync, Events } = await import('$lib/utils/analytics');
            logger.log('✅ [Subscription Webhook] Logging SUBSCRIPTION_STARTED event');
            logEventAsync(
                locals.supabaseServiceRole,
                Events.SUBSCRIPTION_STARTED,
                {
                    subscription_id: subscriptionId,
                    product_id: productId,
                    product_lookup_key: productLookupKey,
                    plan: productLookupKey === 'price_basic_monthly' ? 'basic' : 'premium',
                    status: subscription.status // Inclure le statut réel (active, trialing, etc.)
                },
                profileId,
                '/api/webhooks/stripe'
            );
        } else {
            logger.log('⏭️ [Subscription Webhook] Skipping event log (conditions not met)');
        }

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

        // ✅ Tracking: Subscription cancelled (fire-and-forget pour ne pas bloquer le webhook)
        const { logEventAsync, Events } = await import('$lib/utils/analytics');
        logEventAsync(
            locals.supabaseServiceRole,
            Events.SUBSCRIPTION_CANCELLED,
            {
                subscription_id: subscription.id,
                product_id: productId
            },
            profileId,
            '/api/webhooks/stripe'
        );

    } catch (err) {
        throw error(500, 'handleSubscriptionDeleted failed: ' + err);
    }
}