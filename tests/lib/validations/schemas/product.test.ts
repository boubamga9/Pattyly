import { describe, it, expect } from 'vitest';
import {
    productImageSchema,
    productBaseSchema,
    createProductSchema,
    updateProductSchema,
} from '$lib/validations/schemas/product';

const validUUID = '550e8400-e29b-41d4-a716-446655440000';
const validUUID2 = '123e4567-e89b-12d3-a456-426614174000';
const validUUID3 = '789e4567-e89b-12d3-a456-426614174000';

describe('productImageSchema', () => {
    const validImage = {
        image_url: 'https://example.com/image.jpg',
        display_order: 0
    };

    it('should validate correct product image', () => {
        expect(() => productImageSchema.parse(validImage)).not.toThrow();
    });

    it('should accept optional id', () => {
        expect(() => productImageSchema.parse({
            ...validImage,
            id: validUUID
        })).not.toThrow();
    });

    it('should accept optional public_id', () => {
        expect(() => productImageSchema.parse({
            ...validImage,
            public_id: 'public-id-123'
        })).not.toThrow();
    });

    it('should use default display_order if not provided', () => {
        const result = productImageSchema.parse({
            image_url: 'https://example.com/image.jpg'
        });
        expect(result.display_order).toBe(0);
    });

    it('should reject invalid image_url', () => {
        expect(() => productImageSchema.parse({
            ...validImage,
            image_url: 'not-a-url'
        })).toThrow();
    });

    it('should reject display_order less than 0', () => {
        expect(() => productImageSchema.parse({
            ...validImage,
            display_order: -1
        })).toThrow();
    });

    it('should reject display_order greater than 2', () => {
        expect(() => productImageSchema.parse({
            ...validImage,
            display_order: 3
        })).toThrow();
    });

    it('should accept display_order from 0 to 2', () => {
        expect(() => productImageSchema.parse({
            ...validImage,
            display_order: 0
        })).not.toThrow();
        expect(() => productImageSchema.parse({
            ...validImage,
            display_order: 1
        })).not.toThrow();
        expect(() => productImageSchema.parse({
            ...validImage,
            display_order: 2
        })).not.toThrow();
    });
});

describe('productBaseSchema', () => {
    const validProduct = {
        id: validUUID,
        shop_id: validUUID2,
        name: 'Tarte aux Pommes',
        description: 'Une délicieuse tarte aux pommes',
        image_url: 'https://example.com/image.jpg',
        base_price: 25.50,
        category_id: validUUID3,
        form_id: validUUID,
        min_days_notice: 7,
        deposit_percentage: 50
    };

    it('should validate correct product data', () => {
        expect(() => productBaseSchema.parse(validProduct)).not.toThrow();
    });

    it('should accept optional description', () => {
        const productWithoutDescription = { ...validProduct };
        delete productWithoutDescription.description;
        expect(() => productBaseSchema.parse(productWithoutDescription)).not.toThrow();
    });

    it('should accept optional image_url', () => {
        const productWithoutImage = { ...validProduct };
        delete productWithoutImage.image_url;
        expect(() => productBaseSchema.parse(productWithoutImage)).not.toThrow();
    });

    it('should accept optional nullable cake_type', () => {
        expect(() => productBaseSchema.parse({
            ...validProduct,
            cake_type: null
        })).not.toThrow();
        
        expect(() => productBaseSchema.parse({
            ...validProduct,
            cake_type: 'Anniversaire'
        })).not.toThrow();
    });

    it('should convert string min_days_notice to number', () => {
        const result = productBaseSchema.parse({
            ...validProduct,
            min_days_notice: '7'
        });
        expect(result.min_days_notice).toBe(7);
    });

    it('should convert string deposit_percentage to number', () => {
        const result = productBaseSchema.parse({
            ...validProduct,
            deposit_percentage: '50'
        });
        expect(result.deposit_percentage).toBe(50);
    });

    it('should use default deposit_percentage (50)', () => {
        const productWithoutDeposit = { ...validProduct };
        delete productWithoutDeposit.deposit_percentage;
        const result = productBaseSchema.parse(productWithoutDeposit);
        expect(result.deposit_percentage).toBe(50);
    });

    it('should reject invalid product name', () => {
        expect(() => productBaseSchema.parse({
            ...validProduct,
            name: 'A' // too short
        })).toThrow();
    });

    it('should reject negative base_price', () => {
        expect(() => productBaseSchema.parse({
            ...validProduct,
            base_price: -10
        })).toThrow();
    });

    it('should reject base_price over 10000', () => {
        expect(() => productBaseSchema.parse({
            ...validProduct,
            base_price: 10001
        })).toThrow();
    });

    it('should reject min_days_notice less than 0', () => {
        expect(() => productBaseSchema.parse({
            ...validProduct,
            min_days_notice: -1
        })).toThrow();
    });

    it('should reject min_days_notice greater than 365', () => {
        expect(() => productBaseSchema.parse({
            ...validProduct,
            min_days_notice: 366
        })).toThrow();
    });

    it('should reject deposit_percentage less than 0', () => {
        expect(() => productBaseSchema.parse({
            ...validProduct,
            deposit_percentage: -1
        })).toThrow();
    });

    it('should reject deposit_percentage greater than 100', () => {
        expect(() => productBaseSchema.parse({
            ...validProduct,
            deposit_percentage: 101
        })).toThrow();
    });

    it('should reject cake_type longer than 50 characters', () => {
        expect(() => productBaseSchema.parse({
            ...validProduct,
            cake_type: 'A'.repeat(51)
        })).toThrow('50 caractères');
    });

    it('should reject invalid UUIDs', () => {
        expect(() => productBaseSchema.parse({
            ...validProduct,
            id: 'not-a-uuid'
        })).toThrow();
    });
});

describe('createProductSchema', () => {
    const validCreateProduct = {
        name: 'Tarte aux Pommes',
        description: 'Une délicieuse tarte',
        base_price: 25.50,
        category_id: validUUID,
        form_id: validUUID2,
        min_days_notice: 7,
        deposit_percentage: 50
    };

    it('should validate correct create product data', () => {
        expect(() => createProductSchema.parse(validCreateProduct)).not.toThrow();
    });

    it('should not require id', () => {
        // id is omitted, so it should not be required
        expect(() => createProductSchema.parse(validCreateProduct)).not.toThrow();
    });

    it('should not require shop_id', () => {
        // shop_id is omitted, so it should not be required
        expect(() => createProductSchema.parse(validCreateProduct)).not.toThrow();
    });

    it('should not require image_url', () => {
        // image_url is omitted
        expect(() => createProductSchema.parse(validCreateProduct)).not.toThrow();
    });

    it('should accept optional description', () => {
        const productWithoutDescription = { ...validCreateProduct };
        delete productWithoutDescription.description;
        expect(() => createProductSchema.parse(productWithoutDescription)).not.toThrow();
    });
});

describe('updateProductSchema', () => {
    const validUpdateProduct = {
        name: 'Nouveau nom',
        description: 'Nouvelle description',
        base_price: 30,
        category_id: validUUID,
        form_id: validUUID2,
        cake_type: 'Mariage',
        min_days_notice: 14,
        deposit_percentage: 60
    };

    it('should validate correct update product data', () => {
        expect(() => updateProductSchema.parse(validUpdateProduct)).not.toThrow();
    });

    it('should accept optional description', () => {
        const updateWithoutDescription = { ...validUpdateProduct };
        delete updateWithoutDescription.description;
        expect(() => updateProductSchema.parse(updateWithoutDescription)).not.toThrow();
    });

    it('should accept optional nullable cake_type', () => {
        expect(() => updateProductSchema.parse({
            ...validUpdateProduct,
            cake_type: null
        })).not.toThrow();
    });

    it('should validate all picked fields', () => {
        expect(() => updateProductSchema.parse({
            name: 'Test',
            base_price: 10,
            category_id: validUUID,
            form_id: validUUID2,
            min_days_notice: 1,
            deposit_percentage: 30
        })).not.toThrow();
    });
});


