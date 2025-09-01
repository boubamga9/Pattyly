import type { Stripe } from 'stripe';
import { error } from '@sveltejs/kit';

export async function handleAccountUpdated(account: Stripe.Account, locals: any): Promise<void> {

    try {

        // Vérifier si le compte est maintenant actif
        if (account.charges_enabled && account.payouts_enabled) {
            // Mettre à jour is_active dans la base de données
            const { error: updateError } = await locals.supabaseServiceRole
                .from('stripe_connect_accounts')
                .update({ is_active: true })
                .eq('stripe_account_id', account.id);

            if (updateError) {
                throw error(500, 'Failed to update account status');
            } else {
            }
        }

    } catch (error) {
        throw error;
    }
}

export async function handleAccountAuthorized(account: Stripe.Account, locals: any): Promise<void> {

    try {

        // Quand l'application est autorisée, le compte est généralement actif
        if (account.charges_enabled && account.payouts_enabled) {
            // Mettre à jour is_active dans la base de données
            const { error: updateError } = await locals.supabaseServiceRole
                .from('stripe_connect_accounts')
                .update({ is_active: true })
                .eq('stripe_account_id', account.id);

            if (updateError) {
            } else {
            }
        }

    } catch (error) {
        throw error;
    }
}