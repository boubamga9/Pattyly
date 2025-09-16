// handlers/payment-handlers.ts
import { error } from '@sveltejs/kit';
import type { Stripe } from 'stripe';

export async function handlePaymentSucceeded(invoice: Stripe.Invoice, locals: any): Promise<void> {
    console.log('handlePaymentSucceeded', invoice);

    try {

        // Récupérer le customer_id depuis l'invoice
        const customerId = invoice.customer as string;

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

        // Réactiver l'abonnement après un paiement réussi
        const { error: updateError } = await locals.supabaseServiceRole
            .from('user_products')
            .update({
                subscription_status: 'active'
            })
            .eq('profile_id', profileId);

        // Réactiver is_active de la boutique
        const { error: shopUpdateError } = await locals.supabaseServiceRole
            .from('shops')
            .update({ is_active: true })
            .eq('profile_id', profileId);

        if (updateError) {
            throw error(500, 'Failed to reactivate subscription after payment success');
        }

        if (shopUpdateError) {
            throw error(500, 'Failed to reactivate shop after payment success');
        }

    } catch (err) {
        throw error(500, 'handlePaymentSucceeded failed: ' + err);
    }
}

export async function handlePaymentFailed(invoice: Stripe.Invoice, locals: any): Promise<void> {

    console.log('handlePaymentFailed', invoice);

}