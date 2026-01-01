import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Resend - must be defined before importing EmailService
const mockSend = vi.fn();

vi.mock('resend', () => ({
    Resend: vi.fn().mockImplementation(() => ({
        emails: {
            send: (...args: any[]) => mockSend(...args)
        }
    }))
}));

// Import after mock setup
import { EmailService } from '$lib/services/email-service';

// Mock email templates (they just return HTML strings)
vi.mock('$lib/emails/order-confirmation', () => ({
    OrderConfirmationEmail: vi.fn(() => '<html>OrderConfirmationEmail</html>')
}));

vi.mock('$lib/emails/order-notification', () => ({
    OrderNotificationEmail: vi.fn(() => '<html>OrderNotificationEmail</html>')
}));

vi.mock('$lib/emails/order-pending-verification-client', () => ({
    OrderPendingVerificationClientEmail: vi.fn(() => '<html>OrderPendingVerificationClientEmail</html>')
}));

vi.mock('$lib/emails/order-pending-verification-pastry', () => ({
    OrderPendingVerificationPastryEmail: vi.fn(() => '<html>OrderPendingVerificationPastryEmail</html>')
}));

vi.mock('$lib/emails/quote-confirmation', () => ({
    QuoteConfirmationEmail: vi.fn(() => '<html>QuoteConfirmationEmail</html>')
}));

vi.mock('$lib/emails/quote-payment', () => ({
    QuotePaymentEmail: vi.fn(() => '<html>QuotePaymentEmail</html>')
}));

vi.mock('$lib/emails/quote-sent', () => ({
    QuoteSentEmail: vi.fn(() => '<html>QuoteSentEmail</html>')
}));

vi.mock('$lib/emails/quote-rejected', () => ({
    QuoteRejectedEmail: vi.fn(() => '<html>QuoteRejectedEmail</html>')
}));

vi.mock('$lib/emails/custom-request-confirmation', () => ({
    CustomRequestConfirmationEmail: vi.fn(() => '<html>CustomRequestConfirmationEmail</html>')
}));

vi.mock('$lib/emails/custom-request-notification', () => ({
    CustomRequestNotificationEmail: vi.fn(() => '<html>CustomRequestNotificationEmail</html>')
}));

vi.mock('$lib/emails/request-rejected', () => ({
    RequestRejectedEmail: vi.fn(() => '<html>RequestRejectedEmail</html>')
}));

vi.mock('$lib/emails/order-cancelled', () => ({
    OrderCancelledEmail: vi.fn(() => '<html>OrderCancelledEmail</html>')
}));

vi.mock('$lib/emails/contact-confirmation', () => ({
    ContactConfirmationEmail: vi.fn(() => '<html>ContactConfirmationEmail</html>')
}));

vi.mock('$lib/emails/contact-notification', () => ({
    ContactNotificationEmail: vi.fn(() => '<html>ContactNotificationEmail</html>')
}));

vi.mock('$lib/emails/payment-failed-notification', () => ({
    PaymentFailedNotificationEmail: vi.fn(() => '<html>PaymentFailedNotificationEmail</html>')
}));

vi.mock('$lib/emails/critical-error-notification', () => ({
    CriticalErrorNotificationEmail: vi.fn(() => '<html>CriticalErrorNotificationEmail</html>')
}));

describe('EmailService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSend.mockResolvedValue({ data: { id: 'test-message-id' }, error: null });
    });

    describe('sendOrderConfirmation', () => {
        it('should send order confirmation email successfully', async () => {
            const params = {
                customerEmail: 'customer@test.com',
                customerName: 'John Doe',
                shopName: 'Test Shop',
                shopLogo: 'https://example.com/logo.png',
                productName: 'Test Cake',
                pickupDate: '2024-01-15',
                pickupTime: '14:00',
                totalAmount: 10000,
                paidAmount: 5000,
                remainingAmount: 5000,
                orderId: 'order-123',
                orderUrl: 'https://example.com/order/123',
                date: '2024-01-01'
            };

            const result = await EmailService.sendOrderConfirmation(params);

            expect(mockSend).toHaveBeenCalledWith({
                from: 'Pattyly <noreply@pattyly.com>',
                to: [params.customerEmail],
                subject: `Commande confirmée - ${params.productName}`,
                html: expect.any(String)
            });
            expect(result).toEqual({ success: true, messageId: 'test-message-id' });
        });

        it('should throw error when Resend fails', async () => {
            const error = new Error('Resend API error');
            mockSend.mockResolvedValue({ data: null, error });

            await expect(EmailService.sendOrderConfirmation({
                customerEmail: 'customer@test.com',
                customerName: 'John Doe',
                shopName: 'Test Shop',
                productName: 'Test Cake',
                pickupDate: '2024-01-15',
                totalAmount: 10000,
                paidAmount: 5000,
                remainingAmount: 5000,
                orderId: 'order-123',
                orderUrl: 'https://example.com/order/123',
                date: '2024-01-01'
            })).rejects.toThrow(error);
        });
    });

    describe('sendOrderPendingVerificationClient', () => {
        it('should send pending verification email to client', async () => {
            const params = {
                customerEmail: 'customer@test.com',
                customerName: 'John Doe',
                shopName: 'Test Shop',
                productName: 'Test Cake',
                pickupDate: '2024-01-15',
                totalAmount: 10000,
                paidAmount: 5000,
                remainingAmount: 5000,
                orderId: 'order-123',
                orderUrl: 'https://example.com/order/123',
                orderRef: 'REF123',
                date: '2024-01-01'
            };

            const result = await EmailService.sendOrderPendingVerificationClient(params);

            expect(mockSend).toHaveBeenCalledWith({
                from: 'Pattyly <noreply@pattyly.com>',
                to: [params.customerEmail],
                subject: `Commande enregistrée - ${params.productName}`,
                html: expect.any(String)
            });
            expect(result).toEqual({ success: true, messageId: 'test-message-id' });
        });
    });

    describe('sendOrderPendingVerificationPastry', () => {
        it('should send pending verification email to pastry', async () => {
            const params = {
                pastryEmail: 'pastry@test.com',
                customerName: 'John Doe',
                customerEmail: 'customer@test.com',
                productName: 'Test Cake',
                pickupDate: '2024-01-15',
                totalAmount: 10000,
                paidAmount: 5000,
                remainingAmount: 5000,
                orderId: 'order-123',
                orderRef: 'REF123',
                dashboardUrl: 'https://example.com/dashboard',
                date: '2024-01-01'
            };

            const result = await EmailService.sendOrderPendingVerificationPastry(params);

            expect(mockSend).toHaveBeenCalledWith({
                from: 'Pattyly <noreply@pattyly.com>',
                to: [params.pastryEmail],
                subject: `Nouvelle commande - Vérification requise`,
                html: expect.any(String)
            });
            expect(result).toEqual({ success: true, messageId: 'test-message-id' });
        });
    });

    describe('sendOrderNotification', () => {
        it('should send order notification to pastry', async () => {
            const params = {
                pastryEmail: 'pastry@test.com',
                customerName: 'John Doe',
                customerEmail: 'customer@test.com',
                productName: 'Test Cake',
                pickupDate: '2024-01-15',
                totalAmount: 10000,
                paidAmount: 5000,
                remainingAmount: 5000,
                orderId: 'order-123',
                dashboardUrl: 'https://example.com/dashboard',
                date: '2024-01-01'
            };

            const result = await EmailService.sendOrderNotification(params);

            expect(mockSend).toHaveBeenCalledWith({
                from: 'Pattyly <noreply@pattyly.com>',
                to: [params.pastryEmail],
                subject: `Nouvelle commande - ${params.productName}`,
                html: expect.any(String)
            });
            expect(result).toEqual({ success: true, messageId: 'test-message-id' });
        });
    });

    describe('sendQuoteConfirmation', () => {
        it('should send quote confirmation email', async () => {
            const params = {
                customerEmail: 'customer@test.com',
                customerName: 'John Doe',
                shopName: 'Test Shop',
                pickupDate: '2024-01-15',
                totalPrice: 10000,
                depositAmount: 5000,
                remainingAmount: 5000,
                orderId: 'order-123',
                orderUrl: 'https://example.com/order/123',
                date: '2024-01-01'
            };

            const result = await EmailService.sendQuoteConfirmation(params);

            expect(mockSend).toHaveBeenCalledWith({
                from: 'Pattyly <noreply@pattyly.com>',
                to: params.customerEmail,
                subject: `Commande personnalisée confirmée`,
                html: expect.any(String)
            });
            expect(result).toEqual({ success: true, messageId: 'test-message-id' });
        });
    });

    describe('sendQuotePayment', () => {
        it('should send quote payment notification', async () => {
            const params = {
                pastryEmail: 'pastry@test.com',
                customerName: 'John Doe',
                customerEmail: 'customer@test.com',
                pickupDate: '2024-01-15',
                totalPrice: 10000,
                depositAmount: 5000,
                remainingAmount: 5000,
                orderId: 'order-123',
                dashboardUrl: 'https://example.com/dashboard',
                date: '2024-01-01'
            };

            const result = await EmailService.sendQuotePayment(params);

            expect(mockSend).toHaveBeenCalledWith({
                from: 'Pattyly <noreply@pattyly.com>',
                to: [params.pastryEmail],
                subject: `Paiement reçu - Commande personnalisée`,
                html: expect.any(String)
            });
            expect(result).toEqual({ success: true, messageId: 'test-message-id' });
        });
    });

    describe('sendQuote', () => {
        it('should send quote email', async () => {
            const params = {
                customerEmail: 'customer@test.com',
                customerName: 'John Doe',
                shopName: 'Test Shop',
                quoteId: 'quote-123',
                orderUrl: 'https://example.com/order/123',
                date: '2024-01-01'
            };

            const result = await EmailService.sendQuote(params);

            expect(mockSend).toHaveBeenCalledWith({
                from: 'Pattyly <noreply@pattyly.com>',
                to: params.customerEmail,
                subject: `Votre devis est prêt !`,
                html: expect.any(String)
            });
            expect(result).toEqual({ success: true, messageId: 'test-message-id' });
        });
    });

    describe('sendQuoteRejected', () => {
        it('should send quote rejected notification', async () => {
            const params = {
                pastryEmail: 'pastry@test.com',
                customerEmail: 'customer@test.com',
                customerName: 'John Doe',
                quoteId: 'quote-123',
                orderUrl: 'https://example.com/order/123',
                date: '2024-01-01'
            };

            const result = await EmailService.sendQuoteRejected(params);

            expect(mockSend).toHaveBeenCalledWith({
                from: 'Pattyly <noreply@pattyly.com>',
                to: params.pastryEmail,
                subject: `Devis refusé`,
                html: expect.any(String)
            });
            expect(result).toEqual({ success: true, messageId: 'test-message-id' });
        });
    });

    describe('sendCustomRequestConfirmation', () => {
        it('should send custom request confirmation', async () => {
            const params = {
                customerEmail: 'customer@test.com',
                customerName: 'John Doe',
                shopName: 'Test Shop',
                requestId: 'request-123',
                orderUrl: 'https://example.com/order/123',
                date: '2024-01-01'
            };

            const result = await EmailService.sendCustomRequestConfirmation(params);

            expect(mockSend).toHaveBeenCalledWith({
                from: 'Pattyly <noreply@pattyly.com>',
                to: params.customerEmail,
                subject: `Demande personnalisée envoyée`,
                html: expect.any(String)
            });
            expect(result).toEqual({ success: true, messageId: 'test-message-id' });
        });
    });

    describe('sendCustomRequestNotification', () => {
        it('should send custom request notification to pastry', async () => {
            const params = {
                pastryEmail: 'pastry@test.com',
                customerName: 'John Doe',
                customerEmail: 'customer@test.com',
                pickupDate: '2024-01-15',
                requestId: 'request-123',
                dashboardUrl: 'https://example.com/dashboard',
                date: '2024-01-01'
            };

            const result = await EmailService.sendCustomRequestNotification(params);

            expect(mockSend).toHaveBeenCalledWith({
                from: 'Pattyly <noreply@pattyly.com>',
                to: params.pastryEmail,
                subject: `Nouvelle demande personnalisée`,
                html: expect.any(String)
            });
            expect(result).toEqual({ success: true, messageId: 'test-message-id' });
        });
    });

    describe('sendRequestRejected', () => {
        it('should send request rejected email', async () => {
            const params = {
                customerEmail: 'customer@test.com',
                customerName: 'John Doe',
                shopName: 'Test Shop',
                reason: 'Out of stock',
                requestId: 'request-123',
                catalogUrl: 'https://example.com/catalog',
                date: '2024-01-01'
            };

            const result = await EmailService.sendRequestRejected(params);

            expect(mockSend).toHaveBeenCalledWith({
                from: 'Pattyly <noreply@pattyly.com>',
                to: params.customerEmail,
                subject: `Demande refusée`,
                html: expect.any(String)
            });
            expect(result).toEqual({ success: true, messageId: 'test-message-id' });
        });
    });

    describe('sendOrderCancelled', () => {
        it('should send order cancelled email', async () => {
            const params = {
                customerEmail: 'customer@test.com',
                customerName: 'John Doe',
                shopName: 'Test Shop',
                orderId: 'order-123',
                orderUrl: 'https://example.com/order/123',
                date: '2024-01-01'
            };

            const result = await EmailService.sendOrderCancelled(params);

            expect(mockSend).toHaveBeenCalledWith({
                from: 'Pattyly <noreply@pattyly.com>',
                to: params.customerEmail,
                subject: `Commande annulée`,
                html: expect.any(String)
            });
            expect(result).toEqual({ success: true, messageId: 'test-message-id' });
        });
    });

    describe('sendContactConfirmation', () => {
        it('should send contact confirmation email', async () => {
            const params = {
                customerEmail: 'customer@test.com',
                customerName: 'John Doe',
                subject: 'Test Subject',
                message: 'Test Message'
            };

            const result = await EmailService.sendContactConfirmation(params);

            expect(mockSend).toHaveBeenCalledWith({
                from: 'Pattyly <noreply@pattyly.com>',
                to: params.customerEmail,
                subject: `Pattyly - Message reçu`,
                html: expect.any(String)
            });
            expect(result).toEqual({ success: true, messageId: 'test-message-id' });
        });
    });

    describe('sendContactNotification', () => {
        it('should send contact notification to admin', async () => {
            const params = {
                customerName: 'John Doe',
                customerEmail: 'customer@test.com',
                subject: 'Test Subject',
                message: 'Test Message',
                date: '2024-01-01'
            };

            const result = await EmailService.sendContactNotification(params);

            expect(mockSend).toHaveBeenCalledWith({
                from: 'Pattyly <noreply@pattyly.com>',
                to: 'contact@pattyly.com',
                subject: `Nouveau message - ${params.customerEmail}`,
                html: expect.any(String)
            });
            expect(result).toEqual({ success: true, messageId: 'test-message-id' });
        });
    });

    describe('sendPaymentFailedNotification', () => {
        it('should send payment failed notification', async () => {
            const params = {
                pastryEmail: 'pastry@test.com',
                shopName: 'Test Shop',
                customerPortalUrl: 'https://example.com/portal',
                date: '2024-01-01'
            };

            const result = await EmailService.sendPaymentFailedNotification(params);

            expect(mockSend).toHaveBeenCalledWith({
                from: 'Pattyly <noreply@pattyly.com>',
                to: [params.pastryEmail],
                subject: `Paiement échoué - Action requise`,
                html: expect.any(String)
            });
            expect(result).toEqual({ success: true, messageId: 'test-message-id' });
        });
    });

    describe('sendAdminOTP', () => {
        it('should send admin OTP email', async () => {
            const params = {
                email: 'admin@test.com',
                code: '123456'
            };

            const result = await EmailService.sendAdminOTP(params);

            expect(mockSend).toHaveBeenCalledWith({
                from: 'Pattyly <noreply@pattyly.com>',
                to: [params.email],
                subject: 'Code de connexion admin - Pattyly',
                html: expect.stringContaining(params.code)
            });
            expect(result).toEqual({ success: true, messageId: 'test-message-id' });
        });
    });

    describe('sendCriticalErrorNotification', () => {
        it('should send critical error notification', async () => {
            const params = {
                errorMessage: 'Test error',
                errorStack: 'Error stack trace',
                errorName: 'TestError',
                severity: 'critical' as const,
                context: { userId: 'user-123' },
                metadata: { orderId: 'order-123' },
                timestamp: '2024-01-01T00:00:00Z'
            };

            const result = await EmailService.sendCriticalErrorNotification(params);

            expect(mockSend).toHaveBeenCalledWith({
                from: 'Pattyly Alerts <noreply@pattyly.com>',
                to: ['pattyly.saas+error@gmail.com'],
                subject: `[CRITIQUE] ${params.errorName} - Pattyly`,
                html: expect.any(String)
            });
            expect(result).toEqual({ success: true, messageId: 'test-message-id' });
        });

        it('should use correct severity labels', async () => {
            const severities = ['critical', 'error', 'warning'] as const;
            const expectedLabels = ['CRITIQUE', 'ERREUR', 'AVERTISSEMENT'];

            for (let i = 0; i < severities.length; i++) {
                vi.clearAllMocks();
                mockSend.mockResolvedValue({ data: { id: 'test-message-id' }, error: null });
                
                await EmailService.sendCriticalErrorNotification({
                    errorMessage: 'Test error',
                    errorName: 'TestError',
                    severity: severities[i],
                    context: {},
                    metadata: {},
                    timestamp: '2024-01-01T00:00:00Z'
                });

                expect(mockSend).toHaveBeenCalledWith(
                    expect.objectContaining({
                        subject: expect.stringContaining(`[${expectedLabels[i]}]`)
                    })
                );
            }
        });
    });
});
