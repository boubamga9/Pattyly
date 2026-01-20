import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { STRIPE_PRICES, STRIPE_PRODUCTS } from '$lib/config/server';

export const load: PageServerLoad = async ({ locals }) => {
    const { session } = await locals.safeGetSession();
    
    // Rediriger vers login si pas connecté
    if (!session) {
        throw redirect(303, '/login');
    }

    // L'offre lifetime est terminée (quota atteint) - rediriger vers le dashboard
    throw redirect(303, '/dashboard');

    const userId = session.user.id;

    // Récupérer les abonnements pour vérifier si l'utilisateur a déjà le plan à vie
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: allSubscriptions } = await (locals.supabase as any)
        .from('user_products')
        .select('stripe_product_id, subscription_status')
        .eq('profile_id', userId);

    let hasLifetimePlan = false;
    if (allSubscriptions && allSubscriptions.length > 0) {
        const lifetimeSubscription = allSubscriptions.find((sub: any) =>
            sub.subscription_status === 'active' &&
            STRIPE_PRODUCTS.LIFETIME &&
            sub.stripe_product_id === STRIPE_PRODUCTS.LIFETIME
        );
        hasLifetimePlan = !!lifetimeSubscription;
    }

    return {
        isLifetimeAvailable,
        hasLifetimePlan,
        stripePriceId: STRIPE_PRICES.LIFETIME || null
    };
};

