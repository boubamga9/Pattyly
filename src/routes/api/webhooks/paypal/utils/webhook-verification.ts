// utils/webhook-verification.ts
import { error } from '@sveltejs/kit';
import { PRIVATE_PAYPAL_WEBHOOK_ID } from '$env/static/private';
import { PUBLIC_PAYPAL_BASE_URL } from '$env/static/public';
import { paypalClient } from '$lib/paypal/client';

export interface PayPalWebhookEvent {
    id: string;
    event_type: string;
    create_time: string;
    resource_type: string;
    resource: any;
    links?: Array<{ href: string; rel: string; method: string }>;
    event_version?: string;
    summary?: string;
}

/**
 * Verify PayPal webhook signature
 */
export async function verifyPayPalWebhook(request: Request): Promise<PayPalWebhookEvent> {
    try {
        // Get raw body for PayPal verification
        const bodyText = await request.text();
        const event: PayPalWebhookEvent = JSON.parse(bodyText);

        if (!event.id || !event.event_type || !event.resource) {
            console.error('❌ Invalid PayPal webhook event structure:', event);
            throw error(400, 'Invalid webhook event structure');
        }

        // Extract PayPal headers
        const transmissionId = request.headers.get('paypal-transmission-id');
        const transmissionTime = request.headers.get('paypal-transmission-time');
        const transmissionSig = request.headers.get('paypal-transmission-sig');
        const certUrl = request.headers.get('paypal-cert-url');
        const authAlgo = request.headers.get('paypal-auth-algo');

        if (!transmissionId || !transmissionTime || !transmissionSig || !certUrl || !authAlgo) {
            console.error('❌ Missing PayPal signature headers');
            throw error(400, 'Missing PayPal signature headers');
        }

        // Ask PayPal to verify the signature
        const accessToken = await paypalClient.getAccessToken();
        const verifyRes = await fetch(`${PUBLIC_PAYPAL_BASE_URL}/v1/notifications/verify-webhook-signature`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                transmission_id: transmissionId,
                transmission_time: transmissionTime,
                transmission_sig: transmissionSig,
                cert_url: certUrl,
                auth_algo: authAlgo,
                webhook_id: PRIVATE_PAYPAL_WEBHOOK_ID,
                webhook_event: event
            })
        });

        if (!verifyRes.ok) {
            console.error('❌ Failed to verify webhook signature:', await verifyRes.text());
            throw error(400, 'Webhook signature verification failed');
        }

        const verification = await verifyRes.json();
        if (verification.verification_status !== 'SUCCESS') {
            console.error('❌ Invalid PayPal webhook signature:', verification);
            throw error(400, 'Invalid webhook signature');
        }

        return event;
    } catch (err) {
        if (err instanceof Response) throw err;
        console.error('❌ PayPal webhook verification failed:', err);
        throw error(400, 'Invalid webhook payload');
    }
}
