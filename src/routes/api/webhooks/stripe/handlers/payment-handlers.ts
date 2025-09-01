// handlers/payment-handlers.ts
import { error } from '@sveltejs/kit';
import type { Stripe } from 'stripe';

export async function handlePaymentSucceeded(invoice: Stripe.Invoice, locals: any): Promise<void> {

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
        } else {
        }

    } catch (error) {
        throw error;
    }
}

export async function handlePaymentFailed(invoice: Stripe.Invoice, locals: any): Promise<void> {

    /*
    
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
    
        // Marquer l'abonnement comme inactif
        const { error: updateError } = await locals.supabaseServiceRole
            .from('user_products')
            .update({
                subscription_status: 'inactive'
            })
            .eq('profile_id', profileId);
    
        if (updateError) {
            throw error(500, 'Failed to update subscription status after payment failure');
        } else {
        }
    
        // Désactiver is_custom_accepted quand le paiement échoue
        const { error: shopUpdateError } = await locals.supabaseServiceRole
            .from('shops')
            .update({ is_custom_accepted: false })
            .eq('profile_id', profileId);
    
        if (shopUpdateError) {
            throw error(500, 'Failed to disable custom requests after payment failure');
        } else {
        }
    */


    try {

    } catch (error) {
        throw error;
    }
}