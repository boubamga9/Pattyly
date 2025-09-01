// handlers/customer-handlers.ts
import type { Stripe } from 'stripe';
import { error } from '@sveltejs/kit';

export async function handleCustomerCreated(customer: Stripe.Customer, locals: any): Promise<void> {
    console.log('🔍 Handling customer.created:', customer.id);

    try {
        const userId = customer.metadata?.user_id;
        if (!userId) return;

        // Créer l'enregistrement dans stripe_customers
        const { error: upsertError } = await locals.supabaseServiceRole
            .from('stripe_customers')
            .upsert(
                {
                    profile_id: userId,
                    stripe_customer_id: customer.id
                },
                { onConflict: 'profile_id' }
            );

        if (upsertError) {
            console.error('Error saving customer to database:', upsertError);
            throw error(500, 'Failed to save customer to database');
        }

        console.log('✅ Customer created handled successfully');
    } catch (error) {
        console.error('❌ Error handling customer.created:', error);
        throw error;
    }
}