// +server.ts - Webhook endpoint for Stripe Connect account events
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyWebhookSignature } from '../utils/webhook-verification';
import { checkIdempotence } from '../utils/idempotence';
import { handleAccountUpdated } from '../handlers/account-handlers';
import type { Stripe } from 'stripe';
import { ErrorLogger } from '$lib/services/error-logging';
import { logger } from '$lib/utils/logger';
import { PRIVATE_STRIPE_WEBHOOK_SECRET_ACCOUNTS } from '$env/static/private';

const endpointSecret = PRIVATE_STRIPE_WEBHOOK_SECRET_ACCOUNTS;

export const POST: RequestHandler = async ({ request, locals }) => {
    try {
        // 1. Vérifier la signature Stripe
        const event = await verifyWebhookSignature(request, endpointSecret);

        // 2. Vérifier l'idempotence
        await checkIdempotence(event.id, locals);

        // 3. Router vers le bon handler
        switch (event.type) {
            case 'account.updated':
                logger.log('[Webhook] account.updated');
                await handleAccountUpdated(event.data.object as Stripe.Account, locals);
                break;

            default:
                logger.log(`[Webhook] Unhandled event type: ${event.type}`);
        }

        return json({ received: true });
    } catch (err) {
        await ErrorLogger.logCritical(err, {
            url: request.url,
            method: request.method,
            userAgent: request.headers.get('user-agent') || undefined,
        }, {
            webhookType: 'stripe_accounts',
            timestamp: new Date().toISOString(),
        });
        // Stripe recevra un 500 → l'événement sera retenté
        return new Response('Webhook processing failed', { status: 500 });
    }
};


