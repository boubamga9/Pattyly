// utils/webhook-verification.ts
import Stripe from 'stripe';
import { error } from '@sveltejs/kit';
import { PRIVATE_STRIPE_WEBHOOK_SECRET } from '$env/static/private';

const endpointSecret = PRIVATE_STRIPE_WEBHOOK_SECRET;

export async function verifyWebhookSignature(request: Request): Promise<Stripe.Event> {
    const body = await request.text();
    const sig = request.headers.get('stripe-signature');

    console.log('🔍 Webhook verification:', {
        secretExists: !!endpointSecret,
        signatureExists: !!sig
    });

    if (!endpointSecret || !sig) {
        console.error('❌ Missing webhook secret or signature');
        throw error(400, 'Webhook signature verification failed');
    }

    try {
        const event = Stripe.webhooks.constructEvent(body, sig, endpointSecret);
        console.log('✅ Webhook signature verified');
        return event;
    } catch (err) {
        console.error('❌ Webhook signature verification failed:', err);
        throw error(400, 'Webhook signature verification failed');
    }
}