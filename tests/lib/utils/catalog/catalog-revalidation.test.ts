import { describe, it, expect, vi, beforeEach } from 'vitest';
import { forceRevalidateShop } from '$lib/utils/catalog/catalog-revalidation';

// Mock global fetch
global.fetch = vi.fn();

// Mock environment variables
vi.mock('$env/dynamic/private', () => ({
    env: {
        REVALIDATION_TOKEN: 'test-token-123'
    }
}));

vi.mock('$env/static/public', () => ({
    PUBLIC_SITE_URL: 'https://pattyly.com'
}));

describe('forceRevalidateShop', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('should return true when revalidation succeeds (200)', async () => {
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            status: 200,
            headers: new Headers()
        });

        const result = await forceRevalidateShop('test-shop');

        expect(result).toBe(true);
        expect(global.fetch).toHaveBeenCalledWith(
            'https://pattyly.com/test-shop?bypassToken=test-token-123',
            expect.objectContaining({
                method: 'HEAD',
                headers: expect.objectContaining({
                    'User-Agent': 'Pattyly-Revalidation/1.0',
                    'x-prerender-revalidate': 'test-token-123'
                })
            })
        );
    });

    it('should return true when shop returns 404 (old slug)', async () => {
        (global.fetch as any).mockResolvedValueOnce({
            ok: false,
            status: 404,
            headers: new Headers()
        });

        const result = await forceRevalidateShop('old-shop-slug');

        expect(result).toBe(true);
    });

    it('should return false when revalidation fails with other status', async () => {
        (global.fetch as any).mockResolvedValueOnce({
            ok: false,
            status: 500,
            headers: new Headers()
        });

        const result = await forceRevalidateShop('test-shop');

        expect(result).toBe(false);
    });

    it('should return true on timeout error (expected for old slugs)', async () => {
        const timeoutError = new Error('The operation was aborted');
        timeoutError.name = 'TimeoutError';
        
        (global.fetch as any).mockRejectedValueOnce(timeoutError);

        const result = await forceRevalidateShop('old-shop-slug');

        expect(result).toBe(true);
    });

    it('should return false on other fetch errors', async () => {
        const networkError = new Error('Network error');
        (global.fetch as any).mockRejectedValueOnce(networkError);

        const result = await forceRevalidateShop('test-shop');

        expect(result).toBe(false);
    });

    it('should include correct headers in fetch request', async () => {
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            status: 200,
            headers: new Headers()
        });

        await forceRevalidateShop('test-shop');

        const fetchCall = (global.fetch as any).mock.calls[0];
        expect(fetchCall[1].headers).toEqual({
            'User-Agent': 'Pattyly-Revalidation/1.0',
            'x-prerender-revalidate': 'test-token-123'
        });
    });

    it('should use correct URL format with bypassToken', async () => {
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            status: 200,
            headers: new Headers()
        });

        await forceRevalidateShop('my-shop');

        const fetchCall = (global.fetch as any).mock.calls[0];
        expect(fetchCall[0]).toBe('https://pattyly.com/my-shop?bypassToken=test-token-123');
    });
});


