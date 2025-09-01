import type { Stripe } from 'stripe';
import { error } from '@sveltejs/kit';

export async function handleAccountUpdated(account: Stripe.Account, locals: any): Promise<void> {
    console.log('🔍 Handling account updated:', account.id);

    try {
        console.log('🔍 Processing account.updated for account:', account.id);

        // Vérifier si le compte est maintenant actif
        if (account.charges_enabled && account.payouts_enabled) {
            // Mettre à jour is_active dans la base de données
            const { error: updateError } = await locals.supabaseServiceRole
                .from('stripe_connect_accounts')
                .update({ is_active: true })
                .eq('stripe_account_id', account.id);

            if (updateError) {
                console.error('Error updating account status:', updateError);
                throw error(500, 'Failed to update account status');
            } else {
                console.log('✅ Stripe Connect account activated:', account.id);
            }
        }

        console.log('✅ Account update handled successfully');
    } catch (error) {
        console.error('❌ Error handling account update:', error);
        throw error;
    }
}

export async function handleAccountAuthorized(account: Stripe.Account, locals: any): Promise<void> {
    console.log('🔍 Handling account authorized:', account.id);

    try {
        console.log('🔍 Processing account.application.authorized for account:', account.id);

        // Quand l'application est autorisée, le compte est généralement actif
        if (account.charges_enabled && account.payouts_enabled) {
            // Mettre à jour is_active dans la base de données
            const { error: updateError } = await locals.supabaseServiceRole
                .from('stripe_connect_accounts')
                .update({ is_active: true })
                .eq('stripe_account_id', account.id);

            if (updateError) {
                console.error('Error updating account status:', updateError);
            } else {
                console.log('✅ Stripe Connect account authorized and activated:', account.id);
            }
        }

        console.log('✅ Account authorization handled successfully');
    } catch (error) {
        console.error('❌ Error handling account authorization:', error);
        throw error;
    }
}