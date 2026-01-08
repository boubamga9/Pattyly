import { describe, it, expect } from 'vitest';
import {
    paypalMeSchema,
    paymentLinkSchema,
    createPaymentLinkSchema,
    updatePaymentLinkSchema,
} from '$lib/validations/schemas/payment';

const validUUID = '550e8400-e29b-41d4-a716-446655440000';
const validUUID2 = '123e4567-e89b-12d3-a456-426614174000';

describe('paypalMeSchema', () => {
    it('should validate correct PayPal.me usernames', () => {
        expect(() => paypalMeSchema.parse('shop123')).not.toThrow();
        expect(() => paypalMeSchema.parse('my-shop')).not.toThrow();
        expect(() => paypalMeSchema.parse('my_shop')).not.toThrow();
        expect(() => paypalMeSchema.parse('Shop123')).not.toThrow();
    });

    it('should convert to lowercase', () => {
        const result = paypalMeSchema.parse('MY-SHOP');
        expect(result).toBe('my-shop');
    });

    it('should reject empty string', () => {
        expect(() => paypalMeSchema.parse('')).toThrow('requis');
    });

    it('should reject strings longer than 50 characters', () => {
        expect(() => paypalMeSchema.parse('a'.repeat(51))).toThrow('50 caractères');
    });

    it('should reject strings with invalid characters', () => {
        expect(() => paypalMeSchema.parse('my shop')).toThrow(); // spaces
        expect(() => paypalMeSchema.parse('my@shop')).toThrow(); // @ symbol
        expect(() => paypalMeSchema.parse('my.shop')).toThrow(); // dots
    });

    it('should accept exactly 50 characters', () => {
        expect(() => paypalMeSchema.parse('a'.repeat(50))).not.toThrow();
    });
});

describe('paymentLinkSchema', () => {
    const validPaymentLink = {
        id: validUUID,
        profile_id: validUUID2,
        paypal_me: 'shop123',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
    };

    it('should validate correct payment link', () => {
        expect(() => paymentLinkSchema.parse(validPaymentLink)).not.toThrow();
    });

    it('should convert paypal_me to lowercase', () => {
        const result = paymentLinkSchema.parse({
            ...validPaymentLink,
            paypal_me: 'MY-SHOP'
        });
        expect(result.paypal_me).toBe('my-shop');
    });

    it('should reject invalid UUIDs', () => {
        expect(() => paymentLinkSchema.parse({
            ...validPaymentLink,
            id: 'not-a-uuid'
        })).toThrow();
    });

    it('should reject invalid paypal_me format', () => {
        expect(() => paymentLinkSchema.parse({
            ...validPaymentLink,
            paypal_me: 'invalid format!'
        })).toThrow();
    });
});

describe('createPaymentLinkSchema', () => {
    it('should validate correct create payment link data', () => {
        expect(() => createPaymentLinkSchema.parse({
            paypal_me: 'shop123'
        })).not.toThrow();
    });

    it('should convert paypal_me to lowercase', () => {
        const result = createPaymentLinkSchema.parse({
            paypal_me: 'MY-SHOP'
        });
        expect(result.paypal_me).toBe('my-shop');
    });

    it('should reject missing paypal_me', () => {
        expect(() => createPaymentLinkSchema.parse({})).toThrow();
    });

    it('should reject invalid paypal_me format', () => {
        expect(() => createPaymentLinkSchema.parse({
            paypal_me: 'invalid format!'
        })).toThrow();
    });
});

describe('updatePaymentLinkSchema', () => {
    it('should validate correct update payment link data', () => {
        expect(() => updatePaymentLinkSchema.parse({
            paypal_me: 'new-shop-name'
        })).not.toThrow();
    });

    it('should convert paypal_me to lowercase', () => {
        const result = updatePaymentLinkSchema.parse({
            paypal_me: 'NEW-SHOP-NAME'
        });
        expect(result.paypal_me).toBe('new-shop-name');
    });

    it('should reject missing paypal_me', () => {
        expect(() => updatePaymentLinkSchema.parse({})).toThrow();
    });
});




