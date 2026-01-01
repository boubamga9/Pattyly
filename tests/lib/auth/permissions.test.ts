import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getUserPermissions, getShopIdAndSlug, verifyShopOwnership } from '$lib/auth';

describe('getUserPermissions', () => {
    let mockSupabase: any;

    beforeEach(() => {
        vi.clearAllMocks();
        
        mockSupabase = {
            rpc: vi.fn()
        };
    });

    it('should return permissions for user with shop and payment method', async () => {
        const mockRpcData = {
            shopId: 'shop-123',
            shopSlug: 'test-shop',
            plan: 'free',
            productCount: 5,
            productLimit: 10,
            canHandleCustomRequests: false,
            canManageCustomForms: false,
            isExempt: false
        };

        (mockSupabase.rpc as any).mockResolvedValueOnce({
            data: mockRpcData,
            error: null
        });

        const permissions = await getUserPermissions('user-123', mockSupabase);

        expect(permissions.shopId).toBe('shop-123');
        expect(permissions.shopSlug).toBe('test-shop');
        expect(permissions.plan).toBe('free');
        expect(permissions.productLimit).toBe(10);
    });

    it('should handle premium plan permissions', async () => {
        const mockRpcData = {
            shopId: 'shop-123',
            shopSlug: 'test-shop',
            plan: 'premium',
            productCount: 50,
            productLimit: 999999,
            canHandleCustomRequests: true,
            canManageCustomForms: true,
            isExempt: false
        };

        (mockSupabase.rpc as any).mockResolvedValueOnce({
            data: mockRpcData,
            error: null
        });

        const permissions = await getUserPermissions('user-123', mockSupabase);

        expect(permissions.plan).toBe('premium');
        expect(permissions.canHandleCustomRequests).toBe(true);
        expect(permissions.canManageCustomForms).toBe(true);
        expect(permissions.productLimit).toBe(999999);
    });

    it('should handle basic plan permissions', async () => {
        const mockRpcData = {
            shopId: 'shop-123',
            shopSlug: 'test-shop',
            plan: 'basic',
            productCount: 20,
            productLimit: 30,
            canHandleCustomRequests: true,
            canManageCustomForms: false,
            isExempt: false
        };

        (mockSupabase.rpc as any).mockResolvedValueOnce({
            data: mockRpcData,
            error: null
        });

        const permissions = await getUserPermissions('user-123', mockSupabase);

        expect(permissions.plan).toBe('basic');
        expect(permissions.canManageCustomForms).toBe(false);
    });

    it('should handle lifetime plan permissions', async () => {
        const mockRpcData = {
            shopId: 'shop-123',
            shopSlug: 'test-shop',
            plan: 'lifetime',
            productCount: 100,
            productLimit: 999999,
            canHandleCustomRequests: true,
            canManageCustomForms: true,
            isExempt: false
        };

        (mockSupabase.rpc as any).mockResolvedValueOnce({
            data: mockRpcData,
            error: null
        });

        const permissions = await getUserPermissions('user-123', mockSupabase);

        expect(permissions.plan).toBe('lifetime');
    });

    it('should handle exempt users', async () => {
        const mockRpcData = {
            shopId: 'shop-123',
            shopSlug: 'test-shop',
            plan: 'exempt',
            productCount: 0,
            productLimit: 999999,
            canHandleCustomRequests: true,
            canManageCustomForms: true,
            isExempt: true
        };

        (mockSupabase.rpc as any).mockResolvedValueOnce({
            data: mockRpcData,
            error: null
        });

        const permissions = await getUserPermissions('user-123', mockSupabase);

        expect(permissions.plan).toBe('exempt');
        expect(permissions.isExempt).toBe(true);
    });

    it('should use default values when data is null', async () => {
        (mockSupabase.rpc as any).mockResolvedValueOnce({
            data: null,
            error: null
        });

        const permissions = await getUserPermissions('user-123', mockSupabase);

        expect(permissions.shopId).toBeNull();
        expect(permissions.plan).toBe('free');
        expect(permissions.productCount).toBe(0);
        expect(permissions.productLimit).toBe(3); // Default is 3
    });

    it('should throw error when RPC returns error', async () => {
        (mockSupabase.rpc as any).mockResolvedValueOnce({
            data: null,
            error: { message: 'Database error' }
        });

        await expect(getUserPermissions('user-123', mockSupabase)).rejects.toThrow();
    });

    it('should handle limit reached scenario', async () => {
        const mockRpcData = {
            shopId: 'shop-123',
            shopSlug: 'test-shop',
            plan: 'free',
            productCount: 10,
            productLimit: 10,
            canHandleCustomRequests: false,
            canManageCustomForms: false,
            isExempt: false
        };

        (mockSupabase.rpc as any).mockResolvedValueOnce({
            data: mockRpcData,
            error: null
        });

        const permissions = await getUserPermissions('user-123', mockSupabase);

        expect(permissions.productCount).toBe(10);
        expect(permissions.productLimit).toBe(10);
    });
});

describe('getShopIdAndSlug', () => {
    let mockSupabase: any;

    beforeEach(() => {
        vi.clearAllMocks();
        
        mockSupabase = {
            from: vi.fn()
        };
    });

    it('should return shop id and slug when shop exists', async () => {
        const selectMock = vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                    data: {
                        id: 'shop-123',
                        slug: 'test-shop'
                    },
                    error: null
                })
            })
        });

        mockSupabase.from = vi.fn((table: string) => {
            if (table === 'shops') {
                return {
                    select: selectMock
                };
            }
            return {};
        });

        const result = await getShopIdAndSlug('user-123', mockSupabase);

        expect(result.id).toBe('shop-123');
        expect(result.slug).toBe('test-shop');
    });

    it('should return null when shop does not exist', async () => {
        const selectMock = vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Not found' }
                })
            })
        });

        mockSupabase.from = vi.fn((table: string) => {
            if (table === 'shops') {
                return {
                    select: selectMock
                };
            }
            return {};
        });

        const result = await getShopIdAndSlug('user-123', mockSupabase);

        expect(result.id).toBeNull();
        expect(result.slug).toBeNull();
    });
});

describe('verifyShopOwnership', () => {
    let mockSupabase: any;

    beforeEach(() => {
        vi.clearAllMocks();
        
        mockSupabase = {
            rpc: vi.fn()
        };
    });

    it('should return true when user owns the shop', async () => {
        (mockSupabase.rpc as any).mockResolvedValueOnce({
            data: true,
            error: null
        });

        const result = await verifyShopOwnership('user-123', 'shop-123', mockSupabase);

        expect(result).toBe(true);
        expect(mockSupabase.rpc).toHaveBeenCalledWith('verify_shop_ownership', {
            p_profile_id: 'user-123',
            p_shop_id: 'shop-123'
        });
    });

    it('should return false when user does not own the shop', async () => {
        (mockSupabase.rpc as any).mockResolvedValueOnce({
            data: false,
            error: null
        });

        const result = await verifyShopOwnership('user-123', 'shop-123', mockSupabase);

        expect(result).toBe(false);
    });

    it('should return false when RPC returns error', async () => {
        (mockSupabase.rpc as any).mockResolvedValueOnce({
            data: null,
            error: { message: 'Database error' }
        });

        const result = await verifyShopOwnership('user-123', 'shop-123', mockSupabase);

        expect(result).toBe(false);
    });
});
