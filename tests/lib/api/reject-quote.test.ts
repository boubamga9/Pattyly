import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { POST } from '../../../src/routes/api/reject-quote/+server';
import { EmailService } from '$lib/services/email-service';
import { ErrorLogger } from '$lib/services/error-logging';

// Mock dependencies
vi.mock('$lib/services/email-service', () => ({
    EmailService: {
        sendQuoteRejected: vi.fn().mockResolvedValue({ success: true })
    }
}));

vi.mock('$lib/services/error-logging', () => ({
    ErrorLogger: {
        logCritical: vi.fn().mockResolvedValue(undefined)
    }
}));

describe('/api/reject-quote', () => {
    let mockRequestEvent: Partial<RequestEvent>;
    let mockSupabase: any;

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock Supabase chain
        const updateMock = vi.fn();
        const profileSelectMock = vi.fn();
        const orderSelectMock = vi.fn();

        mockSupabase = {
            from: vi.fn((table: string) => {
                if (table === 'orders') {
                    return {
                        select: orderSelectMock,
                        update: updateMock,
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn()
                    };
                }
                if (table === 'profiles') {
                    return {
                        select: profileSelectMock,
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn()
                    };
                }
                return {};
            })
        };

        // Setup default mocks
        orderSelectMock.mockReturnValue({
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
                data: {
                    id: 'order-123',
                    customer_email: 'customer@example.com',
                    customer_name: 'John Doe',
                    product_id: null,
                    status: 'quoted',
                    shops: { profile_id: 'profile-123' }
                },
                error: null
            })
        });

        profileSelectMock.mockReturnValue({
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
                data: { email: 'pastry@example.com' },
                error: null
            })
        });

        updateMock.mockReturnValue({
            eq: vi.fn().mockResolvedValue({
                error: null
            })
        });

        mockRequestEvent = {
            request: {
                json: vi.fn().mockResolvedValue({ orderId: 'order-123' })
            } as any,
            locals: {
                supabase: mockSupabase
            } as any
        };
    });

    it('should reject quote successfully', async () => {
        const response = await POST(mockRequestEvent as RequestEvent);
        const data = await response.json();

        expect(data.success).toBe(true);
        expect(mockSupabase.from).toHaveBeenCalledWith('orders');
    });

    it('should return 400 when orderId is missing', async () => {
        (mockRequestEvent.request as any).json = vi.fn().mockResolvedValue({});

        const response = await POST(mockRequestEvent as RequestEvent);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain('ID de commande manquant');
    });

    it('should return 404 when order is not found', async () => {
        mockSupabase.from = vi.fn((table: string) => {
            if (table === 'orders') {
                return {
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: null,
                            error: { message: 'Not found' }
                        })
                    })
                };
            }
            return {};
        });

        const response = await POST(mockRequestEvent as RequestEvent);
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toContain('non trouvée');
    });

    it('should return 400 when order is not a custom order with quoted status', async () => {
        mockSupabase.from = vi.fn((table: string) => {
            if (table === 'orders') {
                return {
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: {
                                id: 'order-123',
                                product_id: 'product-123', // Has product_id (not custom)
                                status: 'quoted'
                            },
                            error: null
                        })
                    })
                };
            }
            return {};
        });

        const response = await POST(mockRequestEvent as RequestEvent);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain('invalide');
    });

    it('should send rejection email to pastry when order is rejected', async () => {
        await POST(mockRequestEvent as RequestEvent);

        expect(EmailService.sendQuoteRejected).toHaveBeenCalledWith(
            expect.objectContaining({
                pastryEmail: 'pastry@example.com',
                customerEmail: 'customer@example.com',
                customerName: 'John Doe'
            })
        );
    });

    it('should update order status to refused', async () => {
        const updateMock = vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null })
        });

        mockSupabase.from = vi.fn((table: string) => {
            if (table === 'orders') {
                return {
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: {
                                id: 'order-123',
                                customer_email: 'customer@example.com',
                                customer_name: 'John Doe',
                                product_id: null,
                                status: 'quoted',
                                shops: { profile_id: 'profile-123' }
                            },
                            error: null
                        })
                    }),
                    update: updateMock,
                    eq: vi.fn().mockReturnThis()
                };
            }
            if (table === 'profiles') {
                return {
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: { email: 'pastry@example.com' },
                            error: null
                        })
                    })
                };
            }
            return {};
        });

        await POST(mockRequestEvent as RequestEvent);

        expect(updateMock).toHaveBeenCalledWith({
            status: 'refused',
            refused_by: 'client'
        });
    });

    it('should log critical error when database update fails', async () => {
        mockSupabase.from = vi.fn((table: string) => {
            if (table === 'orders') {
                return {
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: {
                                id: 'order-123',
                                customer_email: 'customer@example.com',
                                customer_name: 'John Doe',
                                product_id: null,
                                status: 'quoted',
                                shops: { profile_id: 'profile-123' }
                            },
                            error: null
                        })
                    }),
                    update: vi.fn().mockReturnValue({
                        eq: vi.fn().mockResolvedValue({
                            error: { message: 'Database error' }
                        })
                    })
                };
            }
            if (table === 'profiles') {
                return {
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: { email: 'pastry@example.com' },
                            error: null
                        })
                    })
                };
            }
            return {};
        });

        const response = await POST(mockRequestEvent as RequestEvent);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toContain('mise à jour');
        expect(ErrorLogger.logCritical).toHaveBeenCalled();
    });

    it('should handle email sending errors gracefully', async () => {
        (EmailService.sendQuoteRejected as any).mockRejectedValueOnce(new Error('Email error'));

        const response = await POST(mockRequestEvent as RequestEvent);
        const data = await response.json();

        // Should still return success even if email fails
        expect(data.success).toBe(true);
        expect(ErrorLogger.logCritical).toHaveBeenCalled();
    });
});


