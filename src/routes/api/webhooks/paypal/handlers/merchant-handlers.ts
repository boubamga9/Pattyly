// handlers/merchant-handlers.ts
import { error } from '@sveltejs/kit';

interface PayPalMerchantResource {
    merchant_id: string;
    tracking_id?: string;
    account_status?: string;
    permissions_granted?: boolean;
    email?: string;
    primary_email?: string;
    primary_email_confirmed?: boolean;
    [key: string]: any;
}

/**
 * Crée l'essai gratuit pour l'utilisateur
 */
async function createTrialForUser(locals: any, trackingId: string) {
    console.log('🚀 [Webhook Trial] Starting createTrialForUser with trackingId:', trackingId);
    try {
        // Récupérer le profile_id depuis tracking_id
        const { data: paypalAccount } = await (locals.supabaseServiceRole as any)
            .from('paypal_accounts')
            .select('profile_id, paypal_merchant_id')
            .eq('tracking_id', trackingId)
            .single();

        if (!paypalAccount) {
            console.error('❌ [Webhook Trial] PayPal account not found');
            return;
        }

        // Récupérer les infos du shop et du profile
        const { data: shopData } = await locals.supabaseServiceRole
            .from('shops')
            .select('instagram, tiktok')
            .eq('profile_id', paypalAccount.profile_id)
            .single();

        const { data: profileData } = await locals.supabaseServiceRole
            .from('profiles')
            .select('email')
            .eq('id', paypalAccount.profile_id)
            .single();

        if (profileData?.email) {
            // 🔒 Vérification anti-fraud : vérifier si le merchant_id a déjà eu un essai gratuit
            const { data: existingFraudRecord } = await locals.supabaseServiceRole
                .from('anti_fraud')
                .select('merchant_id')
                .eq('merchant_id', paypalAccount.paypal_merchant_id)
                .single();

            if (existingFraudRecord) {
                console.log('🚫 [Webhook Trial] Anti-fraud check failed: merchant_id already has a trial');
                console.log('🚫 [Webhook Trial] Merchant ID:', paypalAccount.paypal_merchant_id);
                return; // Ne pas créer d'essai gratuit
            } else {
                console.log('✅ [Webhook Trial] Anti-fraud check passed: merchant_id is unique');
            }

            // Créer ou récupérer le customer Stripe
            const { data: existingCustomer } = await locals.supabaseServiceRole
                .from('stripe_customers')
                .select('stripe_customer_id')
                .eq('profile_id', paypalAccount.profile_id)
                .single();

            let stripeCustomerId;
            if (existingCustomer) {
                stripeCustomerId = existingCustomer.stripe_customer_id;
                console.log('🔍 [Webhook Trial] Using existing Stripe customer:', stripeCustomerId);
            } else {
                // Créer un nouveau customer Stripe
                const Stripe = (await import('stripe')).default;
                const { PRIVATE_STRIPE_SECRET_KEY } = await import('$env/static/private');
                const stripe = new Stripe(PRIVATE_STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' });

                const customer = await stripe.customers.create({
                    email: profileData.email,
                    metadata: { user_id: paypalAccount.profile_id }
                });
                stripeCustomerId = customer.id;
            }

            // Créer l'abonnement avec essai gratuit (7 jours premium)
            const Stripe = (await import('stripe')).default;
            const { PRIVATE_STRIPE_SECRET_KEY } = await import('$env/static/private');
            const { STRIPE_PRICES } = await import('$lib/config/server');
            const stripe = new Stripe(PRIVATE_STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' });

            const subscription = await stripe.subscriptions.create({
                customer: stripeCustomerId,
                items: [{ price: STRIPE_PRICES.PREMIUM }],
                trial_period_days: 7,
                payment_behavior: 'default_incomplete',
                expand: ['latest_invoice.payment_intent'],
                trial_settings: {
                    end_behavior: {
                        missing_payment_method: 'cancel'
                    }
                }
            });

            // Créer l'enregistrement anti_fraud (on sait déjà qu'il n'existe pas grâce à la vérification précédente)
            await locals.supabaseServiceRole
                .from('anti_fraud')
                .insert({
                    merchant_id: paypalAccount.paypal_merchant_id,
                    created_at: new Date().toISOString()
                });
            console.log('✅ [Webhook Trial] Anti-fraud record created');
        }
    } catch (error) {
        console.error('❌ [Webhook Trial] Failed to create trial:', error);
        // Ne pas bloquer si l'essai gratuit échoue
    }
}

/**
 * Met à jour un compte PayPal dans la DB (avec UPSERT)
 */
async function updatePayPalAccount(
    locals: any,
    values: Partial<{ onboarding_status: string; is_active: boolean; paypal_merchant_id: string; submitter_payer_id: string | null }>,
    filter: Partial<{ tracking_id: string; paypal_merchant_id: string }>
) {
    // Essayer d'abord un UPDATE
    const { error: updateError } = await (locals.supabaseServiceRole as any)
        .from('paypal_accounts')
        .update(values)
        .match(filter);

    // Si l'UPDATE échoue (pas de ligne trouvée), faire un UPSERT
    if (updateError && updateError.code === 'PGRST116') {
        console.log('🔄 [PayPal Account] No existing record found, creating new one...');

        const { error: upsertError } = await (locals.supabaseServiceRole as any)
            .from('paypal_accounts')
            .upsert({
                ...values,
                ...filter
            });

        if (upsertError) {
            console.error('❌ Failed to upsert PayPal account:', upsertError);
            throw error(500, 'DB upsert failed');
        }
    } else if (updateError) {
        console.error('❌ Failed to update PayPal account:', updateError);
        throw error(500, 'DB update failed');
    }
}

export async function handleMerchantOnboardingCompleted(
    resource: PayPalMerchantResource,
    locals: any
): Promise<void> {
    console.log('📋 [Merchant Onboarding] Full resource:', JSON.stringify(resource, null, 2));

    const { merchant_id, tracking_id, permissions_granted } = resource;

    if (!merchant_id) {
        console.error('❌ No merchant_id in webhook event');
        throw error(400, 'Missing merchant_id');
    }

    if (!tracking_id) {
        console.error('❌ No tracking_id in webhook event');
        throw error(400, 'Missing tracking_id');
    }

    // Le merchant_id est déjà disponible dans le webhook, pas besoin d'appel API
    console.log('🆔 [Merchant Onboarding] Using merchant_id from webhook:', merchant_id);

    // 3️⃣ Mettre à jour le compte PayPal
    const values = {
        onboarding_status: 'completed',
        is_active: permissions_granted !== false,
        paypal_merchant_id: merchant_id
    };

    // Essayer de mettre à jour par tracking_id d'abord
    const { error: updateByTrackingError } = await (locals.supabaseServiceRole as any)
        .from('paypal_accounts')
        .update(values)
        .eq('tracking_id', tracking_id);

    if (updateByTrackingError) {
        console.log('🔄 [PayPal Account] Update by tracking_id failed, trying by merchant_id...');

        // Si ça échoue, essayer par merchant_id (cas où le webhook se répète)
        const { error: updateByMerchantError } = await (locals.supabaseServiceRole as any)
            .from('paypal_accounts')
            .update(values)
            .eq('paypal_merchant_id', merchant_id);

        if (updateByMerchantError) {
            console.error('❌ Failed to update PayPal account by both tracking_id and merchant_id:', updateByMerchantError);
            throw error(500, 'DB update failed');
        } else {
            console.log('✅ [PayPal Account] Updated by merchant_id');
        }
    } else {
        console.log('✅ [PayPal Account] Updated by tracking_id');
    }

    // 4️⃣ Créer l'essai gratuit après validation PayPal
    console.log('🎯 [Merchant Onboarding] About to create trial for tracking_id:', tracking_id);
    await createTrialForUser(locals, tracking_id);
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
