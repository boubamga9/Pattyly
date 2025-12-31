import { describe, it, expect } from 'vitest';
import { getOrderLimit, ORDER_LIMITS, type Plan } from './order-limits';

describe('order-limits', () => {
	describe('getOrderLimit', () => {
		it('should return correct limit for free plan', () => {
			expect(getOrderLimit('free')).toBe(ORDER_LIMITS.free);
			expect(getOrderLimit('free')).toBe(5);
		});

		it('should return correct limit for basic plan', () => {
			expect(getOrderLimit('basic')).toBe(ORDER_LIMITS.basic);
			expect(getOrderLimit('basic')).toBe(20);
		});

		it('should return correct limit for premium plan', () => {
			expect(getOrderLimit('premium')).toBe(ORDER_LIMITS.premium);
			expect(getOrderLimit('premium')).toBe(999999);
		});

		it('should return correct limit for exempt plan', () => {
			expect(getOrderLimit('exempt')).toBe(ORDER_LIMITS.exempt);
			expect(getOrderLimit('exempt')).toBe(999999);
		});

		it('should return free limit for null plan', () => {
			expect(getOrderLimit(null)).toBe(ORDER_LIMITS.free);
			expect(getOrderLimit(null)).toBe(5);
		});

		it('should return free limit for invalid plan', () => {
			// TypeScript devrait empêcher ça, mais on teste au cas où
			expect(getOrderLimit('invalid' as Plan)).toBe(ORDER_LIMITS.free);
		});

		it('should handle all valid plan types', () => {
			const plans: Plan[] = ['free', 'basic', 'premium', 'exempt'];
			plans.forEach((plan) => {
				const limit = getOrderLimit(plan);
				expect(limit).toBeGreaterThan(0);
				expect(typeof limit).toBe('number');
			});
		});
	});

	describe('ORDER_LIMITS constant', () => {
		it('should have correct limit values', () => {
			expect(ORDER_LIMITS.free).toBe(5);
			expect(ORDER_LIMITS.basic).toBe(20);
			expect(ORDER_LIMITS.premium).toBe(999999);
			expect(ORDER_LIMITS.exempt).toBe(999999);
		});

		it('should have premium and exempt as unlimited (very high number)', () => {
			expect(ORDER_LIMITS.premium).toBeGreaterThan(100000);
			expect(ORDER_LIMITS.exempt).toBeGreaterThan(100000);
		});

		it('should have free limit less than basic limit', () => {
			expect(ORDER_LIMITS.free).toBeLessThan(ORDER_LIMITS.basic);
		});
	});
});

