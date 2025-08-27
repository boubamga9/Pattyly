import { toSortedPrices } from '$lib/stripe/product-utils';
import { Stripe } from 'stripe';
import type { PageServerLoad } from './$types';

type Plan = {
    id: string;
    name: string;
    price: number;
    currency: string;
    stripePriceId: string;
    features: string[];
    limitations: string[];
    popular: boolean;
};

export const load: PageServerLoad = async ({ locals: { stripe } }) => {
    const { data: prices } = await stripe.prices.list({
        expand: ['data.product'],
        active: true,
    });

    const sortedPrices = toSortedPrices(
        prices.filter(
            (price) =>
                typeof price.product === 'object' &&
                'default_price' in price.product &&
                price.product.default_price === price.id,
        ),
    );

    // Vérifier qu'on a au moins 2 prix configurés
    if (sortedPrices.length < 2) {
        console.warn(`Only ${sortedPrices.length} Stripe prices found. Need at least 2 for pricing page.`);
        // Retourner des données par défaut pour éviter l'erreur
        return {
            plans: [] as Plan[],
        };
    }

    // Convertir les prix Stripe en plans structurés
    const plans: Plan[] = [
        {
            id: 'basic',
            name: typeof sortedPrices[0].product === 'object' && 'name' in sortedPrices[0].product ? sortedPrices[0].product.name || 'Basic' : 'Basic',
            price: (sortedPrices[0].unit_amount || 0) / 100,
            currency: sortedPrices[0].currency?.toUpperCase() || 'EUR',
            stripePriceId: sortedPrices[0].id,
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
            name: typeof sortedPrices[1].product === 'object' && 'name' in sortedPrices[1].product ? sortedPrices[1].product.name || 'Premium' : 'Premium',
            price: (sortedPrices[1].unit_amount || 0) / 100,
            currency: sortedPrices[1].currency?.toUpperCase() || 'EUR',
            stripePriceId: sortedPrices[1].id,
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
    };
};
