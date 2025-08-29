import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    const { session } = await locals.safeGetSession();

    // Rediriger vers login si pas connecté
    if (!session) {
        redirect(303, '/login');
    }

    const userId = session.user.id;

    // Récupérer TOUS les abonnements (actifs, inactifs, en essai)
    const { data: allSubscriptions } = await (locals.supabase as any)
        .from('user_products')
        .select('stripe_product_id, subscription_status')
        .eq('profile_id', userId);

    // Déterminer le plan actuel ET l'historique
    let currentPlan = null;
    let hasHadSubscription = false;

    if (allSubscriptions && allSubscriptions.length > 0) {
        hasHadSubscription = true;

        // Chercher un abonnement actif ou en essai
        const activeSubscription = allSubscriptions.find((sub: any) =>
            sub.subscription_status === 'active' || sub.subscription_status === 'trialing'
        );

        if (activeSubscription) {
            if (activeSubscription.stripe_product_id === 'prod_Selbd3Ne2plHqG') {
                currentPlan = 'basic';
            } else if (activeSubscription.stripe_product_id === 'prod_Selcz36pAfV3vV') {
                currentPlan = 'premium';
            }
        }
    }

    // Vérifier si l'utilisateur est exempté
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (locals.supabase as any)
        .from('profiles')
        .select('is_stripe_free, role')
        .eq('id', userId)
        .single();

    // Si exempté, rediriger vers le dashboard
    if (profile?.is_stripe_free || profile?.role === 'admin') {
        redirect(303, '/dashboard');
    }

    // Données des plans (en production, récupérer depuis Stripe)
    const plans = [
        {
            id: 'basic',
            name: 'Basic',
            price: 14.99,
            currency: 'EUR',
            stripePriceId: 'price_1Rre1ZPNddYt1P7Lea1N7Cbq',
            features: [
                'Jusqu\'à 10 produits',
                'Boutique en ligne personnalisée',
                'Gestion des commandes',
                'Calendrier de disponibilités',
                'Paiements sécurisés',
                'Support email'
            ],
            limitations: [],
            popular: false
        },
        {
            id: 'premium',
            name: 'Premium',
            price: 19.99,
            currency: 'EUR',
            stripePriceId: 'price_1RrdwvPNddYt1P7LGICY3by5',
            features: [
                'Produits illimités',
                'Boutique en ligne personnalisée',
                'Gestion des commandes',
                'Calendrier de disponibilités',
                'Paiements sécurisés',
                'Demandes personnalisées',
                'Support email'
            ],
            limitations: [],
            popular: true
        }
    ];

    return {
        plans,
        currentPlan,
        hasHadSubscription,  // ✅ Nouveau champ
        user: {
            id: userId,
            email: session.user.email
        }
    };
}; 