// +server.ts (fichier principal simplifié)
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyWebhookSignature } from '../utils/webhook-verification';
import { checkIdempotence } from '../utils/idempotence';
import { handleCheckoutSessionCompleted } from '../handlers/checkout-handlers';
import { handlePaymentFailed, handlePaymentSucceeded } from '../handlers/payment-handlers';
import { handleSubscriptionDeleted } from '../handlers/subscription-handlers';
import { handleCustomerCreated } from '../handlers/customer-handlers';
import { upsertSubscription } from '../handlers/subscription-handlers';
import type { Stripe } from 'stripe';
import { ErrorLogger } from '$lib/services/error-logging';

import { PRIVATE_STRIPE_WEBHOOK_SECRET_PAYMENTS } from '$env/static/private';


const endpointSecret = PRIVATE_STRIPE_WEBHOOK_SECRET_PAYMENTS;

export const POST: RequestHandler = async ({ request, locals }) => {
    try {
        // 1. Vérifier la signature Stripe
        const event = await verifyWebhookSignature(request, endpointSecret);

        // 2. Vérifier l'idempotence
        await checkIdempotence(event.id, locals);

        // 3. Router vers le bon handler
        switch (event.type) {

            case 'customer.created':
                console.log('customer.created');
                await handleCustomerCreated(event.data.object as Stripe.Customer, locals);
                break;

            case 'customer.subscription.created':
            case 'customer.subscription.updated':
                console.log('customer.subscription.created/updated');
                await upsertSubscription(event.data.object as Stripe.Subscription, locals);
                break;

            case 'customer.subscription.deleted':
                console.log('customer.subscription.deleted');
                await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, locals);
                break;

            case 'invoice.payment_succeeded':
                console.log('invoice.payment_succeeded');
                await handlePaymentSucceeded(event.data.object as Stripe.Invoice, locals);
                break;

            case 'invoice.payment_failed':
                console.log('invoice.payment_failed');
                await handlePaymentFailed(event.data.object as Stripe.Invoice, locals);
                break;

            case 'checkout.session.completed':
                console.log('checkout.session.completed');
                await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session, locals);
                break;

            default:
        }

        return json({ received: true });

    } catch (err) {
        await ErrorLogger.logCritical(err, {
            url: request.url,
            method: request.method,
            userAgent: request.headers.get('user-agent') || undefined,
        }, {
            webhookType: 'stripe_payments',
            timestamp: new Date().toISOString(),
        });
        return new Response('Webhook processing failed', { status: 500 })
    }
};