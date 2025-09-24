import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { STRIPE_PRODUCTS, STRIPE_PRICES } from '../../config';

// Fonction pour extraire l'email de base (sans plus addressing)
function getBaseEmail(email: string): string {
    const [localPart, domain] = email.split('@');
    const baseLocalPart = localPart.split('+')[0];
    return `${baseLocalPart}@${domain}`;
}

export const load: PageServerLoad = async ({ locals, request, setHeaders }) => {
    const { session } = await locals.safeGetSession();

    // Rediriger vers login si pas connecté
    if (!session) {
        throw redirect(303, '/login');
    }

    const userId = session.user.id;
    const userEmail = session.user.email;

    // Récupérer TOUS les abonnements (actifs, inactifs, en essai)
    const { data: allSubscriptions } = await (locals.supabase as any)
        .from('user_products')
        .select('stripe_product_id, subscription_status')
        .eq('profile_id', userId);

    // Plus besoin de vérification anti-fraude pour les essais gratuits
    // L'essai gratuit est maintenant géré dans /onboarding

    // Déterminer le plan actuel
    let currentPlan = null;

    if (allSubscriptions && allSubscriptions.length > 0) {
        // Chercher un abonnement actif ou en essai
        const activeSubscription = allSubscriptions.find((sub: any) =>
            sub.subscription_status === 'active' || sub.subscription_status === 'trialing'
        );

        if (activeSubscription) {
            if (activeSubscription.stripe_product_id === STRIPE_PRODUCTS.BASIC) {
                currentPlan = 'basic';
            } else if (activeSubscription.stripe_product_id === STRIPE_PRODUCTS.PREMIUM) {
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
        throw redirect(303, '/dashboard');
    }

    // Déterminer le type de boutons à afficher
    let buttonType: 'current' | 'choose' = 'choose';

    if (currentPlan) {
        // Utilisateur a un plan actif
        buttonType = 'current';
    } else {
        // Utilisateur n'a pas de plan, afficher les options de souscription
        buttonType = 'choose';
    }



    // Données des plans (en production, récupérer depuis Stripe)
    const plans = [
        {
            id: 'basic',
            name: 'Basic',
            price: 14.99,
            currency: 'EUR',
            stripePriceId: STRIPE_PRICES.BASIC,
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
            stripePriceId: STRIPE_PRICES.PREMIUM,
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
        buttonType, // Type de boutons à afficher
        user: {
            id: userId,
            email: userEmail
        }
    };
}; 