import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadShopCatalog } from '$lib/utils/catalog/catalog-loader';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('loadShopCatalog', () => {
    let mockSupabase: any;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});

        // Mock Supabase client
        mockSupabase = {
            from: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn(),
            order: vi.fn().mockReturnThis()
        };
    });

    it('should load shop catalog successfully', async () => {
        const mockShop = {
            id: 'shop-123',
            name: 'Test Shop',
            bio: 'Test bio',
            slug: 'test-shop',
            logo_url: 'https://example.com/logo.png',
            instagram: '@testshop',
            tiktok: '@testshop',
            website: 'https://testshop.com',
            is_custom_accepted: true,
            is_active: true
        };

        const mockProducts = [
            {
                id: 'product-1',
                name: 'Product 1',
                description: 'Description 1',
                base_price: 10000,
                image_url: 'https://example.com/product1.jpg',
                min_days_notice: 2,
                category_id: 'cat-1',
                categories: { name: 'Category 1' },
                forms: []
            }
        ];

        const mockCategories = [
            { id: 'cat-1', name: 'Category 1' }
        ];

        const mockFaqs = [
            { id: 'faq-1', question: 'Q1?', answer: 'A1' }
        ];

        // Mock shop query
        mockSupabase.from.mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockShop, error: null })
        });

        // Create chainable mock helper for products (needs 2 eq calls)
        const createProductsMock = () => {
            const orderMock = vi.fn().mockResolvedValue({ data: mockProducts, error: null });
            const eq2Mock = vi.fn().mockReturnValue({ order: orderMock });
            const eq1Mock = vi.fn().mockReturnValue({ eq: eq2Mock });
            const selectMock = vi.fn().mockReturnValue({ eq: eq1Mock });
            return { select: selectMock };
        };

        // Create chainable mock helper for categories/faq (only 1 eq call)
        const createSingleEqMock = (finalResult: any) => {
            const orderMock = vi.fn().mockResolvedValue(finalResult);
            const eqMock = vi.fn().mockReturnValue({ order: orderMock });
            const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
            return { select: selectMock };
        };

        // Setup from() to return different mocks for different calls
        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'shops') {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({ data: mockShop, error: null })
                };
            } else if (table === 'products') {
                return createProductsMock();
            } else if (table === 'categories') {
                return createSingleEqMock({ data: mockCategories, error: null });
            } else if (table === 'faq') {
                return createSingleEqMock({ data: mockFaqs, error: null });
            }
            return mockSupabase;
        });

        const result = await loadShopCatalog(mockSupabase as any, 'shop-123');

        expect(result).toEqual({
            shop: {
                id: mockShop.id,
                name: mockShop.name,
                bio: mockShop.bio,
                slug: mockShop.slug,
                logo_url: mockShop.logo_url,
                instagram: mockShop.instagram,
                tiktok: mockShop.tiktok,
                website: mockShop.website,
                is_custom_accepted: mockShop.is_custom_accepted,
                is_active: mockShop.is_active
            },
            products: mockProducts,
            categories: mockCategories,
            faqs: mockFaqs,
            cached_at: expect.any(String)
        });
    });

    it('should throw error when shop is not found', async () => {
        mockSupabase.from.mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
        });

        await expect(loadShopCatalog(mockSupabase as any, 'non-existent-shop')).rejects.toThrow('Boutique non trouvée');
    });

    it('should throw error when products loading fails', async () => {
        const mockShop = {
            id: 'shop-123',
            name: 'Test Shop',
            bio: 'Test bio',
            slug: 'test-shop',
            logo_url: null,
            instagram: null,
            tiktok: null,
            website: null,
            is_custom_accepted: false,
            is_active: true
        };

        // Create chainable mock helper for products (2 eq calls)
        const createProductsMock = (finalResult: any) => {
            const orderMock = vi.fn().mockResolvedValue(finalResult);
            const eq2Mock = vi.fn().mockReturnValue({ order: orderMock });
            const eq1Mock = vi.fn().mockReturnValue({ eq: eq2Mock });
            const selectMock = vi.fn().mockReturnValue({ eq: eq1Mock });
            return { select: selectMock };
        };

        // Create chainable mock helper for categories/faq (1 eq call)
        const createSingleEqMock = (finalResult: any) => {
            const orderMock = vi.fn().mockResolvedValue(finalResult);
            const eqMock = vi.fn().mockReturnValue({ order: orderMock });
            const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
            return { select: selectMock };
        };

        // Mock shop query - success
        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'shops') {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({ data: mockShop, error: null })
                };
            } else if (table === 'products') {
                return createProductsMock({ data: null, error: { message: 'Products error' } });
            } else if (table === 'categories') {
                return createSingleEqMock({ data: [], error: null });
            } else if (table === 'faq') {
                return createSingleEqMock({ data: [], error: null });
            }
            return mockSupabase;
        });

        await expect(loadShopCatalog(mockSupabase as any, 'shop-123')).rejects.toThrow('Erreur lors du chargement des produits');
    });

    it('should throw error when categories loading fails', async () => {
        const mockShop = {
            id: 'shop-123',
            name: 'Test Shop',
            bio: 'Test bio',
            slug: 'test-shop',
            logo_url: null,
            instagram: null,
            tiktok: null,
            website: null,
            is_custom_accepted: false,
            is_active: true
        };

        // Create chainable mock helper for products (2 eq calls)
        const createProductsMock = (finalResult: any) => {
            const orderMock = vi.fn().mockResolvedValue(finalResult);
            const eq2Mock = vi.fn().mockReturnValue({ order: orderMock });
            const eq1Mock = vi.fn().mockReturnValue({ eq: eq2Mock });
            const selectMock = vi.fn().mockReturnValue({ eq: eq1Mock });
            return { select: selectMock };
        };

        // Create chainable mock helper for categories/faq (1 eq call)
        const createSingleEqMock = (finalResult: any) => {
            const orderMock = vi.fn().mockResolvedValue(finalResult);
            const eqMock = vi.fn().mockReturnValue({ order: orderMock });
            const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
            return { select: selectMock };
        };

        // Mock shop query - success
        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'shops') {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({ data: mockShop, error: null })
                };
            } else if (table === 'products') {
                return createProductsMock({ data: [], error: null });
            } else if (table === 'categories') {
                return createSingleEqMock({ data: null, error: { message: 'Categories error' } });
            } else if (table === 'faq') {
                return createSingleEqMock({ data: [], error: null });
            }
            return mockSupabase;
        });

        await expect(loadShopCatalog(mockSupabase as any, 'shop-123')).rejects.toThrow('Erreur lors du chargement des catégories');
    });

    it('should handle empty results gracefully', async () => {
        const mockShop = {
            id: 'shop-123',
            name: 'Test Shop',
            bio: null,
            slug: 'test-shop',
            logo_url: null,
            instagram: null,
            tiktok: null,
            website: null,
            is_custom_accepted: false,
            is_active: true
        };

        // Create chainable mock helper
        const createChainableMock = (finalResult: any) => {
            const orderMock = vi.fn().mockResolvedValue(finalResult);
            const eq2Mock = vi.fn().mockReturnValue({ order: orderMock });
            const eq1Mock = vi.fn().mockReturnValue({ eq: eq2Mock });
            const selectMock = vi.fn().mockReturnValue({ eq: eq1Mock });
            return { select: selectMock };
        };

        // For categories and faq that only have one eq()
        const createSingleEqMock = (finalResult: any) => {
            const orderMock = vi.fn().mockResolvedValue(finalResult);
            const eqMock = vi.fn().mockReturnValue({ order: orderMock });
            const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
            return { select: selectMock };
        };

        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'shops') {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({ data: mockShop, error: null })
                };
            } else if (table === 'products') {
                return createChainableMock({ data: [], error: null });
            } else if (table === 'categories') {
                return createSingleEqMock({ data: [], error: null });
            } else if (table === 'faq') {
                return createSingleEqMock({ data: [], error: null });
            }
            return mockSupabase;
        });

        const result = await loadShopCatalog(mockSupabase as any, 'shop-123');

        expect(result.products).toEqual([]);
        expect(result.categories).toEqual([]);
        expect(result.faqs).toEqual([]);
    });
});

