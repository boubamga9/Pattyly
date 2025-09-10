// +server.ts (fichier principal simplifié)
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyWebhookSignature } from '../utils/webhook-verification';
import { checkIdempotence } from '../utils/idempotence';
import { handleAccountUpdated, handleAccountAuthorized } from '../handlers/account-handlers';
import type { Stripe } from 'stripe';

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
                await handleAccountUpdated(event.data.object as Stripe.Account, locals);
                break;

            case 'account.application.authorized':
                await handleAccountAuthorized(event.data.object as unknown as Stripe.Account, locals);
                break;

            default:
        }

        return json({ received: true });

    } catch (err) {
        throw error(500, 'Webhook processing failed');
    }
};