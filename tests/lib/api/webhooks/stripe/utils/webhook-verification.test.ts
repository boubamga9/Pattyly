import { describe, it, expect, vi, beforeEach } from 'vitest';
import type Stripe from 'stripe';

// Mock Stripe - must use factory function to avoid hoisting issues
vi.mock('stripe', () => {
    const mockConstructEvent = vi.fn();
    // Stripe is a class with static webhooks property
    return {
        default: class MockStripe {
            static webhooks = {
                constructEvent: mockConstructEvent
            };
            webhooks = {
                constructEvent: mockConstructEvent
            };
        },
        webhooks: {
            constructEvent: mockConstructEvent
        },
        __mockConstructEvent: mockConstructEvent
    };
});

import { verifyWebhookSignature } from '../../../../../../src/routes/api/webhooks/stripe/utils/webhook-verification';

describe('webhook-verification', () => {
    let mockConstructEvent: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        
        // Get the mock function from the module
        const stripeModule = await import('stripe');
        mockConstructEvent = (stripeModule as any).__mockConstructEvent;
    });

    const createMockRequest = (body: string, signature: string | null = 'valid-signature') => {
        return {
            text: vi.fn().mockResolvedValue(body),
            headers: {
                get: vi.fn((name: string) => {
                    if (name === 'stripe-signature') return signature;
                    return null;
                })
            }
        } as any;
    };

    it('should verify webhook signature successfully', async () => {
        const mockEvent = { id: 'evt_123', type: 'payment_intent.succeeded' } as Stripe.Event;
        mockConstructEvent.mockReturnValue(mockEvent);

        const request = createMockRequest('test body', 'valid-signature');
        const endpointSecret = 'whsec_test_secret';

        const result = await verifyWebhookSignature(request, endpointSecret);

        expect(mockConstructEvent).toHaveBeenCalledWith('test body', 'valid-signature', endpointSecret);
        expect(result.id).toBe(mockEvent.id);
        expect(result.type).toBe(mockEvent.type);
    });

    it('should throw error when endpointSecret is missing', async () => {
        const request = createMockRequest('test body', 'valid-signature');

        await expect(verifyWebhookSignature(request, '')).rejects.toThrow();
    });

    it('should throw error when signature is missing', async () => {
        const request = createMockRequest('test body', null);
        const endpointSecret = 'whsec_test_secret';

        await expect(verifyWebhookSignature(request, endpointSecret)).rejects.toThrow();
    });

    it('should throw error when signature verification fails', async () => {
        mockConstructEvent.mockImplementation(() => {
            throw new Error('Invalid signature');
        });

        const request = createMockRequest('test body', 'invalid-signature');
        const endpointSecret = 'whsec_test_secret';

        await expect(verifyWebhookSignature(request, endpointSecret)).rejects.toThrow();
    });
});
