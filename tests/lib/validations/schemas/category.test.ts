import { describe, it, expect } from 'vitest';
import {
    categorySchema,
    createCategorySchema,
    updateCategorySchema,
    deleteCategorySchema
} from '$lib/validations/schemas/category';

const validUUID = '550e8400-e29b-41d4-a716-446655440000';
const validUUID2 = '123e4567-e89b-12d3-a456-426614174000';

describe('categorySchema', () => {
    const validCategory = {
        id: validUUID,
        name: 'Tartes',
        shop_id: validUUID2
    };

    it('should validate correct category data', () => {
        expect(() => categorySchema.parse(validCategory)).not.toThrow();
    });

    it('should reject category with invalid UUID', () => {
        expect(() => categorySchema.parse({
            ...validCategory,
            id: 'not-a-uuid'
        })).toThrow('UUID');
    });

    it('should reject category with invalid shop_id UUID', () => {
        expect(() => categorySchema.parse({
            ...validCategory,
            shop_id: 'not-a-uuid'
        })).toThrow('UUID');
    });

    it('should reject category with name shorter than 2 characters', () => {
        expect(() => categorySchema.parse({
            ...validCategory,
            name: 'A'
        })).toThrow('2 caractères');
    });

    it('should reject category with name longer than 30 characters', () => {
        expect(() => categorySchema.parse({
            ...validCategory,
            name: 'A'.repeat(31)
        })).toThrow('30 caractères');
    });

    it('should trim category name', () => {
        const result = categorySchema.parse({
            ...validCategory,
            name: '  Tartes  '
        });
        expect(result.name).toBe('Tartes');
    });
});

describe('createCategorySchema', () => {
    it('should validate create category data (name only)', () => {
        expect(() => createCategorySchema.parse({
            name: 'Tartes'
        })).not.toThrow();
    });

    it('should accept create category with extra fields (Zod ignores unknown fields)', () => {
        // Zod's .omit() ignores unknown fields, so extra fields don't cause errors
        const result = createCategorySchema.parse({
            id: validUUID,
            shop_id: validUUID,
            name: 'Tartes'
        } as any);
        expect(result.name).toBe('Tartes');
        // id and shop_id are ignored, not validated
    });

    it('should reject create category without name', () => {
        expect(() => createCategorySchema.parse({})).toThrow();
    });
});

describe('updateCategorySchema', () => {
    it('should validate update category data (name only)', () => {
        expect(() => updateCategorySchema.parse({
            name: 'Nouveau nom'
        })).not.toThrow();
    });

    it('should accept update category with extra fields (Zod ignores unknown fields)', () => {
        // Zod's .pick() ignores unknown fields, so extra fields don't cause errors
        const result = updateCategorySchema.parse({
            id: validUUID,
            shop_id: validUUID,
            name: 'Nouveau nom'
        } as any);
        expect(result.name).toBe('Nouveau nom');
        // id and shop_id are ignored, not validated
    });

    it('should reject update category without name', () => {
        expect(() => updateCategorySchema.parse({})).toThrow();
    });
});

describe('deleteCategorySchema', () => {
    it('should validate delete category data (id only)', () => {
        expect(() => deleteCategorySchema.parse({
            id: validUUID
        })).not.toThrow();
    });

    it('should reject delete category with invalid UUID', () => {
        expect(() => deleteCategorySchema.parse({
            id: 'not-a-uuid'
        })).toThrow('UUID');
    });

    it('should reject delete category without id', () => {
        expect(() => deleteCategorySchema.parse({})).toThrow();
    });
});

