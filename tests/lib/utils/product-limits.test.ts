import { describe, it, expect } from 'vitest';
import { getProductLimit, PRODUCT_LIMITS, type Plan } from '$lib/utils/product-limits';

describe('getProductLimit', () => {
    it('should return free limit for null plan', () => {
        expect(getProductLimit(null)).toBe(PRODUCT_LIMITS.free);
    });

    it('should return correct limit for free plan', () => {
        expect(getProductLimit('free')).toBe(PRODUCT_LIMITS.free);
        expect(getProductLimit('free')).toBe(3);
    });

    it('should return correct limit for basic plan', () => {
        expect(getProductLimit('basic')).toBe(PRODUCT_LIMITS.basic);
        expect(getProductLimit('basic')).toBe(10);
    });

    it('should return correct limit for premium plan', () => {
        expect(getProductLimit('premium')).toBe(PRODUCT_LIMITS.premium);
        expect(getProductLimit('premium')).toBe(999999);
    });

    it('should return correct limit for exempt plan', () => {
        expect(getProductLimit('exempt')).toBe(PRODUCT_LIMITS.exempt);
        expect(getProductLimit('exempt')).toBe(999999);
    });
});

