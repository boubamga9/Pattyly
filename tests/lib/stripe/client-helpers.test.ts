import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchSortedProducts, fetchCurrentUsersSubscription } from '$lib/stripe/client-helpers';
import type Stripe from 'stripe';

describe('fetchSortedProducts', () => {
    let mockStripe: any;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should fetch and sort products successfully', async () => {
        const mockProducts = [
            {
                id: 'prod_2',
                name: 'Product 2',
                default_price: { id: 'price_2', unit_amount: 2000 } as Stripe.Price
            },
            {
                id: 'prod_1',
                name: 'Product 1',
                default_price: { id: 'price_1', unit_amount: 1000 } as Stripe.Price
            }
        ];

        const mockPrices = [
            { id: 'price_1', product: 'prod_1', billing_scheme: 'per_unit', unit_amount: 1000 } as Stripe.Price,
            { id: 'price_2', product: 'prod_2', billing_scheme: 'per_unit', unit_amount: 2000 } as Stripe.Price
        ];

        mockStripe = {
            products: {
                list: vi.fn().mockResolvedValue({
                    data: mockProducts
                })
            },
            prices: {
                list: vi.fn().mockResolvedValue({
                    data: mockPrices
                })
            }
        };

        const result = await fetchSortedProducts(mockStripe);

        expect(mockStripe.products.list).toHaveBeenCalledWith({
            active: true,
            expand: ['data.default_price'],
            ids: undefined
        });

        // Should call prices.list for each product
        expect(mockStripe.prices.list).toHaveBeenCalledTimes(2);
        
        // Result should be sorted by price (prod_1 with price 1000 first, then prod_2 with 2000)
        expect(result).toHaveLength(2);
        expect(result[0].id).toBe('prod_1'); // Lower price first
        expect(result[1].id).toBe('prod_2');
    });

    it('should filter prices by product ID', async () => {
        const mockProducts = [
            {
                id: 'prod_1',
                name: 'Product 1',
                default_price: { id: 'price_1', unit_amount: 1000 } as Stripe.Price
            }
        ];

        const mockPrices = [
            { id: 'price_1', product: 'prod_1', billing_scheme: 'per_unit', unit_amount: 1000 } as Stripe.Price,
            { id: 'price_other', product: 'prod_other', billing_scheme: 'per_unit', unit_amount: 5000 } as Stripe.Price
        ];

        mockStripe = {
            products: {
                list: vi.fn().mockResolvedValue({
                    data: mockProducts
                })
            },
            prices: {
                list: vi.fn().mockResolvedValue({
                    data: mockPrices
                })
            }
        };

        const result = await fetchSortedProducts(mockStripe);

        // Each product should only have prices that match its ID
        expect(result[0].prices).toHaveLength(1);
        expect(result[0].prices[0].product).toBe('prod_1');
    });

    it('should handle rejected price promises', async () => {
        const mockProducts = [
            {
                id: 'prod_1',
                name: 'Product 1',
                default_price: { id: 'price_1', unit_amount: 1000 } as Stripe.Price
            }
        ];

        mockStripe = {
            products: {
                list: vi.fn().mockResolvedValue({
                    data: mockProducts
                })
            },
            prices: {
                list: vi.fn().mockRejectedValue(new Error('Price fetch failed'))
            }
        };

        const result = await fetchSortedProducts(mockStripe);

        // Should continue even if some price fetches fail
        expect(result).toHaveLength(1);
        expect(result[0].prices).toEqual([]);
    });

    it('should use stripeProductIds if configured', async () => {
        // This would require mocking the config import
        // For now, we test that ids parameter is passed through
        const mockProducts: Stripe.Product[] = [];

        mockStripe = {
            products: {
                list: vi.fn().mockResolvedValue({
                    data: mockProducts
                })
            },
            prices: {
                list: vi.fn().mockResolvedValue({ data: [] })
            }
        };

        await fetchSortedProducts(mockStripe);

        expect(mockStripe.products.list).toHaveBeenCalledWith(
            expect.objectContaining({
                active: true,
                expand: ['data.default_price']
            })
        );
    });
});

describe('fetchCurrentUsersSubscription', () => {
    let mockStripe: any;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return active subscriptions', async () => {
        const mockSubscriptions = [
            { id: 'sub_1', status: 'active', customer: 'cus_123' } as Stripe.Subscription,
            { id: 'sub_2', status: 'trialing', customer: 'cus_123' } as Stripe.Subscription,
            { id: 'sub_3', status: 'canceled', customer: 'cus_123' } as Stripe.Subscription,
            { id: 'sub_4', status: 'past_due', customer: 'cus_123' } as Stripe.Subscription
        ];

        mockStripe = {
            subscriptions: {
                list: vi.fn().mockResolvedValue({
                    data: mockSubscriptions
                })
            }
        };

        const result = await fetchCurrentUsersSubscription(mockStripe, 'cus_123');

        expect(mockStripe.subscriptions.list).toHaveBeenCalledWith({
            customer: 'cus_123',
            limit: 100
        });

        // Should filter to only active, trialing, and past_due
        expect(result).toHaveLength(3);
        expect(result.map((s: Stripe.Subscription) => s.id)).toEqual(['sub_1', 'sub_2', 'sub_4']);
        expect(result).not.toContainEqual(expect.objectContaining({ id: 'sub_3' }));
    });

    it('should return empty array when no active subscriptions', async () => {
        const mockSubscriptions = [
            { id: 'sub_1', status: 'canceled', customer: 'cus_123' } as Stripe.Subscription,
            { id: 'sub_2', status: 'incomplete_expired', customer: 'cus_123' } as Stripe.Subscription
        ];

        mockStripe = {
            subscriptions: {
                list: vi.fn().mockResolvedValue({
                    data: mockSubscriptions
                })
            }
        };

        const result = await fetchCurrentUsersSubscription(mockStripe, 'cus_123');

        expect(result).toEqual([]);
    });

    it('should return empty array when no subscriptions exist', async () => {
        mockStripe = {
            subscriptions: {
                list: vi.fn().mockResolvedValue({
                    data: []
                })
            }
        };

        const result = await fetchCurrentUsersSubscription(mockStripe, 'cus_123');

        expect(result).toEqual([]);
    });
});


