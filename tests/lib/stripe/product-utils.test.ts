import { describe, it, expect } from 'vitest';
import { toSortedPrices, toSortedProducts, type ProductWithPrices } from '$lib/stripe/product-utils';
import type Stripe from 'stripe';

describe('toSortedPrices', () => {
    it('should sort per-unit prices by unit_amount', () => {
        const prices: Stripe.Price[] = [
            { id: 'price_3', billing_scheme: 'per_unit', unit_amount: 3000 } as Stripe.Price,
            { id: 'price_1', billing_scheme: 'per_unit', unit_amount: 1000 } as Stripe.Price,
            { id: 'price_2', billing_scheme: 'per_unit', unit_amount: 2000 } as Stripe.Price,
        ];

        const sorted = toSortedPrices(prices);

        expect(sorted[0].id).toBe('price_1');
        expect(sorted[1].id).toBe('price_2');
        expect(sorted[2].id).toBe('price_3');
    });

    it('should sort tiered prices by first tier flat_amount', () => {
        const prices: Stripe.Price[] = [
            {
                id: 'price_3',
                billing_scheme: 'tiered',
                tiers: [{ flat_amount: 3000 }]
            } as Stripe.Price,
            {
                id: 'price_1',
                billing_scheme: 'tiered',
                tiers: [{ flat_amount: 1000 }]
            } as Stripe.Price,
            {
                id: 'price_2',
                billing_scheme: 'tiered',
                tiers: [{ flat_amount: 2000 }]
            } as Stripe.Price,
        ];

        const sorted = toSortedPrices(prices);

        expect(sorted[0].id).toBe('price_1');
        expect(sorted[1].id).toBe('price_2');
        expect(sorted[2].id).toBe('price_3');
    });

    it('should use unit_amount if flat_amount not available in tier', () => {
        const prices: Stripe.Price[] = [
            {
                id: 'price_2',
                billing_scheme: 'tiered',
                tiers: [{ unit_amount: 2000 }]
            } as Stripe.Price,
            {
                id: 'price_1',
                billing_scheme: 'tiered',
                tiers: [{ unit_amount: 1000 }]
            } as Stripe.Price,
        ];

        const sorted = toSortedPrices(prices);

        expect(sorted[0].id).toBe('price_1');
        expect(sorted[1].id).toBe('price_2');
    });

    it('should use custom_unit_amount preset if available', () => {
        const prices: Stripe.Price[] = [
            {
                id: 'price_2',
                custom_unit_amount: { preset: 2000 }
            } as Stripe.Price,
            {
                id: 'price_1',
                custom_unit_amount: { preset: 1000 }
            } as Stripe.Price,
        ];

        const sorted = toSortedPrices(prices);

        expect(sorted[0].id).toBe('price_1');
        expect(sorted[1].id).toBe('price_2');
    });

    it('should handle prices without significant value (use -Infinity)', () => {
        const prices: Stripe.Price[] = [
            { id: 'price_2', billing_scheme: 'per_unit', unit_amount: 2000 } as Stripe.Price,
            { id: 'price_1', billing_scheme: 'per_unit', unit_amount: null } as Stripe.Price, // No unit_amount -> -Infinity
        ];

        const sorted = toSortedPrices(prices);

        // Prices with -Infinity come first in ascending sort
        expect(sorted[0].id).toBe('price_1'); // -Infinity
        expect(sorted[1].id).toBe('price_2'); // 2000
    });

    it('should handle empty array', () => {
        const sorted = toSortedPrices([]);
        expect(sorted).toEqual([]);
    });

    it('should handle mixed price types', () => {
        const prices: Stripe.Price[] = [
            {
                id: 'price_tiered',
                billing_scheme: 'tiered',
                tiers: [{ flat_amount: 5000 }]
            } as Stripe.Price,
            { id: 'price_unit', billing_scheme: 'per_unit', unit_amount: 2000 } as Stripe.Price,
            { id: 'price_custom', custom_unit_amount: { preset: 3000 } } as Stripe.Price,
        ];

        const sorted = toSortedPrices(prices);

        expect(sorted[0].id).toBe('price_unit'); // 2000
        expect(sorted[1].id).toBe('price_custom'); // 3000
        expect(sorted[2].id).toBe('price_tiered'); // 5000
    });
});

describe('toSortedProducts', () => {
    const createProduct = (id: string, prices: Stripe.Price[]): ProductWithPrices => {
        return {
            id,
            name: `Product ${id}`,
            default_price: prices[0] as Stripe.Price,
            prices
        } as ProductWithPrices;
    };

    it('should sort products by their lowest price', () => {
        const product1 = createProduct('prod_1', [
            { id: 'price_1', product: 'prod_1', billing_scheme: 'per_unit', unit_amount: 1000 } as Stripe.Price
        ]);
        const product2 = createProduct('prod_2', [
            { id: 'price_2', product: 'prod_2', billing_scheme: 'per_unit', unit_amount: 500 } as Stripe.Price
        ]);
        const product3 = createProduct('prod_3', [
            { id: 'price_3', product: 'prod_3', billing_scheme: 'per_unit', unit_amount: 2000 } as Stripe.Price
        ]);

        const sorted = toSortedProducts([product1, product2, product3]);

        expect(sorted[0].id).toBe('prod_2'); // 500
        expect(sorted[1].id).toBe('prod_1'); // 1000
        expect(sorted[2].id).toBe('prod_3'); // 2000
    });

    it('should use first occurrence when product has multiple prices', () => {
        const product1 = createProduct('prod_1', [
            { id: 'price_1a', product: 'prod_1', billing_scheme: 'per_unit', unit_amount: 1000 } as Stripe.Price,
            { id: 'price_1b', product: 'prod_1', billing_scheme: 'per_unit', unit_amount: 1500 } as Stripe.Price
        ]);
        const product2 = createProduct('prod_2', [
            { id: 'price_2', product: 'prod_2', billing_scheme: 'per_unit', unit_amount: 500 } as Stripe.Price
        ]);

        const sorted = toSortedProducts([product1, product2]);

        // Should use first occurrence in sorted prices (lowest price for each product)
        // price_2 (500) comes first, then price_1a (1000)
        expect(sorted[0].id).toBe('prod_2'); // 500
        expect(sorted[1].id).toBe('prod_1'); // 1000 (lowest price)
    });

    it('should handle products with different price types', () => {
        const product1 = createProduct('prod_1', [
            {
                id: 'price_1',
                product: 'prod_1',
                billing_scheme: 'tiered',
                tiers: [{ flat_amount: 2000 }]
            } as Stripe.Price
        ]);
        const product2 = createProduct('prod_2', [
            { id: 'price_2', product: 'prod_2', billing_scheme: 'per_unit', unit_amount: 1000 } as Stripe.Price
        ]);

        const sorted = toSortedProducts([product1, product2]);

        expect(sorted[0].id).toBe('prod_2'); // 1000
        expect(sorted[1].id).toBe('prod_1'); // 2000
    });

    it('should handle empty array', () => {
        const sorted = toSortedProducts([]);
        expect(sorted).toEqual([]);
    });

    it('should handle single product', () => {
        const product = createProduct('prod_1', [
            { id: 'price_1', product: 'prod_1', billing_scheme: 'per_unit', unit_amount: 1000 } as Stripe.Price
        ]);

        const sorted = toSortedProducts([product]);

        expect(sorted).toHaveLength(1);
        expect(sorted[0].id).toBe('prod_1');
    });
});

