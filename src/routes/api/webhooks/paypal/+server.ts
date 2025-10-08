// +server.ts - PayPal Webhooks (comme Stripe)
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyPayPalWebhook } from './utils/webhook-verification';
import { checkPayPalIdempotence } from './utils/idempotence';
import {
    handleMerchantOnboardingCompleted,
} from './handlers/merchant-handlers';
import {
    handlePaymentCaptureCompleted,
} from './handlers/payment-handlers';

// PayPal webhook event types we care about
const PAYPAL_EVENTS = {
    MERCHANT_ONBOARDING_COMPLETED: 'MERCHANT.ONBOARDING.COMPLETED',
    PAYMENT_CAPTURE_COMPLETED: 'PAYMENT.CAPTURE.COMPLETED',
} as const;

export const POST: RequestHandler = async ({ request, locals }) => {
    console.log('🔔 [PayPal Webhook] Received webhook request');

    try {

        // 1. Vérifier la signature PayPal (comme Stripe)
        const event = await verifyPayPalWebhook(request);
        console.log('✅ [PayPal Webhook] Event verified:', event.event_type, 'ID:', event.id);

        // 3. Check idempotence (prevent duplicate processing)
        const idempotenceResponse = await checkPayPalIdempotence(event.id, event.event_type, locals);
        if (idempotenceResponse) return idempotenceResponse;

        // 4. Route to appropriate handler
        switch (event.event_type) {
            case PAYPAL_EVENTS.MERCHANT_ONBOARDING_COMPLETED:
                await handleMerchantOnboardingCompleted(event.resource, locals);
                break;

            case PAYPAL_EVENTS.PAYMENT_CAPTURE_COMPLETED:
                await handlePaymentCaptureCompleted(event.resource, locals);
                break;

            default:
                console.log(`ℹ️ Unhandled event type: ${event.event_type}`);
        }

        return json({ received: true });

    } catch (err) {
        console.error('❌ [PayPal Webhook] Processing failed:', err);
        // PayPal recevra un 500 → l'événement sera retenté
        return new Response('Webhook processing failed', { status: 500 });
    }
};
