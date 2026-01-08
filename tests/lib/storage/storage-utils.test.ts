import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteImageIfUnused, deleteShopLogo, deleteAllShopImages } from '$lib/storage/storage-utils';
import { extractPublicIdFromUrl, deleteImage } from '$lib/cloudinary';

// Mock cloudinary functions
vi.mock('$lib/cloudinary', () => ({
    extractPublicIdFromUrl: vi.fn(),
    deleteImage: vi.fn().mockResolvedValue(undefined)
}));

describe('storage-utils', () => {
    let mockSupabase: any;

    beforeEach(() => {
        vi.clearAllMocks();
        
        mockSupabase = {
            from: vi.fn()
        };
    });

    describe('deleteImageIfUnused', () => {
        it('should do nothing if imageUrl is empty', async () => {
            await deleteImageIfUnused(mockSupabase, '');

            expect(mockSupabase.from).not.toHaveBeenCalled();
            expect(deleteImage).not.toHaveBeenCalled();
        });

        it('should do nothing if imageUrl is not a Cloudinary URL', async () => {
            await deleteImageIfUnused(mockSupabase, 'https://example.com/image.jpg');

            expect(mockSupabase.from).not.toHaveBeenCalled();
            expect(deleteImage).not.toHaveBeenCalled();
        });

        it('should delete image if no other products use it', async () => {
            const cloudinaryUrl = 'https://res.cloudinary.com/test/image/upload/test.jpg';
            (extractPublicIdFromUrl as any).mockReturnValue('test');

            const selectMock = vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    data: [],
                    error: null
                })
            });

            mockSupabase.from = vi.fn((table: string) => {
                if (table === 'products') {
                    return {
                        select: selectMock
                    };
                }
                return {};
            });

            await deleteImageIfUnused(mockSupabase, cloudinaryUrl);

            expect(selectMock).toHaveBeenCalledWith('id');
            expect(extractPublicIdFromUrl).toHaveBeenCalledWith(cloudinaryUrl);
            expect(deleteImage).toHaveBeenCalledWith('test');
        });

        it('should not delete image if other products use it', async () => {
            const cloudinaryUrl = 'https://res.cloudinary.com/test/image/upload/test.jpg';
            const selectMock = vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    data: [{ id: 'product-123' }],
                    error: null
                })
            });

            mockSupabase.from = vi.fn((table: string) => {
                if (table === 'products') {
                    return {
                        select: selectMock
                    };
                }
                return {};
            });

            await deleteImageIfUnused(mockSupabase, cloudinaryUrl);

            expect(deleteImage).not.toHaveBeenCalled();
        });

        it('should exclude specified product when checking usage', async () => {
            const cloudinaryUrl = 'https://res.cloudinary.com/test/image/upload/test.jpg';
            (extractPublicIdFromUrl as any).mockReturnValue('test');

            const selectMock = vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    data: [{ id: 'product-123' }],
                    error: null
                })
            });

            mockSupabase.from = vi.fn((table: string) => {
                if (table === 'products') {
                    return {
                        select: selectMock
                    };
                }
                return {};
            });

            await deleteImageIfUnused(mockSupabase, cloudinaryUrl, 'product-123');

            expect(deleteImage).toHaveBeenCalledWith('test');
        });

        it('should handle database errors gracefully', async () => {
            const cloudinaryUrl = 'https://res.cloudinary.com/test/image/upload/test.jpg';
            const selectMock = vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    data: null,
                    error: { message: 'Database error' }
                })
            });

            mockSupabase.from = vi.fn((table: string) => {
                if (table === 'products') {
                    return {
                        select: selectMock
                    };
                }
                return {};
            });

            await deleteImageIfUnused(mockSupabase, cloudinaryUrl);

            expect(deleteImage).not.toHaveBeenCalled();
        });

        it('should handle extractPublicIdFromUrl returning null', async () => {
            const cloudinaryUrl = 'https://res.cloudinary.com/test/image/upload/test.jpg';
            (extractPublicIdFromUrl as any).mockReturnValue(null);

            const selectMock = vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    data: [],
                    error: null
                })
            });

            mockSupabase.from = vi.fn((table: string) => {
                if (table === 'products') {
                    return {
                        select: selectMock
                    };
                }
                return {};
            });

            await deleteImageIfUnused(mockSupabase, cloudinaryUrl);

            expect(deleteImage).not.toHaveBeenCalled();
        });
    });

    describe('deleteShopLogo', () => {
        it('should do nothing if logoUrl is empty', async () => {
            await deleteShopLogo(mockSupabase, '');

            expect(extractPublicIdFromUrl).not.toHaveBeenCalled();
            expect(deleteImage).not.toHaveBeenCalled();
        });

        it('should do nothing if logoUrl is not a Cloudinary URL', async () => {
            await deleteShopLogo(mockSupabase, 'https://example.com/logo.jpg');

            expect(extractPublicIdFromUrl).not.toHaveBeenCalled();
            expect(deleteImage).not.toHaveBeenCalled();
        });

        it('should delete logo if it is a Cloudinary URL', async () => {
            const cloudinaryUrl = 'https://res.cloudinary.com/test/image/upload/logo.jpg';
            (extractPublicIdFromUrl as any).mockReturnValue('logo');

            await deleteShopLogo(mockSupabase, cloudinaryUrl);

            expect(extractPublicIdFromUrl).toHaveBeenCalledWith(cloudinaryUrl);
            expect(deleteImage).toHaveBeenCalledWith('logo');
        });

        it('should handle extractPublicIdFromUrl returning null', async () => {
            const cloudinaryUrl = 'https://res.cloudinary.com/test/image/upload/logo.jpg';
            (extractPublicIdFromUrl as any).mockReturnValue(null);

            await deleteShopLogo(mockSupabase, cloudinaryUrl);

            expect(deleteImage).not.toHaveBeenCalled();
        });

        it('should handle deleteImage errors gracefully', async () => {
            const cloudinaryUrl = 'https://res.cloudinary.com/test/image/upload/logo.jpg';
            (extractPublicIdFromUrl as any).mockReturnValue('logo');
            (deleteImage as any).mockRejectedValueOnce(new Error('Delete failed'));

            // Should not throw
            await expect(deleteShopLogo(mockSupabase, cloudinaryUrl)).resolves.not.toThrow();
        });
    });

    describe('deleteAllShopImages', () => {
        it('should delete all product images and shop logo', async () => {
            (extractPublicIdFromUrl as any).mockImplementation((url: string) => {
                if (url.includes('product')) return 'product-image';
                if (url.includes('logo')) return 'logo-image';
                return null;
            });

            const productsSelectMock = vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    not: vi.fn().mockReturnValue({
                        data: [
                            { image_url: 'https://res.cloudinary.com/test/image/upload/product1.jpg' },
                            { image_url: 'https://res.cloudinary.com/test/image/upload/product2.jpg' }
                        ],
                        error: null
                    })
                })
            });

            const shopSelectMock = vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                        data: {
                            logo_url: 'https://res.cloudinary.com/test/image/upload/logo.jpg'
                        },
                        error: null
                    })
                })
            });

            const customizationSelectMock = vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                        data: null,
                        error: { message: 'Not found' }
                    })
                })
            });

            mockSupabase.from = vi.fn((table: string) => {
                if (table === 'products') {
                    return {
                        select: productsSelectMock
                    };
                }
                if (table === 'shops') {
                    return {
                        select: shopSelectMock
                    };
                }
                if (table === 'shop_customizations') {
                    return {
                        select: customizationSelectMock
                    };
                }
                return {};
            });

            await deleteAllShopImages(mockSupabase, 'shop-123');

            expect(deleteImage).toHaveBeenCalledWith('product-image');
            expect(deleteImage).toHaveBeenCalledWith('logo-image');
            expect(deleteImage).toHaveBeenCalledTimes(3); // 2 products + 1 logo
        });

        it('should handle errors when fetching products', async () => {
            const productsSelectMock = vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    not: vi.fn().mockReturnValue({
                        data: null,
                        error: { message: 'Database error' }
                    })
                })
            });

            mockSupabase.from = vi.fn((table: string) => {
                if (table === 'products') {
                    return {
                        select: productsSelectMock
                    };
                }
                return {};
            });

            await deleteAllShopImages(mockSupabase, 'shop-123');

            expect(deleteImage).not.toHaveBeenCalled();
        });

        it('should handle missing shop logo gracefully', async () => {
            (extractPublicIdFromUrl as any).mockReturnValue(null);

            const productsSelectMock = vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    not: vi.fn().mockReturnValue({
                        data: [],
                        error: null
                    })
                })
            });

            const shopSelectMock = vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                        data: {
                            logo_url: null
                        },
                        error: null
                    })
                })
            });

            mockSupabase.from = vi.fn((table: string) => {
                if (table === 'products') {
                    return {
                        select: productsSelectMock
                    };
                }
                if (table === 'shops') {
                    return {
                        select: shopSelectMock
                    };
                }
                return {};
            });

            await deleteAllShopImages(mockSupabase, 'shop-123');

            expect(deleteImage).not.toHaveBeenCalled();
        });

        it('should handle shop errors gracefully', async () => {
            const productsSelectMock = vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    not: vi.fn().mockReturnValue({
                        data: [],
                        error: null
                    })
                })
            });

            const shopSelectMock = vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                        data: null,
                        error: { message: 'Shop not found' }
                    })
                })
            });

            mockSupabase.from = vi.fn((table: string) => {
                if (table === 'products') {
                    return {
                        select: productsSelectMock
                    };
                }
                if (table === 'shops') {
                    return {
                        select: shopSelectMock
                    };
                }
                return {};
            });

            await deleteAllShopImages(mockSupabase, 'shop-123');

            expect(deleteImage).not.toHaveBeenCalled();
        });
    });
});




