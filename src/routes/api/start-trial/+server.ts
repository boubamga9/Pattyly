import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Stripe from 'stripe';
import { PRIVATE_STRIPE_SECRET_KEY } from '$env/static/private';

const stripe = new Stripe(PRIVATE_STRIPE_SECRET_KEY, {
    apiVersion: '2024-04-10'
});

// Fonction pour extraire l'email de base (sans plus addressing)
function getBaseEmail(email: string): string {
    const [localPart, domain] = email.split('@');
    const baseLocalPart = localPart.split('+')[0];
    return `${baseLocalPart}@${domain}`;
}

export const POST: RequestHandler = async ({ request, locals }) => {
    try {
        const { session } = await locals.safeGetSession();
        if (!session) {
            return json({ error: 'Non autorisé' }, { status: 401 });
        }

        const userId = session.user.id;
        const userEmail = session.user.email;
        const { planType, fingerprint } = await request.json(); // 'basic' ou 'premium' + fingerprint

        // Vérifier que le fingerprint est présent
        if (!fingerprint) {
            return json({ error: 'Fingerprint requis' }, { status: 400 });
        }

        // Déterminer le prix Stripe selon le plan
        const priceId = planType === 'basic'
            ? 'price_1Rre1ZPNddYt1P7Lea1N7Cbq'
            : 'price_1RrdwvPNddYt1P7LGICY3by5';

        // Récupérer l'IP de l'utilisateur
        const forwardedFor = request.headers.get('x-forwarded-for');
        const realIp = request.headers.get('x-real-ip');
        const userIp = forwardedFor?.split(',')[0] || realIp || request.headers.get('cf-connecting-ip') || '127.0.0.1';

        // Extraire l'email de base pour éviter le contournement par plus addressing
        const baseEmail = userEmail ? getBaseEmail(userEmail) : '';



        // Vérifier si l'utilisateur est déjà dans la table anti_fraud
        // On vérifie l'email exact, l'email de base, l'IP ET le fingerprint pour éviter le contournement
        let conditions = [`email.eq.${userEmail}`, `email.eq.${baseEmail}`, `ip_address.eq.${userIp}`, `fingerprint.eq.${fingerprint}`];

        const { data: existingAntiFraud } = await (locals.supabase as any)
            .from('anti_fraud')
            .select('id, fingerprint')
            .or(conditions.join(','))
            .maybeSingle();

        if (existingAntiFraud) {


            // ✅ NOUVEAU : Vérifier si c'est le même fingerprint (même device)
            if (existingAntiFraud.fingerprint === fingerprint) {

                return json({
                    error: 'Un essai gratuit a déjà été utilisé avec ce device.',
                    redirectToCheckout: true,
                    priceId: priceId
                }, { status: 403 });
            } else {
                return json(
                    { error: 'Un essai gratuit a déjà été utilisé avec ce compte.' },
                    { status: 403 }
                );
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
                email: userEmail,
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

        // Enregistrer l'utilisateur dans la table anti_fraud pour bloquer les futurs essais
        try {
            await (locals.supabase as any)
                .from('anti_fraud')
                .insert({
                    fingerprint: fingerprint, // ✅ Utiliser le vrai fingerprint
                    ip_address: userIp,
                    email: userEmail
                });


        } catch (antiFraudError) {
            // On continue même si l'enregistrement anti_fraud échoue
        }



        return json({
            success: true,
            subscriptionId: subscription.id,
            trialEnd: subscription.trial_end
        });

    } catch (error) {
        return json({ error: 'Erreur interne' }, { status: 500 });
    }
};
