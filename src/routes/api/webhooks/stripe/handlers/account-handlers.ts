import type { Stripe } from 'stripe';
import { isStripeConnectAccountReady } from '$lib/stripe/connect-client';
import { ErrorLogger } from '$lib/services/error-logging';
import { logger } from '$lib/utils/logger';

/**
 * Handle Stripe Connect account.updated webhook event
 * Updates the account status in the database and manages payment_links
 */
export async function handleAccountUpdated(account: Stripe.Account, locals: any): Promise<void> {
    try {
        logger.log('handleAccountUpdated', { accountId: account.id });

        // 1. Récupérer le profile_id depuis stripe_connect_accounts
        const { data: connectAccount, error: fetchError } = await locals.supabaseServiceRole
            .from('stripe_connect_accounts')
            .select('profile_id')
            .eq('stripe_account_id', account.id)
            .single();

        if (fetchError || !connectAccount) {
            logger.log(`Account ${account.id} not found in database, ignoring`);
            return; // Compte non enregistré, on ignore (peut arriver si webhook reçu avant création en DB)
        }

        const profileId = connectAccount.profile_id;
        const isReady = isStripeConnectAccountReady(account);

        // 2. Mettre à jour stripe_connect_accounts avec tous les champs
        const { error: updateError } = await locals.supabaseServiceRole
            .from('stripe_connect_accounts')
            .update({
                is_active: isReady,
                charges_enabled: account.charges_enabled || false,
                payouts_enabled: account.payouts_enabled || false,
                details_submitted: account.details_submitted || false,
                updated_at: new Date().toISOString(),
            })
            .eq('stripe_account_id', account.id);

        if (updateError) {
            await ErrorLogger.logCritical(updateError, {
                stripeAccountId: account.id,
                profileId: profileId,
            }, {
                handler: 'handleAccountUpdated',
                step: 'update_stripe_connect_account',
                critical: true,
            });
            throw new Error('Failed to update stripe_connect_accounts');
        }

        // 3. Gérer payment_links selon l'état du compte
        if (isReady) {
            // Compte actif : créer/mettre à jour payment_links avec is_active: true
            const { error: paymentLinkError } = await locals.supabaseServiceRole
                .from('payment_links')
                .upsert({
                    profile_id: profileId,
                    provider_type: 'stripe',
                    payment_identifier: account.id,
                    is_active: true,
                }, {
                    onConflict: 'profile_id,provider_type'
                });

            if (paymentLinkError) {
                await ErrorLogger.logCritical(paymentLinkError, {
                    stripeAccountId: account.id,
                    profileId: profileId,
                }, {
                    handler: 'handleAccountUpdated',
                    step: 'upsert_payment_links',
                    critical: true,
                });
                throw new Error('Failed to upsert payment_links');
            }

            logger.log(`✅ Account ${account.id} marked active, payment_links updated`);
        } else {
            // Compte inactif : désactiver le payment_link (mais garder l'entrée)
            const { error: paymentLinkError } = await locals.supabaseServiceRole
                .from('payment_links')
                .update({ is_active: false })
                .eq('profile_id', profileId)
                .eq('provider_type', 'stripe');

            if (paymentLinkError) {
                // Ne pas échouer si le payment_link n'existe pas encore
                logger.log(`⚠️ Failed to update payment_links (may not exist yet):`, paymentLinkError);
            } else {
                logger.log(`ℹ️ Account ${account.id} not yet active, payment_links disabled`);
            }
        }

    } catch (err) {
        await ErrorLogger.logCritical(err, {
            stripeAccountId: account.id,
        }, {
            handler: 'handleAccountUpdated',
            step: 'general_error',
        });
        throw err; // Re-throw pour que le webhook endpoint gère l'erreur
    }
}

