import Stripe from 'stripe';
import { PUBLIC_SITE_URL } from '$env/static/public';

/**
 * Stripe Connect utilities for managing OAuth and checkout sessions
 */

/**
 * Create a new Stripe Connect Express account
 */
export async function createStripeConnectAccount(
	stripe: Stripe,
	email: string,
	country: string = 'FR'
): Promise<Stripe.Account> {
	return await stripe.accounts.create({
		type: 'express',
		country,
		email,
		capabilities: {
			card_payments: { requested: true },
			transfers: { requested: true },
		},
	});
}

/**
 * Create an account link for Stripe Connect onboarding
 */
export async function createStripeAccountLink(
	stripe: Stripe,
	accountId: string,
	returnUrl: string
): Promise<Stripe.AccountLink> {
	return await stripe.accountLinks.create({
		account: accountId,
		refresh_url: returnUrl,
		return_url: returnUrl,
		type: 'account_onboarding',
	});
}

/**
 * Create an account link for updating existing Stripe Connect account
 */
export async function createStripeAccountUpdateLink(
	stripe: Stripe,
	accountId: string,
	returnUrl: string
): Promise<Stripe.AccountLink> {
	return await stripe.accountLinks.create({
		account: accountId,
		refresh_url: returnUrl,
		return_url: returnUrl,
		type: 'account_update',
	});
}

/**
 * Retrieve Stripe Connect account details
 */
export async function getStripeConnectAccount(
	stripe: Stripe,
	accountId: string
): Promise<Stripe.Account> {
	return await stripe.accounts.retrieve(accountId);
}

/**
 * Create a checkout session with Stripe Connect
 * @param stripe - Stripe instance (must use platform account, not connected account)
 * @param connectAccountId - Stripe Connect account ID where the payment should go
 * @param amount - Amount in cents (euros * 100)
 * @param metadata - Metadata to attach to the session
 * @param successUrl - URL to redirect to on success
 * @param cancelUrl - URL to redirect to on cancel
 * @param applicationFeeAmount - Platform fee in cents (optional, defaults to 0)
 * @param productName - Product name for the checkout (optional)
 * @param customerEmail - Customer email to prefill in the checkout form (optional)
 */
export async function createStripeConnectCheckoutSession(
	stripe: Stripe,
	connectAccountId: string,
	amount: number,
	metadata: Record<string, string>,
	successUrl: string,
	cancelUrl: string,
	applicationFeeAmount: number = 0,
	productName?: string,
	customerEmail?: string
): Promise<Stripe.Checkout.Session> {
	// For Stripe Connect, we create the session on the platform account
	// and use payment_intent_data to specify the connected account
	const sessionParams: Stripe.Checkout.SessionCreateParams = {
		mode: 'payment',
		payment_method_types: ['card'],
		line_items: [
			{
				price_data: {
					currency: 'eur',
					product_data: {
						name: productName || 'Paiement',
					},
					unit_amount: amount,
				},
				quantity: 1,
			},
		],
		payment_intent_data: {
			on_behalf_of: connectAccountId,
			transfer_data: {
				destination: connectAccountId,
			},
			...(applicationFeeAmount > 0 && {
				application_fee_amount: applicationFeeAmount,
			}),
		},
		success_url: successUrl,
		cancel_url: cancelUrl,
		metadata,
		...(customerEmail && { customer_email: customerEmail }),
	};

	return await stripe.checkout.sessions.create(sessionParams);
}

/**
 * Check if a Stripe Connect account is ready to receive payments
 */
export function isStripeConnectAccountReady(account: Stripe.Account): boolean {
	return (
		account.charges_enabled === true &&
		account.payouts_enabled === true &&
		account.details_submitted === true
	);
}

