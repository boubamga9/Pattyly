import type { PageServerLoad } from './$types';

type Plan = {
    id: string;
    name: string;
    price: number | 'gratuit';
    currency: string;
    features: string[];
    limitations: string[];
    popular: boolean;
    isFree: boolean;
};

export const load: PageServerLoad = async () => {
    // Plans fixes - pas de dépendance à Stripe
    const plans: Plan[] = [
        {
            id: 'free',
            name: 'Gratuit',
            price: 'gratuit',
            currency: 'EUR',
            features: [
                '10 commandes/mois',
                '3 gâteaux maximum',
                'Boutique en ligne personnalisée',
                'Gestion des commandes',
                'Calendrier de disponibilités',
                'Paiements sécurisés',
                'Visibilité dans l\'annuaire',
                'Support email'
            ],
            limitations: [],
            popular: false,
            isFree: true
        },
        {
            id: 'starter',
            name: 'Starter',
            price: 14.99,
            currency: 'EUR',
            features: [
                '30 commandes/mois',
                '10 gâteaux maximum',
                'Boutique en ligne personnalisée',
                'Gestion des commandes',
                'Calendrier de disponibilités',
                'Paiements sécurisés',
                'Visibilité dans l\'annuaire',
                'Support email prioritaire'
            ],
            limitations: [],
            popular: false,
            isFree: false
        },
        {
            id: 'premium',
            name: 'Premium',
            price: 19.99,
            currency: 'EUR',
            features: [
                'Commandes illimitées',
                'Gâteaux illimités',
                'Boutique en ligne personnalisée',
                'Gestion des commandes',
                'Calendrier de disponibilités',
                'Paiements sécurisés',
                'Visibilité + (mis en avant)',
                'Badge vérifié',
                '💬 Envoi de devis',
                'Support email prioritaire'
            ],
            limitations: [],
            popular: true,
            isFree: false
        }
    ];

    return {
        plans,
    };
};
