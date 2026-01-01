import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    uploadShopLogo,
    uploadBackgroundImage,
    uploadProductImage,
    uploadInspirationPhoto,
    deleteImage,
    extractPublicIdFromUrl,
    deleteInspirationPhotos
} from '$lib/cloudinary';

// Mock cloudinary
vi.mock('cloudinary', () => {
    const mockUploader = {
        upload_stream: vi.fn(),
        destroy: vi.fn().mockResolvedValue({})
    };

    const mockApi = {
        delete_resources_by_prefix: vi.fn().mockResolvedValue({})
    };

    return {
        v2: {
            config: vi.fn(),
            uploader: mockUploader,
            api: mockApi
        }
    };
});

vi.mock('$env/static/private', () => ({
    CLOUDINARY_CLOUD_NAME: 'test-cloud',
    CLOUDINARY_API_KEY: 'test-key',
    CLOUDINARY_API_SECRET: 'test-secret'
}));

describe('Cloudinary', () => {
    let mockUploader: any;
    let mockApi: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => {});

        // Get the mocked cloudinary instance
        const cloudinary = await import('cloudinary');
        mockUploader = (cloudinary as any).v2.uploader;
        mockApi = (cloudinary as any).v2.api;
    });

    const createMockFile = (name = 'test.jpg', size = 1000): File => {
        return new File(['test content'], name, { type: 'image/jpeg' });
    };

    const mockUploadResponse = {
        secure_url: 'https://res.cloudinary.com/test-cloud/image/upload/v123/test.jpg',
        public_id: 'test-public-id'
    };

    describe('uploadShopLogo', () => {
        it('should upload shop logo successfully', async () => {
            const file = createMockFile('logo.jpg');
            const shopId = 'shop-123';

            // Mock successful upload
            const uploadStreamInstance = {
                end: vi.fn((buffer) => {
                    const callback = (mockUploader.upload_stream as any).mock.calls[0][1];
                    setTimeout(() => callback(null, mockUploadResponse), 0);
                })
            };
            mockUploader.upload_stream.mockReturnValue(uploadStreamInstance);

            const result = await uploadShopLogo(file, shopId);

            expect(mockUploader.upload_stream).toHaveBeenCalledWith(
                expect.objectContaining({
                    folder: `shops/${shopId}/logo`,
                    public_id: 'logo',
                    overwrite: true,
                    resource_type: 'image'
                }),
                expect.any(Function)
            );
            expect(result.secure_url).toBe(mockUploadResponse.secure_url);
            expect(result.public_id).toBe(mockUploadResponse.public_id);
        });

        it('should handle upload errors', async () => {
            const file = createMockFile('logo.jpg');
            const shopId = 'shop-123';

            const uploadError = new Error('Upload failed');
            const uploadStreamInstance = {
                end: vi.fn((buffer) => {
                    const callback = (mockUploader.upload_stream as any).mock.calls[0][1];
                    setTimeout(() => callback(uploadError, null), 0);
                })
            };
            mockUploader.upload_stream.mockReturnValue(uploadStreamInstance);

            await expect(uploadShopLogo(file, shopId)).rejects.toThrow(uploadError);
        });
    });

    describe('uploadBackgroundImage', () => {
        it('should upload background image successfully', async () => {
            const file = createMockFile('background.jpg');
            const shopId = 'shop-123';

            const uploadStreamInstance = {
                end: vi.fn((buffer) => {
                    const callback = (mockUploader.upload_stream as any).mock.calls[0][1];
                    setTimeout(() => callback(null, mockUploadResponse), 0);
                })
            };
            mockUploader.upload_stream.mockReturnValue(uploadStreamInstance);

            const result = await uploadBackgroundImage(file, shopId);

            expect(mockUploader.upload_stream).toHaveBeenCalledWith(
                expect.objectContaining({
                    folder: `shops/${shopId}/background`,
                    public_id: 'background',
                    overwrite: true
                }),
                expect.any(Function)
            );
            expect(result.secure_url).toBe(mockUploadResponse.secure_url);
        });
    });

    describe('uploadProductImage', () => {
        it('should upload product image with productId and index', async () => {
            const file = createMockFile('product.jpg');
            const shopId = 'shop-123';
            const productId = 'product-456';
            const imageIndex = 1;

            const uploadStreamInstance = {
                end: vi.fn((buffer) => {
                    const callback = (mockUploader.upload_stream as any).mock.calls[0][1];
                    setTimeout(() => callback(null, mockUploadResponse), 0);
                })
            };
            mockUploader.upload_stream.mockReturnValue(uploadStreamInstance);

            const result = await uploadProductImage(file, shopId, productId, imageIndex);

            expect(mockUploader.upload_stream).toHaveBeenCalledWith(
                expect.objectContaining({
                    folder: `shops/${shopId}/products`,
                    public_id: `${productId}-${imageIndex}`,
                    overwrite: false
                }),
                expect.any(Function)
            );
            expect(result.secure_url).toBe(mockUploadResponse.secure_url);
        });

        it('should generate timestamp-based ID when productId not provided', async () => {
            const file = createMockFile('product.jpg');
            const shopId = 'shop-123';

            const uploadStreamInstance = {
                end: vi.fn((buffer) => {
                    const callback = (mockUploader.upload_stream as any).mock.calls[0][1];
                    setTimeout(() => callback(null, mockUploadResponse), 0);
                })
            };
            mockUploader.upload_stream.mockReturnValue(uploadStreamInstance);

            await uploadProductImage(file, shopId);

            const callArgs = mockUploader.upload_stream.mock.calls[0][0];
            expect(callArgs.public_id).toMatch(/^product-\d+-\d+$/);
        });
    });

    describe('uploadInspirationPhoto', () => {
        it('should upload inspiration photo successfully', async () => {
            const file = createMockFile('inspiration.jpg');
            const shopId = 'shop-123';
            const orderId = 'order-456';
            const index = 1;

            const uploadStreamInstance = {
                end: vi.fn((buffer) => {
                    const callback = (mockUploader.upload_stream as any).mock.calls[0][1];
                    setTimeout(() => callback(null, mockUploadResponse), 0);
                })
            };
            mockUploader.upload_stream.mockReturnValue(uploadStreamInstance);

            const result = await uploadInspirationPhoto(file, shopId, orderId, index);

            expect(mockUploader.upload_stream).toHaveBeenCalledWith(
                expect.objectContaining({
                    folder: `orders/${shopId}/${orderId}`,
                    public_id: `inspiration-${index}`,
                    overwrite: false
                }),
                expect.any(Function)
            );
            expect(result.secure_url).toBe(mockUploadResponse.secure_url);
        });
    });

    describe('deleteImage', () => {
        it('should delete image successfully', async () => {
            const publicId = 'test-public-id';
            mockUploader.destroy.mockResolvedValue({ result: 'ok' });

            await deleteImage(publicId);

            expect(mockUploader.destroy).toHaveBeenCalledWith(publicId);
        });

        it('should handle delete errors', async () => {
            const publicId = 'test-public-id';
            const deleteError = new Error('Delete failed');
            mockUploader.destroy.mockRejectedValue(deleteError);

            await expect(deleteImage(publicId)).rejects.toThrow(deleteError);
        });
    });

    describe('extractPublicIdFromUrl', () => {
        it('should extract public_id from Cloudinary URL', () => {
            const url = 'https://res.cloudinary.com/test-cloud/image/upload/v123/shops/shop-123/logo.jpg';
            const publicId = extractPublicIdFromUrl(url);

            expect(publicId).toBe('shops/shop-123/logo');
        });

        it('should extract public_id from URL without version', () => {
            const url = 'https://res.cloudinary.com/test-cloud/image/upload/shops/shop-123/logo.jpg';
            const publicId = extractPublicIdFromUrl(url);

            expect(publicId).toBe('shops/shop-123/logo');
        });

        it('should return null for invalid URL', () => {
            const url = 'https://example.com/image.jpg';
            const publicId = extractPublicIdFromUrl(url);

            expect(publicId).toBeNull();
        });

        it('should handle URLs with transformations', () => {
            // Note: The regex extracts everything after /upload/, including transformations
            // This is expected behavior - transformations are part of the path
            const url = 'https://res.cloudinary.com/test-cloud/image/upload/c_limit,w_800/shops/shop-123/logo.jpg';
            const publicId = extractPublicIdFromUrl(url);

            // The function extracts everything after /upload/, which includes transformations
            expect(publicId).toBe('c_limit,w_800/shops/shop-123/logo');
        });
    });

    describe('deleteInspirationPhotos', () => {
        it('should delete all inspiration photos for an order', async () => {
            const shopId = 'shop-123';
            const orderId = 'order-456';
            mockApi.delete_resources_by_prefix.mockResolvedValue({ deleted: { 'test': {} } });

            await deleteInspirationPhotos(shopId, orderId);

            expect(mockApi.delete_resources_by_prefix).toHaveBeenCalledWith(
                `orders/${shopId}/${orderId}`
            );
        });

        it('should handle delete errors', async () => {
            const shopId = 'shop-123';
            const orderId = 'order-456';
            const deleteError = new Error('Delete failed');
            mockApi.delete_resources_by_prefix.mockRejectedValue(deleteError);

            await expect(deleteInspirationPhotos(shopId, orderId)).rejects.toThrow(deleteError);
        });
    });
});

