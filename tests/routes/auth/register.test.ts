import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { actions, load } from '../../../src/routes/(marketing)/(auth)/register/+page.server';

// Mock dependencies
vi.mock('sveltekit-superforms', () => ({
    superValidate: vi.fn(),
    setError: vi.fn()
}));

vi.mock('$lib/utils/analytics', () => ({
    logEventAsync: vi.fn(),
    Events: {
        SIGNUP: 'signup'
    }
}));

import { superValidate, setError } from 'sveltekit-superforms';

describe('register +page.server', () => {
    let mockEvent: Partial<RequestEvent>;
    let mockSupabase: any;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'log').mockImplementation(() => {});

        mockSupabase = {
            auth: {
                signUp: vi.fn()
            }
        };

        mockEvent = {
            url: new URL('http://localhost/register'),
            request: {
                headers: {
                    get: vi.fn().mockReturnValue(null)
                },
                formData: vi.fn()
            } as any,
            locals: {
                supabase: mockSupabase,
                supabaseServiceRole: {} as any
            } as any
        };

        // Default mock for superValidate
        (superValidate as any).mockResolvedValue({
            valid: true,
            data: { email: 'test@example.com', password: 'password123' }
        });
    });

    describe('load', () => {
        it('should return form and detect checkout flow', async () => {
            const url = new URL('http://localhost/register?next=/checkout/price_123');
            const result = await load({ url } as any);

            expect(superValidate).toHaveBeenCalled();
            expect(result).toHaveProperty('form');
            expect(result.isCheckout).toBe(true);
        });

        it('should return plan from URL params', async () => {
            const url = new URL('http://localhost/register?plan=premium');
            const result = await load({ url } as any);

            expect(result.plan).toBe('premium');
        });
    });

    describe('actions.default', () => {
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

        it('should handle successful registration', async () => {
            const formData = new FormData();
            formData.append('email', 'test@example.com');
            formData.append('password', 'password123');

            mockEvent.request = {
                headers: {
                    get: vi.fn().mockReturnValue(null)
                },
                formData: vi.fn().mockResolvedValue(formData)
            } as any;

            const mockUser = {
                id: 'user-123',
                email: 'test@example.com'
            };

            (mockSupabase.auth.signUp as any).mockResolvedValue({
                error: null,
                data: { user: mockUser }
            });

            try {
                await actions.default(mockEvent as RequestEvent);
                expect.fail('Should have thrown redirect');
            } catch (err: any) {
                expect(err).toBeDefined();
                expect(err.status).toBe(303);
                expect(err.location).toContain('/confirmation?email=');
                expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
                    email: 'test@example.com',
                    password: 'password123',
                    options: {
                        emailRedirectTo: undefined
                    }
                });
            }
        });

        it('should handle signup disabled error', async () => {
            const formData = new FormData();
            formData.append('email', 'test@example.com');
            formData.append('password', 'password123');

            mockEvent.request = {
                headers: {
                    get: vi.fn().mockReturnValue(null)
                },
                formData: vi.fn().mockResolvedValue(formData)
            } as any;

            const mockForm = { valid: true, data: { email: 'test@example.com', password: 'password123' } };
            (superValidate as any).mockResolvedValue(mockForm);

            (mockSupabase.auth.signUp as any).mockResolvedValue({
                error: { code: 'signup_disabled', message: 'Signups not allowed' },
                data: { user: null }
            });

            const result = await actions.default(mockEvent as RequestEvent);

            expect(result).toHaveProperty('form');
            expect(result).toHaveProperty('signupDisabled', true);
        });

        it('should handle user already exists error', async () => {
            const formData = new FormData();
            formData.append('email', 'test@example.com');
            formData.append('password', 'password123');

            mockEvent.request = {
                headers: {
                    get: vi.fn().mockReturnValue(null)
                },
                formData: vi.fn().mockResolvedValue(formData)
            } as any;

            const mockForm = { valid: true, data: { email: 'test@example.com', password: 'password123' } };
            (superValidate as any).mockResolvedValue(mockForm);
            (setError as any).mockReturnValue(mockForm);

            (mockSupabase.auth.signUp as any).mockResolvedValue({
                error: { code: 'user_already_exists' },
                data: { user: null }
            });

            const result = await actions.default(mockEvent as RequestEvent);

            expect(setError).toHaveBeenCalledWith(
                mockForm,
                '',
                'Cet email est déjà utilisé. Veuillez utiliser un autre email.'
            );
        });

        it('should handle invalid email error', async () => {
            const formData = new FormData();
            formData.append('email', 'invalid-email');
            formData.append('password', 'password123');

            mockEvent.request = {
                headers: {
                    get: vi.fn().mockReturnValue(null)
                },
                formData: vi.fn().mockResolvedValue(formData)
            } as any;

            const mockForm = { valid: true, data: { email: 'invalid-email', password: 'password123' } };
            (superValidate as any).mockResolvedValue(mockForm);
            (setError as any).mockReturnValue(mockForm);

            (mockSupabase.auth.signUp as any).mockResolvedValue({
                error: { message: 'Invalid email' },
                data: { user: null }
            });

            const result = await actions.default(mockEvent as RequestEvent);

            expect(setError).toHaveBeenCalledWith(
                mockForm,
                'email',
                expect.stringContaining('Format d\'email invalide')
            );
        });

        it('should handle password too short error', async () => {
            const formData = new FormData();
            formData.append('email', 'test@example.com');
            formData.append('password', '123');

            mockEvent.request = {
                headers: {
                    get: vi.fn().mockReturnValue(null)
                },
                formData: vi.fn().mockResolvedValue(formData)
            } as any;

            const mockForm = { valid: true, data: { email: 'test@example.com', password: '123' } };
            (superValidate as any).mockResolvedValue(mockForm);
            (setError as any).mockReturnValue(mockForm);

            (mockSupabase.auth.signUp as any).mockResolvedValue({
                error: { message: 'Password should be at least 6 characters' },
                data: { user: null }
            });

            const result = await actions.default(mockEvent as RequestEvent);

            expect(setError).toHaveBeenCalledWith(
                mockForm,
                'password',
                expect.stringContaining('6 caractères')
            );
        });

        it('should handle generic signup error', async () => {
            const formData = new FormData();
            formData.append('email', 'test@example.com');
            formData.append('password', 'password123');

            mockEvent.request = {
                headers: {
                    get: vi.fn().mockReturnValue(null)
                },
                formData: vi.fn().mockResolvedValue(formData)
            } as any;

            const mockForm = { valid: true, data: { email: 'test@example.com', password: 'password123' } };
            (superValidate as any).mockResolvedValue(mockForm);
            (setError as any).mockReturnValue(mockForm);

            (mockSupabase.auth.signUp as any).mockResolvedValue({
                error: { message: 'Generic error' },
                data: { user: null }
            });

            const result = await actions.default(mockEvent as RequestEvent);

            expect(setError).toHaveBeenCalledWith(
                mockForm,
                '',
                'Impossible de créer le compte. Veuillez réessayer.'
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
            expect(mockSupabase.auth.signUp).not.toHaveBeenCalled();
        });
    });
});

