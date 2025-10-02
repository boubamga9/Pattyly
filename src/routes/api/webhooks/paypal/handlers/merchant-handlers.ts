// handlers/merchant-handlers.ts
import { error } from '@sveltejs/kit';

interface PayPalMerchantResource {
    merchant_id: string;
    tracking_id?: string;
    account_status?: string;
    permissions_granted?: boolean;
    [key: string]: any;
}

/**
 * Met à jour un compte PayPal dans la DB
 */
async function updatePayPalAccount(
    locals: any,
    values: Partial<{ onboarding_status: string; is_active: boolean; paypal_merchant_id: string }>,
    filter: Partial<{ tracking_id: string; paypal_merchant_id: string }>
) {
    const { error: updateError } = await (locals.supabaseServiceRole as any)
        .from('paypal_accounts')
        .update(values)
        .match(filter);

    if (updateError) {
        console.error('❌ Failed to update PayPal account:', updateError);
        throw error(500, 'DB update failed');
    }
}

export async function handleMerchantOnboardingCompleted(
    resource: PayPalMerchantResource,
    locals: any
): Promise<void> {
    console.log('handleMerchantOnboardingCompleted', resource);

    const { merchant_id, tracking_id, permissions_granted } = resource;

    if (!merchant_id) {
        console.error('❌ No merchant_id in webhook event');
        throw error(400, 'Missing merchant_id');
    }

    const values = {
        onboarding_status: 'completed',
        is_active: permissions_granted !== false,
        paypal_merchant_id: merchant_id
    };

    if (tracking_id) {
        await updatePayPalAccount(locals, values, { tracking_id });
        console.log(`✅ PayPal account ${merchant_id} marked active for tracking_id: ${tracking_id}`);
    } else {
        await updatePayPalAccount(locals, values, { paypal_merchant_id: merchant_id });
        console.log(`✅ PayPal account ${merchant_id} marked active`);
    }
}

export async function handleMerchantConsentRevoked(
    resource: PayPalMerchantResource,
    locals: any
): Promise<void> {
    console.log('handleMerchantConsentRevoked', resource);

    const { merchant_id } = resource;

    if (!merchant_id) {
        console.error('❌ No merchant_id in consent revoked event');
        return;
    }

    await updatePayPalAccount(
        locals,
        { is_active: false, onboarding_status: 'failed' },
        { paypal_merchant_id: merchant_id }
    );

    console.log(`⚠️ PayPal account ${merchant_id} deactivated (consent revoked)`);
}
