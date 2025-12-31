import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorLogger } from './error-logging';
import { EmailService } from './email-service';

// Mock EmailService
vi.mock('./email-service', () => ({
	EmailService: {
		sendCriticalErrorNotification: vi.fn().mockResolvedValue({ success: true, messageId: 'test-id' })
	}
}));

describe('ErrorLogger', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Mock console.error pour éviter le bruit dans les tests
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	describe('logCritical', () => {
		it('should log critical error and send email notification', async () => {
			const testError = new Error('Test critical error');
			const context = { userId: 'user-123', orderId: 'order-456', shopId: 'shop-789' };
			const metadata = { handler: 'testHandler', step: 'testStep' };

			await ErrorLogger.logCritical(testError, context, metadata);

			// Vérifier que l'email a été envoyé
			expect(EmailService.sendCriticalErrorNotification).toHaveBeenCalledOnce();
			expect(EmailService.sendCriticalErrorNotification).toHaveBeenCalledWith(
				expect.objectContaining({
					errorMessage: 'Test critical error',
					errorName: 'Error',
					severity: 'critical',
					context,
					metadata
				})
			);
		});

		it('should handle Error objects correctly', async () => {
			const testError = new Error('Test error with stack');
			testError.stack = 'Error: Test error\n    at test (file.ts:1:1)';

			await ErrorLogger.logCritical(testError);

			expect(EmailService.sendCriticalErrorNotification).toHaveBeenCalledWith(
				expect.objectContaining({
					errorMessage: 'Test error with stack',
					errorStack: testError.stack,
					errorName: 'Error'
				})
			);
		});

		it('should handle non-Error objects (strings, etc.)', async () => {
			const testError = 'String error';

			await ErrorLogger.logCritical(testError);

			expect(EmailService.sendCriticalErrorNotification).toHaveBeenCalledWith(
				expect.objectContaining({
					errorMessage: 'String error',
					errorName: 'Error'
				})
			);
		});

		it('should handle undefined/null errors', async () => {
			await ErrorLogger.logCritical(undefined);

			expect(EmailService.sendCriticalErrorNotification).toHaveBeenCalledWith(
				expect.objectContaining({
					errorMessage: 'undefined',
					errorName: 'Error'
				})
			);
		});

		it('should work without context and metadata', async () => {
			const testError = new Error('Test error');

			await ErrorLogger.logCritical(testError);

			expect(EmailService.sendCriticalErrorNotification).toHaveBeenCalledWith(
				expect.objectContaining({
					context: {},
					metadata: {}
				})
			);
		});

		it('should not throw if email sending fails', async () => {
			vi.mocked(EmailService.sendCriticalErrorNotification).mockRejectedValueOnce(
				new Error('Email service failed')
			);

			const testError = new Error('Test error');

			// Ne devrait pas throw - le service doit gérer l'erreur silencieusement
			await expect(ErrorLogger.logCritical(testError)).resolves.not.toThrow();

			// Mais devrait quand même logger l'erreur dans la console
			expect(console.error).toHaveBeenCalled();
		});

		it('should include timestamp in metadata', async () => {
			const testError = new Error('Test error');
			const beforeTime = new Date().toISOString();

			await ErrorLogger.logCritical(testError);

			const callArgs = vi.mocked(EmailService.sendCriticalErrorNotification).mock.calls[0][0];
			const afterTime = new Date().toISOString();

			expect(callArgs.timestamp).toBeDefined();
			expect(callArgs.timestamp >= beforeTime && callArgs.timestamp <= afterTime).toBe(true);
		});
	});

	describe('logError', () => {
		it('should log error without sending email', () => {
			const testError = new Error('Test error');
			const context = { userId: 'user-123' };

			ErrorLogger.logError(testError, context);

			// Ne devrait pas envoyer d'email
			expect(EmailService.sendCriticalErrorNotification).not.toHaveBeenCalled();

			// Mais devrait logger dans la console
			expect(console.error).toHaveBeenCalled();
		});

		it('should handle non-Error objects', () => {
			ErrorLogger.logError('String error');

			expect(console.error).toHaveBeenCalled();
		});
	});

	describe('logWarning', () => {
		it('should log warning without sending email', () => {
			const context = { userId: 'user-123' };

			ErrorLogger.logWarning('Test warning', context);

			// Ne devrait pas envoyer d'email
			expect(EmailService.sendCriticalErrorNotification).not.toHaveBeenCalled();

			// Mais devrait logger dans la console
			expect(console.warn).toHaveBeenCalled();
		});

		it('should work without context', () => {
			ErrorLogger.logWarning('Test warning');

			expect(console.warn).toHaveBeenCalled();
		});
	});
});

