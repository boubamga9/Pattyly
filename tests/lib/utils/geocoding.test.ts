import { describe, it, expect, vi, beforeEach } from 'vitest';
import { geocodeCity, updateShopCoordinates, geocodeShopIfNeeded } from '$lib/utils/geocoding';

// Mock global fetch
global.fetch = vi.fn();

describe('geocoding', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('geocodeCity', () => {
        it('should return coordinates for a valid city', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => [{
                    lat: '48.8566',
                    lon: '2.3522'
                }]
            });

            const result = await geocodeCity('Paris');

            expect(result).toEqual([48.8566, 2.3522]);
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('nominatim.openstreetmap.org'),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'User-Agent': 'Pattyly/1.0'
                    })
                })
            );
        });

        it('should include postal code in query when provided', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => [{
                    lat: '48.8566',
                    lon: '2.3522'
                }]
            });

            await geocodeCity('Paris', '75001');

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining(encodeURIComponent('75001 Paris, France')),
                expect.any(Object)
            );
        });

        it('should return null for empty city name', async () => {
            const result = await geocodeCity('');

            expect(result).toBeNull();
            expect(global.fetch).not.toHaveBeenCalled();
        });

        it('should return null for null city name', async () => {
            const result = await geocodeCity(null as any);

            expect(result).toBeNull();
            expect(global.fetch).not.toHaveBeenCalled();
        });

        it('should return null when API response is not ok', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: false,
                status: 500
            });

            const result = await geocodeCity('Paris');

            expect(result).toBeNull();
        });

        it('should return null when API returns empty array', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => []
            });

            const result = await geocodeCity('InvalidCityName');

            expect(result).toBeNull();
        });

        it('should return null when coordinates are invalid', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => [{
                    lat: 'invalid',
                    lon: 'invalid'
                }]
            });

            const result = await geocodeCity('Paris');

            expect(result).toBeNull();
        });

        it('should handle fetch errors gracefully', async () => {
            (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

            const result = await geocodeCity('Paris');

            expect(result).toBeNull();
        });
    });

    describe('updateShopCoordinates', () => {
        let mockSupabase: any;

        beforeEach(() => {
            mockSupabase = {
                rpc: vi.fn()
            };
        });

        it('should update coordinates successfully', async () => {
            mockSupabase.rpc.mockResolvedValueOnce({ error: null });

            const result = await updateShopCoordinates(mockSupabase, 'shop-123', 48.8566, 2.3522);

            expect(result).toBe(true);
            expect(mockSupabase.rpc).toHaveBeenCalledWith('update_shop_coordinates', {
                p_shop_id: 'shop-123',
                p_latitude: 48.8566,
                p_longitude: 2.3522
            });
        });

        it('should return false when RPC call fails', async () => {
            mockSupabase.rpc.mockResolvedValueOnce({
                error: { message: 'Database error' }
            });

            const result = await updateShopCoordinates(mockSupabase, 'shop-123', 48.8566, 2.3522);

            expect(result).toBe(false);
        });

        it('should handle RPC errors gracefully', async () => {
            mockSupabase.rpc.mockRejectedValueOnce(new Error('Network error'));

            const result = await updateShopCoordinates(mockSupabase, 'shop-123', 48.8566, 2.3522);

            expect(result).toBe(false);
        });
    });

    describe('geocodeShopIfNeeded', () => {
        let mockSupabase: any;

        beforeEach(() => {
            mockSupabase = {
                rpc: vi.fn()
            };
        });

        it('should geocode and update shop coordinates successfully', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => [{
                    lat: '48.8566',
                    lon: '2.3522'
                }]
            });
            mockSupabase.rpc.mockResolvedValueOnce({ error: null });

            const result = await geocodeShopIfNeeded(mockSupabase, 'shop-123', 'Paris', '75001');

            expect(result).toBe(true);
            expect(mockSupabase.rpc).toHaveBeenCalledWith('update_shop_coordinates', {
                p_shop_id: 'shop-123',
                p_latitude: 48.8566,
                p_longitude: 2.3522
            });
        });

        it('should return false when city name is empty', async () => {
            const result = await geocodeShopIfNeeded(mockSupabase, 'shop-123', '');

            expect(result).toBe(false);
            expect(global.fetch).not.toHaveBeenCalled();
            expect(mockSupabase.rpc).not.toHaveBeenCalled();
        });

        it('should return false when city name is null', async () => {
            const result = await geocodeShopIfNeeded(mockSupabase, 'shop-123', null);

            expect(result).toBe(false);
            expect(global.fetch).not.toHaveBeenCalled();
            expect(mockSupabase.rpc).not.toHaveBeenCalled();
        });

        it('should return false when geocoding fails', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => []
            });

            const result = await geocodeShopIfNeeded(mockSupabase, 'shop-123', 'InvalidCity');

            expect(result).toBe(false);
            expect(mockSupabase.rpc).not.toHaveBeenCalled();
        });

        it('should return false when update coordinates fails', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => [{
                    lat: '48.8566',
                    lon: '2.3522'
                }]
            });
            mockSupabase.rpc.mockResolvedValueOnce({
                error: { message: 'Database error' }
            });

            const result = await geocodeShopIfNeeded(mockSupabase, 'shop-123', 'Paris');

            expect(result).toBe(false);
        });
    });
});




