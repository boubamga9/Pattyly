import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { POST } from '../../../src/routes/api/get-free-pickup-slots/+server';

describe('/api/get-free-pickup-slots', () => {
    let mockRequestEvent: Partial<RequestEvent>;
    let mockSupabase: any;

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock Supabase RPC
        mockSupabase = {
            rpc: vi.fn()
        };

        mockRequestEvent = {
            request: {
                json: vi.fn()
            } as any,
            locals: {
                supabase: mockSupabase
            } as any
        };
    });

    it('should return time slots successfully', async () => {
        const mockTimeSlots = ['09:00', '09:30', '10:00'];
        mockSupabase.rpc = vi.fn().mockResolvedValue({
            data: mockTimeSlots,
            error: null
        });

        (mockRequestEvent.request as any).json = vi.fn().mockResolvedValue({
            shop_id: 'shop-123',
            pickup_date: '2024-01-15',
            start_time: '09:00',
            end_time: '18:00',
            interval_time: '00:30:00'
        });

        const response = await POST(mockRequestEvent as RequestEvent);
        const data = await response.json();

        expect(data.timeSlots).toEqual(mockTimeSlots);
        expect(mockSupabase.rpc).toHaveBeenCalledWith('get_free_pickup_slot', {
            p_shop_id: 'shop-123',
            p_pickup_date: '2024-01-15',
            p_start_time: '09:00',
            p_end_time: '18:00',
            p_interval_time: '00:30:00'
        });
    });

    it('should return empty array when no slots available', async () => {
        mockSupabase.rpc = vi.fn().mockResolvedValue({
            data: [],
            error: null
        });

        (mockRequestEvent.request as any).json = vi.fn().mockResolvedValue({
            shop_id: 'shop-123',
            pickup_date: '2024-01-15',
            start_time: '09:00',
            end_time: '18:00',
            interval_time: '00:30:00'
        });

        const response = await POST(mockRequestEvent as RequestEvent);
        const data = await response.json();

        expect(data.timeSlots).toEqual([]);
    });

    it('should return 400 when shop_id is missing', async () => {
        (mockRequestEvent.request as any).json = vi.fn().mockResolvedValue({
            pickup_date: '2024-01-15',
            start_time: '09:00',
            end_time: '18:00',
            interval_time: '00:30:00'
        });

        // SvelteKit error() throws an HTTPError
        await expect(POST(mockRequestEvent as RequestEvent)).rejects.toThrow();
    });

    it('should return 400 when pickup_date is missing', async () => {
        (mockRequestEvent.request as any).json = vi.fn().mockResolvedValue({
            shop_id: 'shop-123',
            start_time: '09:00',
            end_time: '18:00',
            interval_time: '00:30:00'
        });

        // SvelteKit error() throws an HTTPError
        await expect(POST(mockRequestEvent as RequestEvent)).rejects.toThrow();
    });

    it('should return 500 when RPC call fails', async () => {
        mockSupabase.rpc = vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' }
        });

        (mockRequestEvent.request as any).json = vi.fn().mockResolvedValue({
            shop_id: 'shop-123',
            pickup_date: '2024-01-15',
            start_time: '09:00',
            end_time: '18:00',
            interval_time: '00:30:00'
        });

        try {
            await POST(mockRequestEvent as RequestEvent);
            expect.fail('Should have thrown an error');
        } catch (e) {
            expect((e as any).status).toBe(500);
        }
    });

    it('should handle unexpected errors', async () => {
        (mockRequestEvent.request as any).json = vi.fn().mockRejectedValue(new Error('Unexpected error'));

        try {
            await POST(mockRequestEvent as RequestEvent);
            expect.fail('Should have thrown an error');
        } catch (e) {
            expect((e as any).status).toBe(500);
        }
    });
});

