import { fetchCurrentUsersSubscription } from '$lib/stripe/client-helpers';
import { error, redirect } from '@sveltejs/kit';
import Stripe from 'stripe';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({
	params,
	url,
	locals: { safeGetSession, supabaseServiceRole: _supabaseServiceRole, stripe },
}) => {
	const { session, user } = await safeGetSession();
	if (!session || !user) {
		const search = new URLSearchParams(url.search);
		search.set('next', url.pathname);
		return redirect(303, `/register?${search.toString()}`);
	}

	let price;
	try {
		price = await stripe.prices.retrieve(params.priceID);
		console.log('✅ Stripe price retrieved:', price.id);
	} catch (stripeError: unknown) {
		console.error('❌ Stripe price not found:', params.priceID, stripeError);
		error(404, `Price ID "${params.priceID}" not found in Stripe. Please configure your Stripe products and prices.`);
	}

	const customAmount = price.custom_unit_amount
		? url.searchParams.has('customAmount')
			? parseInt(url.searchParams.get('customAmount') || '0', 10) * 100
			: price.custom_unit_amount.preset || 0
		: null;

	const amount =
		customAmount !== null && !isNaN(customAmount)
			? customAmount
			: price.unit_amount;
	if (amount === 0) {
		return redirect(303, '/dashboard');
	}

	// Vérifier si l'utilisateur a déjà un customer Stripe
	console.log('🔍 Checking existing Stripe customer for user:', user.id);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const { data: existingCustomer } = await (_supabaseServiceRole as any)
		.from('stripe_customers')
		.select('stripe_customer_id')
		.eq('profile_id', user.id)
		.single();

	let customer: string;
	if (existingCustomer) {
		// Utiliser le customer existant
		customer = existingCustomer.stripe_customer_id;
		console.log('✅ Using existing Stripe customer:', customer);
	} else {
		// Créer un nouveau customer Stripe
		console.log('🆕 Creating new Stripe customer for user:', user.email);
		try {
			const { id } = await stripe.customers.create({
				email: user.email,
				metadata: {
					user_id: user.id,
				},
			});
			customer = id;
			console.log('✅ New Stripe customer created:', customer);
		} catch (customerError) {
			console.error('❌ Error creating Stripe customer:', customerError);
			error(500, 'Error creating customer. Please try again.');
		}
	}

	// Récupérer TOUS les abonnements (actifs, annulés, expirés)
	const { data: allSubscriptions } = await stripe.subscriptions.list({
		customer,
		limit: 100,
	});

	const currentSubscriptions = await fetchCurrentUsersSubscription(
		stripe,
		customer,
	);

	// Vérifier si l'utilisateur a déjà eu un abonnement (actif, annulé, ou expiré)
	const hasHadSubscription = allSubscriptions.length > 0;

	// Si l'utilisateur a déjà eu un abonnement, pas d'essai gratuit
	if (hasHadSubscription) {
		// Vérifier qu'il y a un abonnement actif à modifier
		if (currentSubscriptions.length > 0 && currentSubscriptions[0]) {
			try {
				await stripe.subscriptions.update(currentSubscriptions[0].id, {
					items: [
						{
							id: currentSubscriptions[0].items.data[0].id,
							price: price.id,
						},
					],
				});
				return redirect(303, '/subscription');
			} catch (updateError) {
				console.error('❌ Error updating subscription:', updateError);
				error(500, 'Error updating subscription. Please try again.');
			}
		} else {
			// Pas d'abonnement actif, créer un nouveau
			console.log('User had subscription before but none active, creating new one');
		}
	}

	const lineItems: Stripe.Checkout.SessionCreateParams['line_items'] = [
		{
			...(price.custom_unit_amount
				? {
					price_data: {
						unit_amount:
							customAmount != null && !isNaN(customAmount) ? customAmount : 0,
						currency: price.currency,
						product: price.product as string,
					},
				}
				: { price: price.id }),
			quantity: 1,
		},
	];

	let checkoutUrl;
	try {
		const checkoutSession = await stripe.checkout.sessions.create({
			line_items: lineItems,
			customer,
			mode: price.type === 'recurring' ? 'subscription' : 'payment',
			success_url: `${url.origin}/dashboard`,
			cancel_url: `${url.origin}/subscription`,
			// ✅ PAS D'ESSAI GRATUIT - Géré séparément via start-trial
			...(price.type === 'recurring'
				? {
					subscription_data: {
						// Pas de trial_period_days - facturation immédiate
					},
				}
				: {
					invoice_creation: {
						enabled: true,
					},
				}),
		});
		checkoutUrl = checkoutSession.url;
	} catch (e) {
		console.error('❌ Error creating checkout session:', e);
		if (e instanceof Stripe.errors.StripeError) {
			error(500, `Stripe Error: ${e.message}`);
		} else {
			error(500, 'Unknown Error: If issue persists please contact us.');
		}
	}

	redirect(303, checkoutUrl ?? '/pricing');
};
