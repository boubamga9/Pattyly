import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { POST } from '../../../src/routes/api/create-custom-order/+server';

// Mock dependencies
vi.mock('$lib/utils/order-limits', () => ({
    checkOrderLimit: vi.fn()
}));

vi.mock('$lib/utils/analytics', () => ({
    logEventAsync: vi.fn(),
    Events: {
        ORDER_RECEIVED: 'order_received'
    }
}));

import { checkOrderLimit } from '$lib/utils/order-limits';

describe('/api/create-custom-order', () => {
    let mockRequestEvent: Partial<RequestEvent>;
    let mockSupabase: any;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});

        // Setup default successful mocks
        (checkOrderLimit as any).mockResolvedValue({
            isLimitReached: false,
            orderCount: 5,
            orderLimit: 10,
            plan: 'starter'
        });

        // Mock Supabase chain
        mockSupabase = {
            from: vi.fn()
        };

        mockRequestEvent = {
            request: {
                json: vi.fn()
            } as any,
            locals: {
                supabase: mockSupabase,
                supabaseServiceRole: {} as any
            } as any
        };
    });

    it('should return 400 when required fields are missing', async () => {
        (mockRequestEvent.request!.json as any).mockResolvedValue({
            shopId: 'shop-123',
            customerName: 'John Doe'
            // Missing customerEmail and selectedDate
        });

        const response = await POST(mockRequestEvent as RequestEvent);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Données manquantes');
    });

    it('should return 404 when shop is not found', async () => {
        (mockRequestEvent.request!.json as any).mockResolvedValue({
            shopId: 'non-existent-shop',
            customerName: 'John Doe',
            customerEmail: 'customer@test.com',
            selectedDate: '2024-01-15'
        });

        mockSupabase.from.mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Not found' }
            })
        });

        const response = await POST(mockRequestEvent as RequestEvent);
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toBe('Boutique non trouvée');
    });

    it('should return 403 when order limit is reached', async () => {
        (mockRequestEvent.request!.json as any).mockResolvedValue({
            shopId: 'shop-123',
            customerName: 'John Doe',
            customerEmail: 'customer@test.com',
            selectedDate: '2024-01-15'
        });

        const mockShop = {
            id: 'shop-123',
            profile_id: 'profile-123',
            slug: 'test-shop',
            name: 'Test Shop'
        };

        mockSupabase.from.mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
                data: mockShop,
                error: null
            })
        });

        (checkOrderLimit as any).mockResolvedValue({
            isLimitReached: true,
            orderCount: 10,
            orderLimit: 10,
            plan: 'starter'
        });

        const response = await POST(mockRequestEvent as RequestEvent);
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.error).toContain('Limite de commandes atteinte');
    });

    it('should return existing order ID if duplicate order exists', async () => {
        (mockRequestEvent.request!.json as any).mockResolvedValue({
            shopId: 'shop-123',
            customerName: 'John Doe',
            customerEmail: 'customer@test.com',
            selectedDate: '2024-01-15',
            shopSlug: 'test-shop'
        });

        const mockShop = {
            id: 'shop-123',
            profile_id: 'profile-123',
            slug: 'test-shop',
            name: 'Test Shop'
        };

        // Mock shop query
        mockSupabase.from.mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
                data: mockShop,
                error: null
            })
        });

        // Mock duplicate check - returns existing order
        mockSupabase.from.mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
                data: { id: 'existing-order-123' },
                error: null
            })
        });

        const response = await POST(mockRequestEvent as RequestEvent);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.orderId).toBe('existing-order-123');
    });

    it('should create custom order successfully', async () => {
        (mockRequestEvent.request!.json as any).mockResolvedValue({
            shopId: 'shop-123',
            customerName: 'John Doe',
            customerEmail: 'customer@test.com',
            selectedDate: '2024-01-15',
            customerPhone: '0123456789',
            customerInstagram: '@johndoe',
            additionalInfo: 'Test info',
            estimatedPrice: 5000,
            shopSlug: 'test-shop'
        });

        const mockShop = {
            id: 'shop-123',
            profile_id: 'profile-123',
            slug: 'test-shop',
            name: 'Test Shop'
        };

        const mockOrder = {
            id: 'new-order-123',
            shop_id: 'shop-123',
            customer_name: 'John Doe',
            customer_email: 'customer@test.com',
            status: 'pending'
        };

        // Mock shop query
        let callCount = 0;
        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'shops') {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({
                        data: mockShop,
                        error: null
                    })
                };
            } else if (table === 'orders') {
                if (callCount === 0) {
                    // First call: duplicate check
                    callCount++;
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        is: vi.fn().mockReturnThis(),
                        gte: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: null,
                            error: { code: 'PGRST116' } // No rows
                        })
                    };
                } else {
                    // Second call: insert order
                    return {
                        insert: vi.fn().mockReturnThis(),
                        select: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: mockOrder,
                            error: null
                        })
                    };
                }
            } else if (table === 'forms') {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({
                        data: null,
                        error: { code: 'PGRST116' }
                    })
                };
            }
            return {};
        });

        const response = await POST(mockRequestEvent as RequestEvent);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.orderId).toBe('new-order-123');
        expect(data.redirectUrl).toBe('/test-shop/order/new-order-123');
    });

    it('should transform customization data from IDs to labels', async () => {
        (mockRequestEvent.request!.json as any).mockResolvedValue({
            shopId: 'shop-123',
            customerName: 'John Doe',
            customerEmail: 'customer@test.com',
            selectedDate: '2024-01-15',
            selectedOptions: {
                'field-id-1': 'Option 1',
                'field-id-2': 'Option 2'
            },
            shopSlug: 'test-shop'
        });

        const mockShop = {
            id: 'shop-123',
            profile_id: 'profile-123',
            slug: 'test-shop',
            name: 'Test Shop'
        };

        const mockCustomForm = { id: 'form-123' };
        const mockFields = [
            { id: 'field-id-1', label: 'Field Label 1', type: 'text' },
            { id: 'field-id-2', label: 'Field Label 2', type: 'text' }
        ];

        const mockOrder = {
            id: 'new-order-123',
            shop_id: 'shop-123',
            customer_name: 'John Doe',
            customer_email: 'customer@test.com',
            status: 'pending',
            customization_data: {
                'Field Label 1': 'Option 1',
                'Field Label 2': 'Option 2'
            }
        };

        let callCount = 0;
        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'shops') {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({
                        data: mockShop,
                        error: null
                    })
                };
            } else if (table === 'orders') {
                if (callCount === 0) {
                    callCount++;
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        is: vi.fn().mockReturnThis(),
                        gte: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: null,
                            error: { code: 'PGRST116' }
                        })
                    };
                } else {
                    return {
                        insert: vi.fn().mockImplementation((data) => {
                            // Verify customization_data uses labels, not IDs
                            expect(data.customization_data).toEqual({
                                'Field Label 1': 'Option 1',
                                'Field Label 2': 'Option 2'
                            });
                            return {
                                select: vi.fn().mockReturnThis(),
                                single: vi.fn().mockResolvedValue({
                                    data: mockOrder,
                                    error: null
                                })
                            };
                        })
                    };
                }
            } else if (table === 'forms') {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({
                        data: mockCustomForm,
                        error: null
                    })
                };
            } else if (table === 'form_fields') {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    order: vi.fn().mockResolvedValue({
                        data: mockFields,
                        error: null
                    })
                };
            }
            return {};
        });

        const response = await POST(mockRequestEvent as RequestEvent);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });
});




