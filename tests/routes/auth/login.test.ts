import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { actions, load } from '../../../src/routes/(marketing)/(auth)/login/+page.server';

// Mock dependencies
vi.mock('sveltekit-superforms', () => ({
    superValidate: vi.fn(),
    setError: vi.fn()
}));

import { superValidate, setError } from 'sveltekit-superforms';

describe('login +page.server', () => {
    let mockEvent: Partial<RequestEvent>;
    let mockSupabase: any;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'log').mockImplementation(() => {});

        mockSupabase = {
            auth: {
                signInWithPassword: vi.fn(),
                signInWithOAuth: vi.fn()
            }
        };

        mockEvent = {
            url: new URL('http://localhost/login'),
            request: {
                headers: {
                    get: vi.fn().mockReturnValue(null)
                }
            } as any,
            locals: {
                supabase: mockSupabase,
                safeGetSession: vi.fn()
            } as any
        };

        // Default mock for superValidate
        (superValidate as any).mockResolvedValue({
            valid: true,
            data: { email: 'test@example.com', password: 'password123' }
        });
    });

    describe('load', () => {
        it('should return form', async () => {
            const result = await load({} as any);

            expect(superValidate).toHaveBeenCalled();
            expect(result).toHaveProperty('form');
        });
    });

    describe('actions.default', () => {
        it('should handle OAuth login with provider', async () => {
            const url = new URL('http://localhost/login?provider=google&redirectTo=http://localhost/dashboard');
            mockEvent.url = url;
            
            (mockSupabase.auth.signInWithOAuth as any).mockResolvedValue({
                data: { url: 'https://oauth-provider.com/auth' },
                error: null
            });

            try {
                await actions.default(mockEvent as RequestEvent);
                expect.fail('Should have thrown redirect');
            } catch (err: any) {
                // redirect() throws an exception
                expect(err).toBeDefined();
                expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
                    provider: 'google',
                    options: expect.objectContaining({
                        redirectTo: 'http://localhost/dashboard'
                    })
                });
            }
        });

        it('should return fail when OAuth provider missing redirectTo', async () => {
            const url = new URL('http://localhost/login?provider=google');
            mockEvent.url = url;

            const result = await actions.default(mockEvent as RequestEvent);

            expect(result).toEqual({ status: 400, data: {} });
            expect(mockSupabase.auth.signInWithOAuth).not.toHaveBeenCalled();
        });

        it('should handle rate limit exceeded', async () => {
            const formData = new FormData();
            formData.append('email', 'test@example.com');
            formData.append('password', 'password123');

            mockEvent.request = {
                headers: {
                    get: vi.fn((name: string) => {
                        if (name === 'x-rate-limit-exceeded') return 'true';
                        if (name === 'x-rate-limit-message') return 'Too many requests';
                        return null;
                    })
                },
                formData: vi.fn().mockResolvedValue(formData)
            } as any;

            (superValidate as any).mockResolvedValue({
                valid: false
            });
            (setError as any).mockReturnValue({ valid: false });

            const result = await actions.default(mockEvent as RequestEvent);

            expect(setError).toHaveBeenCalled();
            expect(result).toHaveProperty('form');
        });

        it('should handle successful password login', async () => {
            const formData = new FormData();
            formData.append('email', 'test@example.com');
            formData.append('password', 'password123');

            mockEvent.request = {
                headers: {
                    get: vi.fn().mockReturnValue(null)
                },
                formData: vi.fn().mockResolvedValue(formData)
            } as any;

            (mockSupabase.auth.signInWithPassword as any).mockResolvedValue({
                error: null
            });

            try {
                await actions.default(mockEvent as RequestEvent);
                expect.fail('Should have thrown redirect');
            } catch (err: any) {
                // redirect() throws an exception
                expect(err).toBeDefined();
                expect(err.status).toBe(303);
                expect(err.location).toBe('/dashboard');
                expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
                    email: 'test@example.com',
                    password: 'password123'
                });
            }
        });

        it('should handle email not confirmed error', async () => {
            const formData = new FormData();
            formData.append('email', 'test@example.com');
            formData.append('password', 'password123');

            mockEvent.request = {
                headers: {
                    get: vi.fn().mockReturnValue(null)
                },
                formData: vi.fn().mockResolvedValue(formData)
            } as any;

            (mockSupabase.auth.signInWithPassword as any).mockResolvedValue({
                error: { code: 'email_not_confirmed' }
            });

            try {
                await actions.default(mockEvent as RequestEvent);
                expect.fail('Should have thrown redirect');
            } catch (err: any) {
                // redirect() throws an exception
                expect(err).toBeDefined();
                expect(err.status).toBe(303);
                expect(err.location).toContain('/confirmation?email=');
            }
        });

        it('should handle invalid credentials error', async () => {
            const formData = new FormData();
            formData.append('email', 'test@example.com');
            formData.append('password', 'wrongpassword');

            mockEvent.request = {
                headers: {
                    get: vi.fn().mockReturnValue(null)
                },
                formData: vi.fn().mockResolvedValue(formData)
            } as any;

            (mockSupabase.auth.signInWithPassword as any).mockResolvedValue({
                error: { code: 'invalid_credentials' }
            });

            (setError as any).mockReturnValue({ valid: false });

            const result = await actions.default(mockEvent as RequestEvent);

            expect(setError).toHaveBeenCalledWith(
                expect.anything(),
                '',
                'Email ou mot de passe incorrect'
            );
        });

        it('should handle too many requests error', async () => {
            const formData = new FormData();
            formData.append('email', 'test@example.com');
            formData.append('password', 'password123');

            mockEvent.request = {
                headers: {
                    get: vi.fn().mockReturnValue(null)
                },
                formData: vi.fn().mockResolvedValue(formData)
            } as any;

            (mockSupabase.auth.signInWithPassword as any).mockResolvedValue({
                error: { message: 'Too many requests' }
            });

            (setError as any).mockReturnValue({ valid: false });

            const result = await actions.default(mockEvent as RequestEvent);

            expect(setError).toHaveBeenCalledWith(
                expect.anything(),
                '',
                'Trop de tentatives. Attendez avant de réessayer.'
            );
        });

        it('should handle generic login error', async () => {
            const formData = new FormData();
            formData.append('email', 'test@example.com');
            formData.append('password', 'password123');

            mockEvent.request = {
                headers: {
                    get: vi.fn().mockReturnValue(null)
                },
                formData: vi.fn().mockResolvedValue(formData)
            } as any;

            (mockSupabase.auth.signInWithPassword as any).mockResolvedValue({
                error: { message: 'Generic error' }
            });

            (setError as any).mockReturnValue({ valid: false });

            const result = await actions.default(mockEvent as RequestEvent);

            expect(setError).toHaveBeenCalledWith(
                expect.anything(),
                '',
                'Erreur lors de la connexion. Veuillez réessayer.'
            );
        });

        it('should return fail when form is invalid', async () => {
            const formData = new FormData();

            mockEvent.request = {
                headers: {
                    get: vi.fn().mockReturnValue(null)
                },
                formData: vi.fn().mockResolvedValue(formData)
            } as any;

            (superValidate as any).mockResolvedValue({
                valid: false,
                data: {}
            });

            const result = await actions.default(mockEvent as RequestEvent);

            expect(result).toEqual({
                status: 400,
                data: { form: expect.objectContaining({ valid: false }) }
            });
            expect(mockSupabase.auth.signInWithPassword).not.toHaveBeenCalled();
        });
    });
});

