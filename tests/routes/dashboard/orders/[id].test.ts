import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { actions } from '../../../../src/routes/(pastry)/dashboard/orders/[id]/+page.server';

// Mock dependencies
vi.mock('sveltekit-superforms', () => ({
    superValidate: vi.fn()
}));

vi.mock('$lib/auth', () => ({
    verifyShopOwnership: vi.fn()
}));

vi.mock('$lib/services/email-service', () => ({
    EmailService: {
        sendQuote: vi.fn(),
        sendRequestRejected: vi.fn(),
        sendOrderConfirmation: vi.fn(),
        sendOrderCancelled: vi.fn()
    }
}));

vi.mock('$lib/services/error-logging', () => ({
    ErrorLogger: {
        logCritical: vi.fn()
    }
}));

vi.mock('$env/static/public', () => ({
    PUBLIC_SITE_URL: 'https://example.com'
}));

import { superValidate } from 'sveltekit-superforms';
import { verifyShopOwnership } from '$lib/auth';
import { EmailService } from '$lib/services/email-service';
import { ErrorLogger } from '$lib/services/error-logging';

describe('dashboard/orders/[id] +page.server actions', () => {
    let mockEvent: Partial<RequestEvent>;
    let mockSupabase: any;
    let mockRequest: any;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});

        // Mock Supabase client
        const selectMock = vi.fn().mockReturnThis();
        const eqMock = vi.fn().mockReturnThis();
        const singleMock = vi.fn();
        const updateMock = vi.fn().mockReturnThis();
        const upsertMock = vi.fn();
        const deleteMock = vi.fn().mockReturnThis();
        const rpcMock = vi.fn();

        mockSupabase = {
            from: vi.fn((table: string) => ({
                select: selectMock,
                eq: eqMock,
                single: singleMock,
                update: updateMock,
                upsert: upsertMock,
                delete: deleteMock
            })),
            rpc: rpcMock
        };

        // Mock request with formData
        mockRequest = {
            formData: vi.fn().mockResolvedValue(new FormData())
        };

        mockEvent = {
            request: mockRequest,
            params: { id: 'order-123' },
            locals: {
                supabase: mockSupabase,
                safeGetSession: vi.fn().mockResolvedValue({
                    session: { user: { id: 'user-123' } }
                })
            } as any
        };

        // Default mocks
        (verifyShopOwnership as any).mockResolvedValue(true);
        (superValidate as any).mockResolvedValue({
            valid: true,
            data: {},
            message: ''
        });
    });

    const createFormData = (data: Record<string, string>) => {
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
            formData.append(key, value);
        });
        return formData;
    };

    describe('savePersonalNote', () => {
        it('should save personal note successfully', async () => {
            const formData = createFormData({
                shopId: 'shop-123',
                note: 'My personal note'
            });
            mockRequest.formData.mockResolvedValue(formData);

            (superValidate as any).mockResolvedValue({
                valid: true,
                data: { note: 'My personal note' },
                message: ''
            });

            const upsertMock = vi.fn().mockResolvedValue({ error: null });
            mockSupabase.from.mockReturnValue({
                upsert: upsertMock
            });

            const result = await actions.savePersonalNote(mockEvent as RequestEvent);

            expect(verifyShopOwnership).toHaveBeenCalledWith('user-123', 'shop-123', mockSupabase);
            expect(upsertMock).toHaveBeenCalledWith(
                {
                    order_id: 'order-123',
                    shop_id: 'shop-123',
                    note: 'My personal note'
                },
                { onConflict: 'order_id,shop_id' }
            );
            expect(result).toHaveProperty('form');
            expect(result.form.message).toBe('Note sauvegardée avec succès');
        });

        it('should return 400 when shopId is missing', async () => {
            const formData = createFormData({ note: 'My note' });
            mockRequest.formData.mockResolvedValue(formData);

            const result = await actions.savePersonalNote(mockEvent as RequestEvent);

            expect(result).toEqual({
                status: 400,
                data: expect.objectContaining({
                    form: expect.anything(),
                    error: 'Données de boutique manquantes'
                })
            });
        });

        it('should return 401 when user is not authenticated', async () => {
            const formData = createFormData({ shopId: 'shop-123', note: 'My note' });
            mockRequest.formData.mockResolvedValue(formData);

            (mockEvent.locals as any).safeGetSession.mockResolvedValue({ session: null });

            const result = await actions.savePersonalNote(mockEvent as RequestEvent);

            expect(result).toEqual({
                status: 401,
                data: expect.objectContaining({
                    form: expect.anything(),
                    error: 'Non autorisé'
                })
            });
        });

        it('should return 403 when user is not shop owner', async () => {
            const formData = createFormData({ shopId: 'shop-123', note: 'My note' });
            mockRequest.formData.mockResolvedValue(formData);

            (verifyShopOwnership as any).mockResolvedValue(false);

            const result = await actions.savePersonalNote(mockEvent as RequestEvent);

            expect(result).toEqual({
                status: 403,
                data: expect.objectContaining({
                    form: expect.anything(),
                    error: 'Accès non autorisé à cette boutique'
                })
            });
        });

        it('should return 400 when note is empty', async () => {
            const formData = createFormData({ shopId: 'shop-123', note: '   ' });
            mockRequest.formData.mockResolvedValue(formData);

            (superValidate as any).mockResolvedValue({
                valid: true,
                data: { note: '   ' }
            });

            const result = await actions.savePersonalNote(mockEvent as RequestEvent);

            expect(result).toEqual({
                status: 400,
                data: expect.objectContaining({
                    form: expect.anything(),
                    error: 'La note ne peut pas être vide'
                })
            });
        });
    });

    describe('makeQuote', () => {
        it('should create quote successfully', async () => {
            const formData = createFormData({
                shopId: 'shop-123',
                shopSlug: 'test-shop',
                price: '50.00',
                chef_message: 'Your quote message',
                chef_pickup_date: '2024-01-15',
                chef_pickup_time: '14:00'
            });
            mockRequest.formData.mockResolvedValue(formData);

            (superValidate as any).mockResolvedValue({
                valid: true,
                data: {
                    price: 50.00,
                    chef_message: 'Your quote message',
                    chef_pickup_date: '2024-01-15',
                    chef_pickup_time: '14:00'
                }
            });

            // Mock shop fetch
            const selectMock = vi.fn().mockReturnThis();
            const eqMock = vi.fn().mockReturnThis();
            const singleMock = vi.fn().mockResolvedValue({
                data: { id: 'shop-123', name: 'Test Shop', logo_url: 'logo.png' },
                error: null
            });

            // Mock order_ref generation
            mockSupabase.rpc.mockResolvedValue({
                data: 'ORDER-REF-123',
                error: null
            });

            // Mock order update
            const updateMock = vi.fn().mockReturnThis();
            const updateEqMock = vi.fn().mockReturnThis();
            const updateSingleMock = vi.fn().mockResolvedValue({
                data: {
                    id: 'order-123',
                    customer_email: 'customer@test.com',
                    customer_name: 'Customer Name',
                    total_amount: 50.00
                },
                error: null
            });

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === 'shops') {
                    return { select: selectMock, eq: eqMock, single: singleMock };
                }
                if (table === 'orders') {
                    return {
                        update: updateMock,
                        eq: updateEqMock,
                        select: vi.fn().mockReturnThis(),
                        single: updateSingleMock
                    };
                }
                return {};
            });

            selectMock.mockReturnValue({ eq: eqMock });
            eqMock.mockReturnValue({ single: singleMock });
            updateMock.mockReturnValue({ eq: updateEqMock });
            updateEqMock.mockReturnValue({ eq: updateEqMock, select: vi.fn().mockReturnThis(), single: updateSingleMock });

            (EmailService.sendQuote as any).mockResolvedValue(undefined);

            const result = await actions.makeQuote(mockEvent as RequestEvent);

            expect(verifyShopOwnership).toHaveBeenCalled();
            expect(mockSupabase.rpc).toHaveBeenCalledWith('generate_order_ref');
            expect(EmailService.sendQuote).toHaveBeenCalled();
            expect(result).toHaveProperty('form');
            expect(result.form.message).toBe('Devis envoyé avec succès');
        });

        it('should return 400 when price is missing', async () => {
            const formData = createFormData({
                shopId: 'shop-123',
                shopSlug: 'test-shop'
            });
            mockRequest.formData.mockResolvedValue(formData);

            (superValidate as any).mockResolvedValue({
                valid: true,
                data: {}
            });

            const result = await actions.makeQuote(mockEvent as RequestEvent);

            expect(result).toEqual({
                status: 400,
                data: expect.objectContaining({
                    form: expect.anything(),
                    error: 'Le prix est requis'
                })
            });
        });

        it('should return 404 when shop is not found', async () => {
            const formData = createFormData({
                shopId: 'shop-123',
                shopSlug: 'test-shop',
                price: '50.00'
            });
            mockRequest.formData.mockResolvedValue(formData);

            (superValidate as any).mockResolvedValue({
                valid: true,
                data: { price: 50.00 }
            });

            const selectMock = vi.fn().mockReturnThis();
            const eqMock = vi.fn().mockReturnThis();
            const singleMock = vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Not found' }
            });

            mockSupabase.from.mockReturnValue({
                select: selectMock,
                eq: eqMock,
                single: singleMock
            });
            selectMock.mockReturnValue({ eq: eqMock });
            eqMock.mockReturnValue({ single: singleMock });

            const result = await actions.makeQuote(mockEvent as RequestEvent);

            expect(result).toEqual({
                status: 404,
                data: expect.objectContaining({
                    form: expect.anything(),
                    error: 'Boutique non trouvée'
                })
            });
        });
    });

    describe('rejectOrder', () => {
        it('should reject order successfully', async () => {
            const formData = createFormData({
                shopId: 'shop-123',
                shopSlug: 'test-shop',
                chef_message: 'Sorry, cannot fulfill this order'
            });
            mockRequest.formData.mockResolvedValue(formData);

            (superValidate as any).mockResolvedValue({
                valid: true,
                data: { chef_message: 'Sorry, cannot fulfill this order' }
            });

            // Mock shop fetch
            const selectMock = vi.fn().mockReturnThis();
            const eqMock = vi.fn().mockReturnThis();
            const singleMock = vi.fn().mockResolvedValue({
                data: { id: 'shop-123', name: 'Test Shop', logo_url: 'logo.png' },
                error: null
            });

            // Mock order update
            const updateMock = vi.fn().mockReturnThis();
            const updateEqMock = vi.fn().mockReturnThis();
            const updateSingleMock = vi.fn().mockResolvedValue({
                data: {
                    id: 'order-123',
                    customer_email: 'customer@test.com',
                    customer_name: 'Customer Name'
                },
                error: null
            });

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === 'shops') {
                    return { select: selectMock, eq: eqMock, single: singleMock };
                }
                if (table === 'orders') {
                    return {
                        update: updateMock,
                        eq: updateEqMock,
                        select: vi.fn().mockReturnThis(),
                        single: updateSingleMock
                    };
                }
                return {};
            });

            selectMock.mockReturnValue({ eq: eqMock });
            eqMock.mockReturnValue({ single: singleMock });
            updateMock.mockReturnValue({ eq: updateEqMock });
            updateEqMock.mockReturnValue({ eq: updateEqMock, select: vi.fn().mockReturnThis(), single: updateSingleMock });

            (EmailService.sendRequestRejected as any).mockResolvedValue(undefined);

            const result = await actions.rejectOrder(mockEvent as RequestEvent);

            expect(verifyShopOwnership).toHaveBeenCalled();
            expect(EmailService.sendRequestRejected).toHaveBeenCalled();
            expect(result).toHaveProperty('form');
            expect(result.form.message).toBe('Commande refusée avec succès');
        });
    });

    describe('confirmPayment', () => {
        it('should confirm payment successfully', async () => {
            const formData = createFormData({ shopId: 'shop-123' });
            mockRequest.formData.mockResolvedValue(formData);

            // Mock order fetch with shop data
            const selectMock = vi.fn().mockReturnThis();
            const eqMock = vi.fn().mockReturnThis();
            const singleMock = vi.fn().mockResolvedValue({
                data: {
                    id: 'order-123',
                    customer_email: 'customer@test.com',
                    customer_name: 'Customer Name',
                    product_name: 'Test Product',
                    pickup_date: '2024-01-15',
                    pickup_time: '14:00',
                    total_amount: 100.00,
                    paid_amount: 50.00,
                    status: 'to_verify',
                    shops: {
                        name: 'Test Shop',
                        logo_url: 'logo.png',
                        slug: 'test-shop'
                    }
                },
                error: null
            });

            // Mock order update - chain: update().eq().eq().eq() resolves to { error: null }
            const updateFinalEq = vi.fn().mockResolvedValue({ error: null });
            const updateThirdEq = vi.fn().mockReturnValue({ eq: updateFinalEq });
            const updateSecondEq = vi.fn().mockReturnValue({ eq: updateThirdEq });
            const updateFirstEq = vi.fn().mockReturnValue({ eq: updateSecondEq });
            const updateMock = vi.fn().mockReturnValue({ eq: updateFirstEq });

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === 'orders') {
                    return {
                        select: selectMock,
                        eq: eqMock,
                        update: updateMock,
                        single: singleMock
                    };
                }
                return {};
            });

            selectMock.mockReturnValue({ eq: eqMock });
            eqMock.mockReturnValue({ eq: eqMock, single: singleMock });

            (EmailService.sendOrderConfirmation as any).mockResolvedValue(undefined);

            const result = await actions.confirmPayment(mockEvent as RequestEvent);

            expect(verifyShopOwnership).toHaveBeenCalled();
            expect(EmailService.sendOrderConfirmation).toHaveBeenCalled();
            expect(result).toEqual({
                message: 'Paiement confirmé avec succès'
            });
        });

        it('should return 404 when order is not found or not in to_verify status', async () => {
            const formData = createFormData({ shopId: 'shop-123' });
            mockRequest.formData.mockResolvedValue(formData);

            const selectMock = vi.fn().mockReturnThis();
            const eqMock = vi.fn().mockReturnThis();
            const singleMock = vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Not found' }
            });

            mockSupabase.from.mockReturnValue({
                select: selectMock,
                eq: eqMock,
                single: singleMock
            });

            selectMock.mockReturnValue({ eq: eqMock });
            eqMock.mockReturnValue({ eq: eqMock, single: singleMock });

            const result = await actions.confirmPayment(mockEvent as RequestEvent);

            expect(result).toEqual({
                status: 404,
                data: { error: 'Commande non trouvée ou déjà confirmée' }
            });
            expect(ErrorLogger.logCritical).toHaveBeenCalled();
        });
    });

    describe('makeOrderReady', () => {
        it('should mark order as ready successfully', async () => {
            const formData = createFormData({ shopId: 'shop-123' });
            mockRequest.formData.mockResolvedValue(formData);

            const eqMockFinal = vi.fn().mockResolvedValue({ error: null });
            const eqMock = vi.fn().mockReturnValue({ eq: eqMockFinal });
            const updateMock = vi.fn().mockReturnValue({ eq: eqMock });

            mockSupabase.from.mockReturnValue({
                update: updateMock,
                eq: eqMock
            });

            const result = await actions.makeOrderReady(mockEvent as RequestEvent);

            expect(verifyShopOwnership).toHaveBeenCalled();
            expect(result).toEqual({
                message: 'Commande marquée comme prête'
            });
        });

        it('should return 500 when update fails', async () => {
            const formData = createFormData({ shopId: 'shop-123' });
            mockRequest.formData.mockResolvedValue(formData);

            const eqMockFinal = vi.fn().mockResolvedValue({ error: { message: 'Update failed' } });
            const eqMock = vi.fn().mockReturnValue({ eq: eqMockFinal });
            const updateMock = vi.fn().mockReturnValue({ eq: eqMock });

            mockSupabase.from.mockReturnValue({
                update: updateMock,
                eq: eqMock
            });

            const result = await actions.makeOrderReady(mockEvent as RequestEvent);

            expect(result).toEqual({
                status: 500,
                data: { error: 'Erreur lors de la mise à jour de la commande' }
            });
            expect(ErrorLogger.logCritical).toHaveBeenCalled();
        });
    });

    describe('makeOrderCompleted', () => {
        it('should mark order as completed successfully', async () => {
            const formData = createFormData({ shopId: 'shop-123' });
            mockRequest.formData.mockResolvedValue(formData);

            const eqMockFinal = vi.fn().mockResolvedValue({ error: null });
            const eqMock = vi.fn().mockReturnValue({ eq: eqMockFinal });
            const updateMock = vi.fn().mockReturnValue({ eq: eqMock });

            mockSupabase.from.mockReturnValue({
                update: updateMock,
                eq: eqMock
            });

            const result = await actions.makeOrderCompleted(mockEvent as RequestEvent);

            expect(verifyShopOwnership).toHaveBeenCalled();
            expect(result).toEqual({
                message: 'Commande marquée comme terminée'
            });
        });
    });
});

