import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImageService } from '$lib/utils/images/image-service';

// Mock image-compression
vi.mock('$lib/utils/images/image-compression', () => ({
    validateImageFile: vi.fn(),
    compressImage: vi.fn(),
    IMAGE_PRESETS: {
        PRODUCT: { maxWidth: 800, maxHeight: 800, quality: 0.85, format: 'jpeg' },
        LOGO: { maxWidth: 400, maxHeight: 400, quality: 0.90, format: 'png' }
    }
}));

import { validateImageFile, compressImage } from '$lib/utils/images/image-compression';

describe('ImageService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const createMockFile = (name = 'test.jpg', size = 1000): File => {
        const content = new Array(size).fill(0).map(() => 'x').join('');
        const file = new File([content], name, { type: 'image/jpeg' });
        // Override size property if needed (File.size is read-only, but we can create file with correct size)
        return file;
    };

    describe('validateImage', () => {
        it('should validate product image successfully', () => {
            const file = createMockFile('product.jpg', 5 * 1024 * 1024); // 5MB
            (validateImageFile as any).mockReturnValue({ isValid: true });

            const result = ImageService.validateImage(file, 'product');

            expect(result.valid).toBe(true);
            expect(validateImageFile).toHaveBeenCalledWith(file);
        });

        it('should validate logo image successfully', () => {
            const file = createMockFile('logo.png', 3 * 1024 * 1024); // 3MB
            (validateImageFile as any).mockReturnValue({ isValid: true });

            const result = ImageService.validateImage(file, 'logo');

            expect(result.valid).toBe(true);
        });

        it('should reject invalid file type', () => {
            const file = createMockFile('test.pdf');
            (validateImageFile as any).mockReturnValue({
                isValid: false,
                error: 'Le fichier doit être une image'
            });

            const result = ImageService.validateImage(file, 'product');

            expect(result.valid).toBe(false);
            expect(result.error).toBe('Le fichier doit être une image');
        });

        it('should reject product image exceeding 10MB', () => {
            // Create file with size > 10MB
            const largeContent = new Array(11 * 1024 * 1024).fill(0).map(() => 'x').join('');
            const file = new File([largeContent], 'product.jpg', { type: 'image/jpeg' });
            (validateImageFile as any).mockReturnValue({ isValid: true });

            const result = ImageService.validateImage(file, 'product');

            expect(result.valid).toBe(false);
            expect(result.error).toContain('10MB');
        });

        it('should reject logo image exceeding 5MB', () => {
            // Create file with size > 5MB
            const largeContent = new Array(6 * 1024 * 1024).fill(0).map(() => 'x').join('');
            const file = new File([largeContent], 'logo.png', { type: 'image/png' });
            (validateImageFile as any).mockReturnValue({ isValid: true });

            const result = ImageService.validateImage(file, 'logo');

            expect(result.valid).toBe(false);
            expect(result.error).toContain('5MB');
        });
    });

    describe('processImage', () => {
        it('should process product image successfully', async () => {
            const file = createMockFile('product.jpg');
            const mockCompressedResult = {
                file: createMockFile('compressed.jpg', 500),
                originalSize: 1000,
                compressedSize: 500,
                dimensions: { width: 800, height: 600 }
            };

            (validateImageFile as any).mockReturnValue({ isValid: true });
            (compressImage as any).mockResolvedValue(mockCompressedResult);

            // Mock URL.createObjectURL
            const mockUrl = 'blob:http://localhost/test';
            global.URL.createObjectURL = vi.fn().mockReturnValue(mockUrl);

            const result = await ImageService.processImage(file, 'product');

            expect(compressImage).toHaveBeenCalledWith(file, expect.objectContaining({
                maxWidth: 800,
                maxHeight: 800
            }));
            expect(result.file).toBe(mockCompressedResult.file);
            expect(result.url).toBe(mockUrl);
            expect(result.originalSize).toBe(1000);
            expect(result.compressedSize).toBe(500);
        });

        it('should process logo image successfully', async () => {
            const file = createMockFile('logo.png');
            const mockCompressedResult = {
                file: createMockFile('compressed.png', 300),
                originalSize: 800,
                compressedSize: 300,
                dimensions: { width: 400, height: 400 }
            };

            (validateImageFile as any).mockReturnValue({ isValid: true });
            (compressImage as any).mockResolvedValue(mockCompressedResult);

            const mockUrl = 'blob:http://localhost/test';
            global.URL.createObjectURL = vi.fn().mockReturnValue(mockUrl);

            const result = await ImageService.processImage(file, 'logo');

            expect(compressImage).toHaveBeenCalledWith(file, expect.objectContaining({
                maxWidth: 400,
                maxHeight: 400
            }));
            expect(result.file).toBe(mockCompressedResult.file);
        });
    });

    describe('cleanupPreviewUrl', () => {
        it('should revoke blob URL', () => {
            const mockUrl = 'blob:http://localhost/test';
            global.URL.revokeObjectURL = vi.fn();

            ImageService.cleanupPreviewUrl(mockUrl);

            expect(global.URL.revokeObjectURL).toHaveBeenCalledWith(mockUrl);
        });

        it('should not revoke non-blob URLs', () => {
            const httpUrl = 'https://example.com/image.jpg';
            global.URL.revokeObjectURL = vi.fn();

            ImageService.cleanupPreviewUrl(httpUrl);

            expect(global.URL.revokeObjectURL).not.toHaveBeenCalled();
        });

        it('should handle empty or null URLs', () => {
            global.URL.revokeObjectURL = vi.fn();

            ImageService.cleanupPreviewUrl('');
            ImageService.cleanupPreviewUrl(null as any);

            expect(global.URL.revokeObjectURL).not.toHaveBeenCalled();
        });
    });
});

