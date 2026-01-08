import { describe, it, expect } from 'vitest';
import { validateImageFile, IMAGE_PRESETS } from '$lib/utils/images/image-compression';

describe('image-compression', () => {
    describe('validateImageFile', () => {
        it('should validate valid image files', () => {
            const validFiles = [
                new File([''], 'test.jpg', { type: 'image/jpeg' }),
                new File([''], 'test.png', { type: 'image/png' }),
                new File([''], 'test.webp', { type: 'image/webp' }),
                new File([''], 'test.JPG', { type: 'image/jpeg' })
            ];

            validFiles.forEach(file => {
                const result = validateImageFile(file);
                expect(result.isValid).toBe(true);
                expect(result.error).toBeUndefined();
            });
        });

        it('should reject non-image files', () => {
            const invalidFiles = [
                new File([''], 'test.pdf', { type: 'application/pdf' }),
                new File([''], 'test.txt', { type: 'text/plain' }),
                new File([''], 'test.mp4', { type: 'video/mp4' })
            ];

            invalidFiles.forEach(file => {
                const result = validateImageFile(file);
                expect(result.isValid).toBe(false);
                expect(result.error).toBe('Le fichier doit être une image');
            });
        });

        it('should reject unsupported image types', () => {
            const unsupportedFiles = [
                new File([''], 'test.gif', { type: 'image/gif' }),
                new File([''], 'test.bmp', { type: 'image/bmp' }),
                new File([''], 'test.svg', { type: 'image/svg+xml' })
            ];

            unsupportedFiles.forEach(file => {
                const result = validateImageFile(file);
                expect(result.isValid).toBe(false);
                expect(result.error).toContain('Format d\'image non supporté');
            });
        });
    });

    describe('IMAGE_PRESETS', () => {
        it('should have PRODUCT preset with correct values', () => {
            expect(IMAGE_PRESETS.PRODUCT).toEqual({
                maxWidth: 800,
                maxHeight: 800,
                quality: 0.85,
                format: 'jpeg',
                maintainAspectRatio: true
            });
        });

        it('should have LOGO preset with correct values', () => {
            expect(IMAGE_PRESETS.LOGO).toEqual({
                maxWidth: 400,
                maxHeight: 400,
                quality: 0.90,
                format: 'png',
                maintainAspectRatio: true
            });
        });

        it('should have BACKGROUND preset with correct values', () => {
            expect(IMAGE_PRESETS.BACKGROUND).toEqual({
                maxWidth: 1920,
                maxHeight: 1080,
                quality: 0.85,
                format: 'jpeg',
                maintainAspectRatio: true
            });
        });
    });
});




