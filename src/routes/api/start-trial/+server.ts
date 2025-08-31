import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Stripe from 'stripe';
import { PRIVATE_STRIPE_SECRET_KEY } from '$env/static/private';

const stripe = new Stripe(PRIVATE_STRIPE_SECRET_KEY, {
    apiVersion: '2024-04-10'
});

export const POST: RequestHandler = async ({ request, locals }) => {
    try {
        const { session } = await locals.safeGetSession();
        if (!session) {
            return json({ error: 'Non autorisé' }, { status: 401 });
        }

        const userId = session.user.id;
        const { planType } = await request.json(); // 'basic' ou 'premium'

        // Déterminer le prix Stripe selon le plan
        const priceId = planType === 'basic'
            ? 'price_1Rre1ZPNddYt1P7Lea1N7Cbq'
            : 'price_1RrdwvPNddYt1P7LGICY3by5';

        // Vérifier si un essai gratuit a déjà été utilisé via numéro de téléphone
        const { data: connectAccount } = await locals.supabase
            .from('stripe_connect_accounts')
            .select('stripe_account_id')
            .eq('profile_id', userId)
            .single();

        if (connectAccount?.stripe_account_id) {
            const account = await stripe.accounts.retrieve(connectAccount.stripe_account_id);
            const accountData = account as any;

            // Récupérer le numéro du compte Stripe Connect (individuel ou entreprise)
            const phone =
                accountData?.individual?.phone ||
                accountData?.business_profile?.support_phone ||
                null;

            if (phone) {
                // Vérifier si ce numéro est déjà dans la base anti-fraude
                const { data: existingPhone } = await (locals.supabase as any)
                    .from('anti_fraud_phone_numbers')
                    .select('phone_number')
                    .eq('phone_number', phone)
                    .single();

                if (existingPhone) {
                    return json(
                        { error: 'Un essai gratuit a déjà été utilisé avec ce numéro.' },
                        { status: 403 }
                    );
                }

                // Sinon, enregistrer le numéro pour bloquer d’autres essais
                await (locals.supabase as any)
                    .from('anti_fraud_phone_numbers')
                    .insert({ phone_number: phone });

                console.log(`✅ Numéro de téléphone ${phone} enregistré pour l'anti-fraude`);
            }
        }

        // Créer ou récupérer le customer Stripe
        let customer: string;
        const { data: existingCustomer } = await locals.supabase
            .from('stripe_customers')
            .select('stripe_customer_id')
            .eq('profile_id', userId)
            .single();

        if (existingCustomer) {
            customer = existingCustomer.stripe_customer_id;
        } else {
            const { id } = await stripe.customers.create({
                email: session.user.email,
                metadata: { user_id: userId }
            });
            customer = id;

            // Sauvegarder le customer
            await locals.supabase
                .from('stripe_customers')
                .insert({
                    profile_id: userId,
                    stripe_customer_id: id
                });
        }

        // Créer l'abonnement avec essai gratuit
        const subscription = await stripe.subscriptions.create({
            customer,
            items: [{ price: priceId }],
            trial_period_days: 7,
            payment_behavior: 'default_incomplete',
            expand: ['latest_invoice.payment_intent']
        });

        // Sauvegarder l'abonnement en base
        await (locals.supabase as any)
            .from('user_products')
            .upsert({
                profile_id: userId,
                stripe_product_id: planType === 'basic'
                    ? 'prod_Selbd3Ne2plHqG'
                    : 'prod_Selcz36pAfV3vV',
                stripe_subscription_id: subscription.id,
                subscription_status: 'active'
            }, { onConflict: 'profile_id' });

        return json({
            success: true,
            subscriptionId: subscription.id,
            trialEnd: subscription.trial_end
        });

    } catch (error) {
        console.error('Erreur création essai gratuit:', error);
        return json({ error: 'Erreur interne' }, { status: 500 });
    }
};
