import type { Provider } from '@supabase/supabase-js';
import { STRIPE_BASIC_PRODUCT_ID, STRIPE_PREMIUM_PRODUCT_ID, STRIPE_BASIC_PRICE_ID, STRIPE_PREMIUM_PRICE_ID } from '$env/static/public';

export const WebsiteName: string = 'Pattyly';

/* You'll need to configure your providers in
your Supabase project settings `/supabase/config.toml` */
export const oAuthProviders: Provider[] = [
	//'google'
];

/**
 * List of Stripe Product IDs to display in the billing settings page.
 * If set to `null`, all active products will be displayed.
 */
export const stripeProductIds: null | string[] = null;

/**
 * Stripe Product IDs for different plans
 */
export const STRIPE_PRODUCTS = {
	BASIC: STRIPE_BASIC_PRODUCT_ID,
	PREMIUM: STRIPE_PREMIUM_PRODUCT_ID
} as const;

/**
 * Stripe Price IDs for different plans
 */
export const STRIPE_PRICES = {
	BASIC: STRIPE_BASIC_PRICE_ID,
	PREMIUM: STRIPE_PREMIUM_PRICE_ID
} as const;
