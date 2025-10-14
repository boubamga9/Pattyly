import { env } from '$env/dynamic/private';

/**
 * Configuration côté serveur uniquement
 * Contient les variables d'environnement privées
 */

/**
 * Stripe Product IDs for different plans
 */
export const STRIPE_PRODUCTS = {
    BASIC: env.STRIPE_BASIC_PRODUCT_ID,
    PREMIUM: env.STRIPE_PREMIUM_PRODUCT_ID
} as const;

/**
 * Stripe Price IDs for different plans
 */
export const STRIPE_PRICES = {
    BASIC: env.STRIPE_BASIC_PRICE_ID,
    PREMIUM: env.STRIPE_PREMIUM_PRICE_ID,
    EARLY: env.STRIPE_EARLY_ADOPTERS_PRICE_ID
} as const;
