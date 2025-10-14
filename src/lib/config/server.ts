import { env } from '$env/dynamic/private';

/**
 * Configuration côté serveur uniquement
 * Contient les variables d'environnement privées
 */

/**
 * Stripe Product IDs for different plans
 */
export const STRIPE_PRODUCTS = {
    BASIC: env.STRIPE_BASIC_PRODUCT_ID || 'prod_Selbd3Ne2plHqG',
    PREMIUM: env.STRIPE_PREMIUM_PRODUCT_ID || 'prod_Selcz36pAfV3vV'
} as const;

/**
 * Stripe Price IDs for different plans
 */
export const STRIPE_PRICES = {
    BASIC: env.STRIPE_BASIC_PRICE_ID || 'price_1Rre1ZPNddYt1P7Lea1N7Cbq',
    PREMIUM: env.STRIPE_PREMIUM_PRICE_ID || 'price_1RrdwvPNddYt1P7LGICY3by5',
    EARLY: env.STRIPE_EARLY_ADOPTERS_PRICE_ID || 'price_1SI3TVPNddYt1P7LwMYNlvXP'
} as const;
