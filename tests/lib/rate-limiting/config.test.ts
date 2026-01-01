import { describe, it, expect } from 'vitest';
import { RATE_LIMITS } from '$lib/rate-limiting/config';

describe('RATE_LIMITS config', () => {
    it('should have rate limits defined for all routes', () => {
        expect(RATE_LIMITS).toBeDefined();
        expect(typeof RATE_LIMITS).toBe('object');
    });

    it('should have rate limit for /contact route', () => {
        expect(RATE_LIMITS['/contact']).toBeDefined();
        expect(RATE_LIMITS['/contact'].max).toBe(3);
        expect(RATE_LIMITS['/contact'].window).toBe(3600000); // 1 hour
    });

    it('should have rate limit for /register route', () => {
        expect(RATE_LIMITS['/register']).toBeDefined();
        expect(RATE_LIMITS['/register'].max).toBe(10);
        expect(RATE_LIMITS['/register'].window).toBe(3600000); // 1 hour
    });

    it('should have rate limit for /login route', () => {
        expect(RATE_LIMITS['/login']).toBeDefined();
        expect(RATE_LIMITS['/login'].max).toBe(10);
        expect(RATE_LIMITS['/login'].window).toBe(3600000); // 1 hour
    });

    it('should have rate limit for /forgot-password route', () => {
        expect(RATE_LIMITS['/forgot-password']).toBeDefined();
        expect(RATE_LIMITS['/forgot-password'].max).toBe(5);
        expect(RATE_LIMITS['/forgot-password'].window).toBe(3600000); // 1 hour
    });

    it('should have rate limit for /custom route', () => {
        expect(RATE_LIMITS['/custom']).toBeDefined();
        expect(RATE_LIMITS['/custom'].max).toBe(10);
        expect(RATE_LIMITS['/custom'].window).toBe(3600000); // 1 hour
    });

    it('should have rate limit for /product route', () => {
        expect(RATE_LIMITS['/product']).toBeDefined();
        expect(RATE_LIMITS['/product'].max).toBe(10);
        expect(RATE_LIMITS['/product'].window).toBe(3600000); // 1 hour
    });

    it('should have consistent window time for all routes', () => {
        const windows = Object.values(RATE_LIMITS).map(config => config.window);
        const uniqueWindows = [...new Set(windows)];
        // All should be 1 hour (3600000ms) or we can check each individually
        expect(uniqueWindows.every(w => w === 3600000)).toBe(true);
    });

    it('should have max values greater than 0', () => {
        Object.entries(RATE_LIMITS).forEach(([route, config]) => {
            expect(config.max).toBeGreaterThan(0);
            expect(config.window).toBeGreaterThan(0);
        });
    });
});


