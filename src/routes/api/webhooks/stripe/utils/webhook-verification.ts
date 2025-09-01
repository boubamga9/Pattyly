// utils/webhook-verification.ts
import Stripe from 'stripe';
import { error } from '@sveltejs/kit';
import { PRIVATE_STRIPE_WEBHOOK_SECRET } from '$env/static/private';

const endpointSecret = PRIVATE_STRIPE_WEBHOOK_SECRET;

export async function verifyWebhookSignature(request: Request): Promise<Stripe.Event> {
    const body = await request.text();
    const sig = request.headers.get('stripe-signature');

    if (!endpointSecret || !sig) {
        throw error(400, 'Webhook signature verification failed');
    }

    try {
        const event = Stripe.webhooks.constructEvent(body, sig, endpointSecret);
        return event;
    } catch (err) {
        throw error(400, 'Webhook signature verification failed');
    }
}