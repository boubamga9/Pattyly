import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { actions } from '../../../../src/routes/(pastry)/dashboard/products/+page.server';

// Mock dependencies
vi.mock('sveltekit-superforms', () => ({
    superValidate: vi.fn()
}));

vi.mock('$lib/auth', () => ({
    verifyShopOwnership: vi.fn()
}));

vi.mock('$lib/storage', () => ({
    deleteImageIfUnused: vi.fn()
}));

vi.mock('$lib/utils/catalog', () => ({
    forceRevalidateShop: vi.fn()
}));

vi.mock('$lib/utils/product-limits', () => ({
    checkProductLimit: vi.fn()
}));

import { superValidate } from 'sveltekit-superforms';
import { verifyShopOwnership } from '$lib/auth';
import { deleteImageIfUnused } from '$lib/storage';
import { forceRevalidateShop } from '$lib/utils/catalog';
import { checkProductLimit } from '$lib/utils/product-limits';

describe('dashboard/products +page.server actions', () => {
    let mockEvent: Partial<RequestEvent>;
    let mockSupabase: any;
    let mockRequest: any;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});

        // Mock Supabase client
        const selectMock = vi.fn().mockReturnThis();
        const eqMock = vi.fn().mockReturnThis();
        const singleMock = vi.fn();
        const updateMock = vi.fn().mockReturnThis();
        const deleteMock = vi.fn().mockReturnThis();
        const insertMock = vi.fn().mockReturnThis();

        mockSupabase = {
            from: vi.fn((table: string) => ({
                select: selectMock,
                eq: eqMock,
                single: singleMock,
                update: updateMock,
                delete: deleteMock,
                insert: insertMock
            })),
            rpc: vi.fn()
        };

        // Mock request with formData
        mockRequest = {
            formData: vi.fn().mockResolvedValue(new FormData())
        };

        mockEvent = {
            request: mockRequest,
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
        (deleteImageIfUnused as any).mockResolvedValue(undefined);
        (forceRevalidateShop as any).mockResolvedValue(true);
        (checkProductLimit as any).mockResolvedValue({
            isLimitReached: false,
            productCount: 5,
            productLimit: 10,
            plan: 'basic'
        });
    });

    const createFormData = (data: Record<string, string>) => {
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
            formData.append(key, value);
        });
        return formData;
    };

    describe('deleteProduct', () => {
        it('should delete product successfully', async () => {
            const formData = createFormData({
                shopId: 'shop-123',
                shopSlug: 'test-shop',
                productId: 'product-123'
            });
            mockRequest.formData.mockResolvedValue(formData);

            // Mock product fetch
            const productSelectMock = vi.fn().mockReturnThis();
            const productEqMock = vi.fn().mockReturnThis();
            const productSingleMock = vi.fn().mockResolvedValue({
                data: {
                    id: 'product-123',
                    shop_id: 'shop-123',
                    form_id: null,
                    image_url: 'https://cloudinary.com/image1.jpg'
                },
                error: null
            });

            // Mock delete
            const deleteEqMock = vi.fn().mockReturnThis();
            const deleteFinalMock = vi.fn().mockResolvedValue({ error: null });
            const deleteMock = vi.fn().mockReturnValue({ eq: deleteEqMock });

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === 'products') {
                    return {
                        select: productSelectMock,
                        eq: productEqMock,
                        single: productSingleMock,
                        delete: deleteMock
                    };
                }
                return {};
            });

            productSelectMock.mockReturnValue({ eq: productEqMock });
            productEqMock.mockReturnValue({ single: productSingleMock });
            deleteEqMock.mockReturnValue({ eq: deleteFinalMock });

            const result = await actions.deleteProduct(mockEvent as RequestEvent);

            expect(verifyShopOwnership).toHaveBeenCalledWith('user-123', 'shop-123', mockSupabase);
            expect(deleteImageIfUnused).toHaveBeenCalledWith(mockSupabase, 'https://cloudinary.com/image1.jpg');
            expect(forceRevalidateShop).toHaveBeenCalledWith('test-shop');
            expect(result).toEqual({ message: 'Produit et formulaire supprimés avec succès' });
        });

        it('should return 400 when shopId is missing', async () => {
            const formData = createFormData({
                productId: 'product-123'
            });
            mockRequest.formData.mockResolvedValue(formData);

            const result = await actions.deleteProduct(mockEvent as RequestEvent);

            expect(result).toEqual({
                status: 400,
                data: { error: 'Données de boutique manquantes' }
            });
        });

        it('should return 401 when user is not authenticated', async () => {
            const formData = createFormData({
                shopId: 'shop-123',
                shopSlug: 'test-shop',
                productId: 'product-123'
            });
            mockRequest.formData.mockResolvedValue(formData);

            (mockEvent.locals as any).safeGetSession.mockResolvedValue({ session: null });

            const result = await actions.deleteProduct(mockEvent as RequestEvent);

            expect(result).toEqual({
                status: 401,
                data: { error: 'Non autorisé' }
            });
        });

        it('should return 403 when user is not shop owner', async () => {
            const formData = createFormData({
                shopId: 'shop-123',
                shopSlug: 'test-shop',
                productId: 'product-123'
            });
            mockRequest.formData.mockResolvedValue(formData);

            (verifyShopOwnership as any).mockResolvedValue(false);

            const result = await actions.deleteProduct(mockEvent as RequestEvent);

            expect(result).toEqual({
                status: 403,
                data: { error: 'Accès non autorisé à cette boutique' }
            });
        });

        it('should return 404 when product is not found', async () => {
            const formData = createFormData({
                shopId: 'shop-123',
                shopSlug: 'test-shop',
                productId: 'product-123'
            });
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
            eqMock.mockReturnValue({ single: singleMock });

            const result = await actions.deleteProduct(mockEvent as RequestEvent);

            expect(result).toEqual({
                status: 404,
                data: { error: 'Produit non trouvé' }
            });
        });
    });

    describe('duplicateProduct', () => {
        it('should duplicate product successfully', async () => {
            const formData = createFormData({
                shopId: 'shop-123',
                shopSlug: 'test-shop',
                productId: 'product-123'
            });
            mockRequest.formData.mockResolvedValue(formData);

            // Mock original product fetch
            const productSelectMock = vi.fn().mockReturnThis();
            const productEqMock = vi.fn().mockReturnThis();
            const productSingleMock = vi.fn().mockResolvedValue({
                data: {
                    id: 'product-123',
                    name: 'Original Product',
                    description: 'Description',
                    base_price: 50.00,
                    category_id: 'cat-123',
                    shop_id: 'shop-123',
                    image_url: 'image1.jpg',
                    min_days_notice: 3,
                    cake_type: 'birthday',
                    deposit_percentage: 50,
                    form_id: null
                },
                error: null
            });

            // Mock insert (product creation)
            const insertSelectMock = vi.fn().mockReturnThis();
            const insertSingleMock = vi.fn().mockResolvedValue({
                data: { id: 'product-456', name: 'Original Product (Copie)' },
                error: null
            });
            const insertMock = vi.fn().mockReturnValue({
                select: insertSelectMock,
                single: insertSingleMock
            });

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === 'products') {
                    return {
                        select: productSelectMock,
                        eq: productEqMock,
                        single: productSingleMock,
                        insert: insertMock,
                        update: vi.fn().mockReturnThis()
                    };
                }
                return {};
            });

            productSelectMock.mockReturnValue({ eq: productEqMock });
            productEqMock.mockReturnValue({ single: productSingleMock });
            insertSelectMock.mockReturnValue({ single: insertSingleMock });

            (forceRevalidateShop as any).mockResolvedValue(true);

            const result = await actions.duplicateProduct(mockEvent as RequestEvent);

            expect(verifyShopOwnership).toHaveBeenCalled();
            expect(checkProductLimit).toHaveBeenCalled();
            expect(insertMock).toHaveBeenCalled();
            expect(forceRevalidateShop).toHaveBeenCalledWith('test-shop');
            expect(result).toEqual({ message: 'Produit et formulaire dupliqués avec succès' });
        });

        it('should return 403 when product limit is reached', async () => {
            const formData = createFormData({
                shopId: 'shop-123',
                shopSlug: 'test-shop',
                productId: 'product-123'
            });
            mockRequest.formData.mockResolvedValue(formData);

            (checkProductLimit as any).mockResolvedValue({
                isLimitReached: true,
                productCount: 10,
                productLimit: 10,
                plan: 'basic'
            });

            const result = await actions.duplicateProduct(mockEvent as RequestEvent);

            expect(result).toEqual({
                status: 403,
                data: expect.objectContaining({
                    error: expect.stringContaining('Limite de gâteaux atteinte')
                })
            });
        });
    });

    describe('createCategory', () => {
        it('should create category successfully', async () => {
            const formData = createFormData({
                shopId: 'shop-123',
                shopSlug: 'test-shop',
                name: 'New Category'
            });
            mockRequest.formData.mockResolvedValue(formData);

            (superValidate as any).mockResolvedValue({
                valid: true,
                data: { name: 'New Category' }
            });

            // Mock check for existing category (returns null - doesn't exist)
            const checkSelectMock = vi.fn().mockReturnThis();
            const checkEqMock = vi.fn().mockReturnThis();
            const checkSingleMock = vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' } // Not found error code
            });

            // Mock insert
            const insertSelectMock = vi.fn().mockReturnThis();
            const insertSingleMock = vi.fn().mockResolvedValue({
                data: { id: 'cat-456', name: 'New Category' },
                error: null
            });
            const insertMock = vi.fn().mockReturnValue({
                select: insertSelectMock,
                single: insertSingleMock
            });

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === 'categories') {
                    return {
                        select: checkSelectMock,
                        eq: checkEqMock,
                        single: checkSingleMock,
                        insert: insertMock
                    };
                }
                return {};
            });

            checkSelectMock.mockReturnValue({ eq: checkEqMock });
            checkEqMock.mockReturnValue({ single: checkSingleMock });
            insertSelectMock.mockReturnValue({ single: insertSingleMock });

            (forceRevalidateShop as any).mockResolvedValue(true);

            const result = await actions.createCategory(mockEvent as RequestEvent);

            expect(verifyShopOwnership).toHaveBeenCalled();
            expect(forceRevalidateShop).toHaveBeenCalledWith('test-shop');
            expect(result).toHaveProperty('form');
        });

        it('should return 400 when form is invalid', async () => {
            const formData = createFormData({
                shopId: 'shop-123',
                shopSlug: 'test-shop'
            });
            mockRequest.formData.mockResolvedValue(formData);

            (superValidate as any).mockResolvedValue({
                valid: false,
                data: {}
            });

            const result = await actions.createCategory(mockEvent as RequestEvent);

            expect(result).toEqual({
                status: 400,
                data: { form: expect.objectContaining({ valid: false }) }
            });
        });
    });

    describe('updateCategory', () => {
        it('should update category successfully', async () => {
            const formData = createFormData({
                shopId: 'shop-123',
                shopSlug: 'test-shop',
                categoryId: 'cat-123',
                name: 'Updated Category'
            });
            mockRequest.formData.mockResolvedValue(formData);

            (superValidate as any).mockResolvedValue({
                valid: true,
                data: { name: 'Updated Category' }
            });

            // Mock category check
            const checkSelectMock = vi.fn().mockReturnThis();
            const checkEqMock = vi.fn().mockReturnThis();
            const checkSingleMock = vi.fn().mockResolvedValue({
                data: { id: 'cat-123', name: 'Old Category' },
                error: null
            });

            // Mock duplicate check
            const dupSelectMock = vi.fn().mockReturnThis();
            const dupEqMock = vi.fn().mockReturnThis();
            const dupSingleMock = vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' } // Not found - no duplicate
            });

            // Mock update
            const updateEqMock = vi.fn().mockReturnThis();
            const updateFinalMock = vi.fn().mockResolvedValue({ error: null });
            const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock });

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === 'categories') {
                    // First call is for check, second for duplicate check, third for update
                    let callCount = 0;
                    return {
                        select: () => {
                            callCount++;
                            if (callCount === 1) {
                                return { eq: checkEqMock };
                            }
                            return { eq: dupEqMock };
                        },
                        eq: checkEqMock,
                        single: checkSingleMock,
                        update: updateMock,
                        neq: vi.fn().mockReturnThis()
                    };
                }
                return {};
            });

            checkEqMock.mockReturnValue({ single: checkSingleMock });
            dupEqMock.mockReturnValue({ eq: dupEqMock, single: dupSingleMock });
            dupSingleMock.mockReturnValue({ neq: vi.fn().mockReturnThis() });
            updateEqMock.mockReturnValue({ eq: updateFinalMock });

            (forceRevalidateShop as any).mockResolvedValue(true);

            const result = await actions.updateCategory(mockEvent as RequestEvent);

            expect(verifyShopOwnership).toHaveBeenCalled();
            expect(forceRevalidateShop).toHaveBeenCalledWith('test-shop');
            expect(result).toHaveProperty('form');
        });
    });

    describe('deleteCategory', () => {
        it('should delete category successfully', async () => {
            const formData = createFormData({
                shopId: 'shop-123',
                shopSlug: 'test-shop',
                categoryId: 'cat-123'
            });
            mockRequest.formData.mockResolvedValue(formData);

            (superValidate as any).mockResolvedValue({
                valid: true,
                data: {}
            });

            // Mock category check
            const checkSelectMock = vi.fn().mockReturnThis();
            const checkEqMock = vi.fn().mockReturnThis();
            const checkSingleMock = vi.fn().mockResolvedValue({
                data: { id: 'cat-123', name: 'Category' },
                error: null
            });

            // Mock products check (no products)
            const productsSelectMock = vi.fn().mockReturnThis();
            const productsEqMock = vi.fn().mockReturnThis();
            const productsMock = vi.fn().mockResolvedValue({
                data: [],
                error: null
            });

            // Mock delete
            const deleteEqMock = vi.fn().mockReturnThis();
            const deleteFinalMock = vi.fn().mockResolvedValue({ error: null });
            const deleteMock = vi.fn().mockReturnValue({ eq: deleteEqMock });

            let callCount = 0;
            mockSupabase.from.mockImplementation((table: string) => {
                if (table === 'categories') {
                    callCount++;
                    if (callCount === 1) {
                        return {
                            select: checkSelectMock,
                            eq: checkEqMock,
                            single: checkSingleMock
                        };
                    }
                    return {
                        delete: deleteMock,
                        eq: deleteEqMock
                    };
                }
                if (table === 'products') {
                    return {
                        select: productsSelectMock,
                        eq: productsEqMock
                    };
                }
                return {};
            });

            checkSelectMock.mockReturnValue({ eq: checkEqMock });
            checkEqMock.mockReturnValue({ single: checkSingleMock });
            productsSelectMock.mockReturnValue({ eq: productsEqMock });
            productsEqMock.mockReturnValue({ eq: productsMock });
            deleteEqMock.mockReturnValue({ eq: deleteFinalMock });

            (forceRevalidateShop as any).mockResolvedValue(true);

            const result = await actions.deleteCategory(mockEvent as RequestEvent);

            expect(verifyShopOwnership).toHaveBeenCalled();
            expect(forceRevalidateShop).toHaveBeenCalledWith('test-shop');
            expect(result).toHaveProperty('form');
        });
    });
});

