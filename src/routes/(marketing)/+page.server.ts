import { toSortedPrices } from '$lib/stripe/product-utils';
import { Stripe } from 'stripe';
import type { PageServerLoad } from './$types';

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

	// Vérifier qu'on a au moins 3 prix configurés
	if (sortedPrices.length < 3) {
		console.warn(`Only ${sortedPrices.length} Stripe prices found. Need at least 3 for marketing page.`);
		// Retourner des données par défaut pour éviter l'erreur
		return {
			prices: [] as const,
		};
	}

	const price1 = {
		...sortedPrices[0],
		product: sortedPrices[0].product as Stripe.Product,
	};
	const price2 = {
		...sortedPrices[1],
		product: sortedPrices[1].product as Stripe.Product,
	};
	const price3 = {
		...sortedPrices[2],
		product: sortedPrices[2].product as Stripe.Product,
	};

	return {
		prices: [price1, price2, price3] as const,
	};
};
