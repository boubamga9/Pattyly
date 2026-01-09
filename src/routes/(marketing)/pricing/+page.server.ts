import type { PageServerLoad } from './$types';

type Plan = {
    id: string;
    name: string;
    price?: number | 'gratuit'; // Prix mensuel (pour compatibilité)
    monthlyPrice?: number;
    annualPrice?: number;
    originalPrice?: number; // Prix barré pour montrer le prix de lancement
    currency: string;
    features: string[];
    limitations: string[];
    popular: boolean;
    isFree: boolean;
    isLifetime?: boolean; // Pour le plan à vie
    availableUntil?: string; // Date limite de disponibilité
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
                '5 commandes/mois',
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
            monthlyPrice: 14.99,
            annualPrice: 149,
            originalPrice: 19.99, // Prix barré pour montrer le prix de lancement
            currency: 'EUR',
            features: [
                'Tout le plan Gratuit',
                '20 commandes/mois (au lieu de 5)',
                '10 gâteaux maximum (au lieu de 3)'
            ],
            limitations: [],
            popular: false,
            isFree: false
        },
        {
            id: 'premium',
            name: 'Premium',
            monthlyPrice: 19.99,
            annualPrice: 199,
            originalPrice: 29.99, // Prix barré pour montrer le prix de lancement
            currency: 'EUR',
            features: [
                'Tout le plan Starter',
                'Commandes illimitées',
                'Gâteaux illimités',
                'Visibilité + : mis en avant en haut de liste = plus de commandes',
                'Badge vérifié (gagne la confiance des clients)',
                '💬 Envoi de devis (augmente vos ventes)'
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
