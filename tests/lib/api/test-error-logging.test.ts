import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { POST, GET } from '../../../src/routes/api/test-error-logging/+server';
import { ErrorLogger } from '$lib/services/error-logging';

// Mock ErrorLogger
vi.mock('$lib/services/error-logging', () => ({
    ErrorLogger: {
        logCritical: vi.fn().mockResolvedValue(undefined)
    }
}));

describe('/api/test-error-logging', () => {
    let mockRequestEvent: Partial<RequestEvent>;

    beforeEach(() => {
        vi.clearAllMocks();
        
        // Mock request event
        mockRequestEvent = {
            request: {
                json: vi.fn(),
                headers: {
                    get: vi.fn(() => 'test-user-agent')
                },
                url: 'http://localhost:5176/api/test-error-logging',
                method: 'POST'
            } as any,
            url: new URL('http://localhost:5176/api/test-error-logging')
        };
    });

    describe('POST', () => {
        it('should log test error and return success in dev environment', async () => {
            // In test environment, DEV is typically true
            (mockRequestEvent.request as any).json = vi.fn().mockResolvedValue({});

            const response = await POST(mockRequestEvent as RequestEvent);
            const data = await response.json();

            expect(data.success).toBe(true);
            expect(data.message).toContain('Email de test envoyé');
            expect(ErrorLogger.logCritical).toHaveBeenCalled();
        });

        it('should accept custom severity in body', async () => {
            (mockRequestEvent.request as any).json = vi.fn().mockResolvedValue({ severity: 'critical' });

            const response = await POST(mockRequestEvent as RequestEvent);
            const data = await response.json();

            expect(data.success).toBe(true);
            expect(data.severity).toBe('critical');
        });

        it('should handle JSON parsing errors gracefully', async () => {
            (mockRequestEvent.request as any).json = vi.fn().mockRejectedValue(new Error('Invalid JSON'));

            const response = await POST(mockRequestEvent as RequestEvent);
            const data = await response.json();

            // Should still work with default values
            expect(data.success).toBe(true);
        });

        it('should include test context in error log', async () => {
            (mockRequestEvent.request as any).json = vi.fn().mockResolvedValue({});

            await POST(mockRequestEvent as RequestEvent);

            expect(ErrorLogger.logCritical).toHaveBeenCalled();
            const callArgs = (ErrorLogger.logCritical as any).mock.calls[0];
            expect(callArgs[1]).toMatchObject({
                userId: 'test-user-12345',
                testMode: true
            });
        });
    });

    describe('GET', () => {
        it('should log test error and return success in dev environment', async () => {
            const response = await GET(mockRequestEvent as RequestEvent);
            const data = await response.json();

            expect(data.success).toBe(true);
            expect(data.message).toContain('Email de test envoyé');
            expect(ErrorLogger.logCritical).toHaveBeenCalled();
        });
    });
});

