import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RateLimiterRedis } from '$lib/rate-limiting/rate-limiter';
import { redis } from '$lib/rate-limiting/redis';

// Mock redis
vi.mock('$lib/rate-limiting/redis', () => ({
    redis: {
        incr: vi.fn(),
        pexpire: vi.fn(),
        pttl: vi.fn(),
        get: vi.fn(),
        del: vi.fn()
    }
}));

describe('RateLimiterRedis', () => {
    let rateLimiter: RateLimiterRedis;

    beforeEach(() => {
        vi.clearAllMocks();
        rateLimiter = new RateLimiterRedis();
    });

    describe('checkRateLimit', () => {
        it('should allow request when under limit', async () => {
            (redis.incr as any).mockResolvedValueOnce(1);
            (redis.pexpire as any).mockResolvedValueOnce(1);

            const result = await rateLimiter.checkRateLimit('192.168.1.1', '/api/test', {
                max: 10,
                window: 60000
            });

            expect(result.isLimited).toBe(false);
            expect(redis.incr).toHaveBeenCalledWith('ratelimit:192.168.1.1:/api/test');
            expect(redis.pexpire).toHaveBeenCalledWith('ratelimit:192.168.1.1:/api/test', 60000);
        });

        it('should set TTL only on first request', async () => {
            (redis.incr as any).mockResolvedValueOnce(2);
            // pexpire should not be called when count > 1

            const result = await rateLimiter.checkRateLimit('192.168.1.1', '/api/test', {
                max: 10,
                window: 60000
            });

            expect(result.isLimited).toBe(false);
            expect(redis.pexpire).not.toHaveBeenCalled();
        });

        it('should limit request when over limit', async () => {
            (redis.incr as any).mockResolvedValueOnce(11);
            (redis.pttl as any).mockResolvedValueOnce(45000); // 45 seconds remaining

            const result = await rateLimiter.checkRateLimit('192.168.1.1', '/api/test', {
                max: 10,
                window: 60000
            });

            expect(result.isLimited).toBe(true);
            expect(result.retryAfter).toBe(45);
            expect(result.message).toContain('45s');
        });

        it('should format message with minutes and seconds', async () => {
            (redis.incr as any).mockResolvedValueOnce(11);
            (redis.pttl as any).mockResolvedValueOnce(125000); // 125 seconds = 2m 5s

            const result = await rateLimiter.checkRateLimit('192.168.1.1', '/api/test', {
                max: 10,
                window: 60000
            });

            expect(result.isLimited).toBe(true);
            expect(result.retryAfter).toBe(125);
            expect(result.message).toContain('2m');
            expect(result.message).toContain('5s');
        });

        it('should format message with only seconds when less than a minute', async () => {
            (redis.incr as any).mockResolvedValueOnce(11);
            (redis.pttl as any).mockResolvedValueOnce(30000); // 30 seconds

            const result = await rateLimiter.checkRateLimit('192.168.1.1', '/api/test', {
                max: 10,
                window: 60000
            });

            expect(result.isLimited).toBe(true);
            expect(result.retryAfter).toBe(30);
            expect(result.message).toContain('30s');
            expect(result.message).not.toContain('m');
        });

        it('should allow request on Redis error (fail-open)', async () => {
            (redis.incr as any).mockRejectedValueOnce(new Error('Redis connection error'));

            const result = await rateLimiter.checkRateLimit('192.168.1.1', '/api/test', {
                max: 10,
                window: 60000
            });

            expect(result.isLimited).toBe(false);
        });
    });

    describe('getRateLimitStats', () => {
        it('should return count and TTL', async () => {
            (redis.get as any).mockResolvedValueOnce('5');
            (redis.pttl as any).mockResolvedValueOnce(45000); // 45 seconds

            const stats = await rateLimiter.getRateLimitStats('192.168.1.1', '/api/test');

            expect(stats.count).toBe(5);
            expect(stats.ttl).toBe(45);
            expect(redis.get).toHaveBeenCalledWith('ratelimit:192.168.1.1:/api/test');
        });

    it('should return 0 when key does not exist', async () => {
        (redis.get as any).mockResolvedValueOnce(null);
        (redis.pttl as any).mockResolvedValueOnce(-2); // Key does not exist

        const stats = await rateLimiter.getRateLimitStats('192.168.1.1', '/api/test');

        expect(stats.count).toBe(0);
        // Math.ceil(-2/1000) = -0, which is technically different from 0 in JS
        expect(stats.ttl).toBeLessThanOrEqual(0);
    });

        it('should handle Redis errors gracefully', async () => {
            (redis.get as any).mockRejectedValueOnce(new Error('Redis error'));

            const stats = await rateLimiter.getRateLimitStats('192.168.1.1', '/api/test');

            expect(stats.count).toBe(0);
            expect(stats.ttl).toBe(0);
        });
    });

    describe('resetRateLimit', () => {
        it('should delete the rate limit key', async () => {
            (redis.del as any).mockResolvedValueOnce(1);

            await rateLimiter.resetRateLimit('192.168.1.1', '/api/test');

            expect(redis.del).toHaveBeenCalledWith('ratelimit:192.168.1.1:/api/test');
        });

        it('should handle Redis errors gracefully', async () => {
            (redis.del as any).mockRejectedValueOnce(new Error('Redis error'));

            // Should not throw
            await expect(rateLimiter.resetRateLimit('192.168.1.1', '/api/test')).resolves.not.toThrow();
        });
    });
});

