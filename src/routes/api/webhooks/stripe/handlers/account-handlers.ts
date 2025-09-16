import type { Stripe } from 'stripe';

export async function handleAccountUpdated(account: Stripe.Account, locals: any): Promise<void> {
    console.log('handleAccountUpdated', account.id);

    if (account.charges_enabled && account.payouts_enabled) {
        const { error: updateError } = await locals.supabaseServiceRole
            .from('stripe_connect_accounts')
            .update({ is_active: true })
            .eq('stripe_account_id', account.id);

        if (updateError) {
            console.error('❌ Failed to update account status:', updateError);
            throw new Error('DB update failed'); // Stripe va retenter
        }

        console.log(`✅ Account ${account.id} marked active`);
    } else {
        console.log(`ℹ️ Account ${account.id} not yet active`);
    }
}