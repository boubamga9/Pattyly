import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { STRIPE_PRICES } from '$lib/config/server';

export const load: PageServerLoad = async ({ locals }) => {
    const { session } = await locals.safeGetSession();

    // Rediriger vers login si pas connecté
    if (!session) {
        throw redirect(303, '/login');
    }

    const userId = session.user.id;

    // ✅ Un seul RPC pour tout vérifier
    const { data: eligibility, error: rpcError } = await (locals.supabase as any).rpc('check_early_adopter_eligibility', {
        p_profile_id: userId
    });

    console.log('🔍 [Early Adopter] RPC result:', {
        eligibility,
        rpcError,
        userId
    });

    const result = eligibility?.[0];

    // Si pas éligible, rediriger vers le dashboard
    if (!result?.is_eligible) {
        console.log('❌ Not eligible, redirecting to dashboard:', {
            is_eligible: result?.is_eligible,
            already_early_adopter: result?.already_early_adopter,
            offer_already_shown: result?.offer_already_shown,
            spots_remaining: result?.spots_remaining
        });
        // Marquer l'offre comme vue si elle ne l'était pas déjà
        if (!result?.offer_already_shown) {
            await locals.supabase
                .from('profiles')
                .update({ early_adopter_offer_shown_at: new Date().toISOString() })
                .eq('id', userId);
        }

        throw redirect(303, '/dashboard');
    }

    console.log('✅ User eligible, showing offer');

    return {
        earlyAdopterPrice: 14.99,
        normalPrice: 19.99,
        stripePriceId: STRIPE_PRICES.EARLY
    };
};

export const actions: Actions = {
    skipOffer: async ({ locals }) => {
        const { session } = await locals.safeGetSession();

        if (!session) {
            throw redirect(303, '/login');
        }

        const userId = session.user.id;

        // Marquer l'offre comme vue (l'utilisateur a refusé)
        await locals.supabase
            .from('profiles')
            .update({ early_adopter_offer_shown_at: new Date().toISOString() })
            .eq('id', userId);

        // Rediriger vers le dashboard
        throw redirect(303, '/dashboard');
    }
};

