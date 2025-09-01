// handlers/payment-handlers.ts
import { error } from '@sveltejs/kit';
import type { Stripe } from 'stripe';

export async function handlePaymentSucceeded(invoice: Stripe.Invoice, locals: any): Promise<void> {
    console.log('🔍 Handling payment succeeded:', invoice.id);

    try {
        console.log('🔍 handlePaymentSucceeded - Processing payment success');
        console.log('🔍 handlePaymentSucceeded - Invoice ID:', invoice.id);

        // Récupérer le customer_id depuis l'invoice
        const customerId = invoice.customer as string;

        // Récupérer le profile_id depuis stripe_customers
        const { data: customerData } = await locals.supabaseServiceRole
            .from('stripe_customers')
            .select('profile_id')
            .eq('stripe_customer_id', customerId)
            .single();

        if (!customerData) {
            console.error('Customer not found in database:', customerId);
            return;
        }

        const profileId = customerData.profile_id;
        console.log('🔍 handlePaymentSucceeded - Profile ID:', profileId);

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
            console.error('Error reactivating subscription after payment success:', updateError);
            throw error(500, 'Failed to reactivate subscription after payment success');
        } else {
            console.log('✅ handlePaymentSucceeded - Successfully reactivated subscription');
        }

        console.log('✅ Payment success handled successfully');
    } catch (error) {
        console.error('❌ Error handling payment success:', error);
        throw error;
    }
}

export async function handlePaymentFailed(invoice: Stripe.Invoice, locals: any): Promise<void> {
    console.log('🔍 Handling payment failed:', invoice.id);

    /*
       console.log('🔍 handlePaymentFailed - Processing payment failure');
        console.log('🔍 handlePaymentFailed - Invoice ID:', invoice.id);
        console.log('🔍 handlePaymentFailed - Amount:', invoice.amount_due);
        console.log('🔍 handlePaymentFailed - Status:', invoice.status);
    
        // Récupérer le customer_id depuis l'invoice
        const customerId = invoice.customer as string;
    
        // Récupérer le profile_id depuis stripe_customers
        const { data: customerData } = await locals.supabaseServiceRole
            .from('stripe_customers')
            .select('profile_id')
            .eq('stripe_customer_id', customerId)
            .single();
    
        if (!customerData) {
            console.error('Customer not found in database:', customerId);
            return;
        }
    
        const profileId = customerData.profile_id;
        console.log('🔍 handlePaymentFailed - Profile ID:', profileId);
    
        // Marquer l'abonnement comme inactif
        const { error: updateError } = await locals.supabaseServiceRole
            .from('user_products')
            .update({
                subscription_status: 'inactive'
            })
            .eq('profile_id', profileId);
    
        if (updateError) {
            console.error('Error updating subscription status after payment failure:', updateError);
            throw error(500, 'Failed to update subscription status after payment failure');
        } else {
            console.log('✅ handlePaymentFailed - Successfully marked subscription as inactive');
        }
    
        // Désactiver is_custom_accepted quand le paiement échoue
        const { error: shopUpdateError } = await locals.supabaseServiceRole
            .from('shops')
            .update({ is_custom_accepted: false })
            .eq('profile_id', profileId);
    
        if (shopUpdateError) {
            console.error('Error disabling custom requests after payment failure:', shopUpdateError);
            throw error(500, 'Failed to disable custom requests after payment failure');
        } else {
            console.log('✅ Disabled custom requests after payment failure for user:', profileId);
        }
    */


    try {
        console.log('send failed payment email to user');

        console.log('✅ Payment failure handled successfully');
    } catch (error) {
        console.error('❌ Error handling payment failure:', error);
        throw error;
    }
}