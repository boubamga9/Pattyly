// +server.ts (fichier principal simplifié)
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyWebhookSignature } from './utils/webhook-verification';
import { checkIdempotence } from './utils/idempotence';
import { handleCustomerCreated } from './handlers/customer-handlers';
import { upsertSubscription, handleSubscriptionDeleted } from './handlers/subscription-handlers';
import { handlePaymentSucceeded, handlePaymentFailed } from './handlers/payment-handlers';
import { handleAccountUpdated, handleAccountAuthorized } from './handlers/account-handlers';
import { handleCheckoutSessionCompleted } from './handlers/checkout-handlers';
import type { Stripe } from 'stripe';

export const POST: RequestHandler = async ({ request, locals }) => {
    try {
        // 1. Vérifier la signature Stripe
        const event = await verifyWebhookSignature(request);
        console.log('�� Processing webhook event:', event.type);

        // 2. Vérifier l'idempotence
        await checkIdempotence(event.id, locals);

        // 3. Router vers le bon handler
        switch (event.type) {
            case 'customer.created':
                await handleCustomerCreated(event.data.object as Stripe.Customer, locals);
                break;

            case 'customer.subscription.created':
            case 'customer.subscription.updated':
                await upsertSubscription(event.data.object as Stripe.Subscription, locals);
                break;

            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, locals);
                break;

            case 'invoice.payment_succeeded':
                await handlePaymentSucceeded(event.data.object as Stripe.Invoice, locals);
                break;

            case 'invoice.payment_failed':
                await handlePaymentFailed(event.data.object as Stripe.Invoice, locals);
                break;

            case 'account.updated':
                await handleAccountUpdated(event.data.object as Stripe.Account, locals);
                break;

            case 'account.application.authorized':
                await handleAccountAuthorized(event.data.object as unknown as Stripe.Account, locals);
                break;

            case 'checkout.session.completed':
                await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session, locals);
                break;

            default:
                console.log('⚠️ Unhandled event type:', event.type);
        }

        return json({ received: true });

    } catch (err) {
        console.error('💥 Webhook error:', err);
        throw error(500, 'Webhook processing failed');
    }
};