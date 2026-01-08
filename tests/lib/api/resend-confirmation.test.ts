import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { POST } from '../../../src/routes/api/resend-confirmation/+server';

describe('/api/resend-confirmation', () => {
    let mockRequestEvent: Partial<RequestEvent>;
    let mockSupabase: any;

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock Supabase auth.resend
        mockSupabase = {
            auth: {
                resend: vi.fn()
            }
        };

        mockRequestEvent = {
            request: {
                json: vi.fn().mockResolvedValue({ email: 'user@example.com' })
            } as any,
            locals: {
                supabase: mockSupabase
            } as any
        };
    });

    it('should resend confirmation email successfully', async () => {
        mockSupabase.auth.resend = vi.fn().mockResolvedValue({
            data: {},
            error: null
        });

        const response = await POST(mockRequestEvent as RequestEvent);
        const data = await response.json();

        expect(data.success).toBe(true);
        expect(data.message).toContain('renvoyé avec succès');
        expect(mockSupabase.auth.resend).toHaveBeenCalledWith({
            type: 'signup',
            email: 'user@example.com'
        });
    });

    it('should return 400 when email is missing', async () => {
        (mockRequestEvent.request as any).json = vi.fn().mockResolvedValue({});

        const response = await POST(mockRequestEvent as RequestEvent);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain('Email requis');
    });

    it('should return 429 when too many requests', async () => {
        mockSupabase.auth.resend = vi.fn().mockResolvedValue({
            data: null,
            error: {
                message: 'Too many requests. Please wait before requesting a new link.'
            }
        });

        const response = await POST(mockRequestEvent as RequestEvent);
        const data = await response.json();

        expect(response.status).toBe(429);
        expect(data.error).toContain('Trop de demandes');
    });

    it('should return 500 when auth resend fails', async () => {
        mockSupabase.auth.resend = vi.fn().mockResolvedValue({
            data: null,
            error: {
                message: 'Some other error'
            }
        });

        const response = await POST(mockRequestEvent as RequestEvent);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toContain('envoi');
    });

    it('should handle unexpected errors gracefully', async () => {
        (mockRequestEvent.request as any).json = vi.fn().mockRejectedValue(new Error('Unexpected error'));

        const response = await POST(mockRequestEvent as RequestEvent);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toContain('serveur');
    });
});




