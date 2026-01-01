import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { POST } from '../../../src/routes/api/revalidate-shop/+server';
import { forceRevalidateShop } from '$lib/utils/catalog/catalog-revalidation';

// Mock forceRevalidateShop
vi.mock('$lib/utils/catalog/catalog-revalidation', () => ({
    forceRevalidateShop: vi.fn()
}));

// Mock env module
vi.mock('$env/dynamic/private', () => ({
    env: {
        REVALIDATION_TOKEN: 'test-token-123'
    }
}));

describe('/api/revalidate-shop', () => {
    let mockRequestEvent: Partial<RequestEvent>;
    let originalEnv: string | undefined;

    // Helper to create a properly configured request event
    const createMockRequestEvent = (options: {
        jsonData?: any;
        authHeader?: string | null;
    }): Partial<RequestEvent> => {
        return {
            request: {
                json: vi.fn().mockResolvedValue(options.jsonData || { slug: 'my-shop' }),
                headers: {
                    get: vi.fn((name: string) => {
                        if (name === 'authorization') {
                            return options.authHeader !== undefined ? options.authHeader : 'Bearer test-token-123';
                        }
                        return null;
                    })
                }
            } as any
        };
    };

    beforeEach(() => {
        vi.clearAllMocks();

        mockRequestEvent = createMockRequestEvent({});
    });

    it('should revalidate shop successfully', async () => {
        (forceRevalidateShop as any).mockResolvedValue(true);

        const response = await POST(mockRequestEvent as RequestEvent);
        const data = await response.json();

        expect(data.success).toBe(true);
        expect(data.message).toContain('revalidated successfully');
        expect(forceRevalidateShop).toHaveBeenCalledWith('my-shop');
    });

    it('should return 401 when authorization token is missing', async () => {
        const event = createMockRequestEvent({ authHeader: null });
        
        const response = await POST(event as RequestEvent);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Unauthorized');
        expect(forceRevalidateShop).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization token is incorrect', async () => {
        const event = createMockRequestEvent({ authHeader: 'Bearer wrong-token' });
        
        const response = await POST(event as RequestEvent);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 when slug is missing', async () => {
        const event = createMockRequestEvent({ jsonData: {} });
        
        const response = await POST(event as RequestEvent);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain('Slug is required');
    });

    it('should return 400 when slug is not a string', async () => {
        const event = createMockRequestEvent({ jsonData: { slug: 123 } });
        
        const response = await POST(event as RequestEvent);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain('Slug is required');
    });

    it('should return 500 when revalidation fails', async () => {
        (forceRevalidateShop as any).mockResolvedValue(false);

        const response = await POST(mockRequestEvent as RequestEvent);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.success).toBe(false);
        expect(data.error).toContain('Failed to revalidate');
    });
});
