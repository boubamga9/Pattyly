import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkIdempotence } from '../../../../../../src/routes/api/webhooks/stripe/utils/idempotence';

describe('idempotence', () => {
    let mockSupabaseServiceRole: any;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => {});

        mockSupabaseServiceRole = {
            from: vi.fn()
        };
    });

    const createMockLocals = () => ({
        supabaseServiceRole: mockSupabaseServiceRole
    });

    it('should insert event ID if not exists', async () => {
        const eventId = 'evt_123';
        const mockLocals = createMockLocals();

        // Mock: event doesn't exist
        const selectMock = vi.fn().mockReturnThis();
        const eqMock = vi.fn().mockReturnThis();
        const maybeSingleMock = vi.fn().mockResolvedValue({
            data: null,
            error: null
        });

        // Mock: insert succeeds
        const insertMock = vi.fn().mockReturnThis();
        const insertEqMock = vi.fn().mockResolvedValue({
            error: null
        });

        mockSupabaseServiceRole.from.mockImplementation((table: string) => {
            if (table === 'stripe_events') {
                return {
                    select: selectMock,
                    eq: eqMock,
                    maybeSingle: maybeSingleMock,
                    insert: insertMock
                };
            }
            return {};
        });

        selectMock.mockReturnValue({ eq: eqMock });
        eqMock.mockReturnValue({ maybeSingle: maybeSingleMock });
        insertMock.mockReturnValue({ eq: insertEqMock });

        await checkIdempotence(eventId, mockLocals);

        expect(maybeSingleMock).toHaveBeenCalled();
        expect(insertMock).toHaveBeenCalledWith({ id: eventId });
    });

    it('should return early if event already exists', async () => {
        const eventId = 'evt_123';
        const mockLocals = createMockLocals();

        const selectMock = vi.fn().mockReturnThis();
        const eqMock = vi.fn().mockReturnThis();
        const maybeSingleMock = vi.fn().mockResolvedValue({
            data: { id: eventId },
            error: null
        });

        const insertMock = vi.fn();

        mockSupabaseServiceRole.from.mockImplementation((table: string) => {
            if (table === 'stripe_events') {
                return {
                    select: selectMock,
                    eq: eqMock,
                    maybeSingle: maybeSingleMock,
                    insert: insertMock
                };
            }
            return {};
        });

        selectMock.mockReturnValue({ eq: eqMock });
        eqMock.mockReturnValue({ maybeSingle: maybeSingleMock });

        await checkIdempotence(eventId, mockLocals);

        expect(maybeSingleMock).toHaveBeenCalled();
        expect(insertMock).not.toHaveBeenCalled();
    });

    it('should handle duplicate insert error gracefully', async () => {
        const eventId = 'evt_123';
        const mockLocals = createMockLocals();

        const selectMock = vi.fn().mockReturnThis();
        const eqMock = vi.fn().mockReturnThis();
        const maybeSingleMock = vi.fn().mockResolvedValue({
            data: null,
            error: null
        });

        const insertMock = vi.fn().mockReturnThis();
        const insertEqMock = vi.fn().mockResolvedValue({
            error: { code: '23505' } // Duplicate key error
        });

        mockSupabaseServiceRole.from.mockImplementation((table: string) => {
            if (table === 'stripe_events') {
                return {
                    select: selectMock,
                    eq: eqMock,
                    maybeSingle: maybeSingleMock,
                    insert: insertMock
                };
            }
            return {};
        });

        selectMock.mockReturnValue({ eq: eqMock });
        eqMock.mockReturnValue({ maybeSingle: maybeSingleMock });
        insertMock.mockReturnValue({ eq: insertEqMock });

        // Should not throw
        await expect(checkIdempotence(eventId, mockLocals)).resolves.not.toThrow();
    });

    it('should throw error on select failure', async () => {
        const eventId = 'evt_123';
        const mockLocals = createMockLocals();

        const selectMock = vi.fn().mockReturnThis();
        const eqMock = vi.fn().mockReturnThis();
        const maybeSingleMock = vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Select failed' }
        });

        mockSupabaseServiceRole.from.mockImplementation((table: string) => {
            if (table === 'stripe_events') {
                return {
                    select: selectMock,
                    eq: eqMock,
                    maybeSingle: maybeSingleMock
                };
            }
            return {};
        });

        selectMock.mockReturnValue({ eq: eqMock });
        eqMock.mockReturnValue({ maybeSingle: maybeSingleMock });

        await expect(checkIdempotence(eventId, mockLocals)).rejects.toThrow('Idempotence check failed');
    });

    it('should throw error on insert failure (non-duplicate)', async () => {
        const eventId = 'evt_123';
        const mockLocals = createMockLocals();

        const selectMock = vi.fn().mockReturnThis();
        const eqMock = vi.fn().mockReturnThis();
        const maybeSingleMock = vi.fn().mockResolvedValue({
            data: null,
            error: null
        });

        // insert() returns directly an object with { error }, not a chain
        const insertMock = vi.fn().mockResolvedValue({
            error: { code: 'OTHER_ERROR', message: 'Insert failed' }
        });

        mockSupabaseServiceRole.from.mockImplementation((table: string) => {
            if (table === 'stripe_events') {
                return {
                    select: selectMock,
                    eq: eqMock,
                    maybeSingle: maybeSingleMock,
                    insert: insertMock
                };
            }
            return {};
        });

        selectMock.mockReturnValue({ eq: eqMock });
        eqMock.mockReturnValue({ maybeSingle: maybeSingleMock });

        await expect(checkIdempotence(eventId, mockLocals)).rejects.toThrow('Idempotence insert failed');
    });
});

