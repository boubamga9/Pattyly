// +server.ts - API endpoint pour vérifier le statut PayPal
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals: { safeGetSession, supabase } }) => {
    try {
        const { session, user } = await safeGetSession();

        if (!session || !user) {
            return json({ error: 'Not authenticated' }, { status: 401 });
        }

        // Vérifier le statut PayPal de l'utilisateur
        const { data: paypalAccount, error } = await supabase
            .from('paypal_accounts')
            .select('onboarding_status, is_active')
            .eq('profile_id', user.id)
            .single();

        if (error) {
            console.error('Error checking PayPal status:', error);
            return json({ error: 'Database error' }, { status: 500 });
        }

        if (!paypalAccount) {
            return json({
                status: 'not_found',
                completed: false
            });
        }

        const isCompleted = paypalAccount.onboarding_status === 'completed' && paypalAccount.is_active;

        return json({
            status: paypalAccount.onboarding_status || 'pending',
            completed: isCompleted,
            is_active: paypalAccount.is_active
        });

    } catch (error) {
        console.error('PayPal status check error:', error);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};
