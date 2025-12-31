import { EmailService } from './email-service';

type ErrorSeverity = 'critical' | 'error' | 'warning';

interface CriticalErrorContext {
    userId?: string;
    orderId?: string;
    shopId?: string;
    productId?: string;
    stripeEventId?: string;
    stripeSessionId?: string;
    url?: string;
    userAgent?: string;
    [key: string]: any;
}

export class ErrorLogger {
    private static readonly ADMIN_EMAIL = 'pattyly.saas+error@gmail.com';
    
    /**
     * Log une erreur critique et envoie une notification email
     */
    static async logCritical(
        error: Error | unknown, 
        context?: CriticalErrorContext, 
        metadata?: Record<string, any>
    ): Promise<void> {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        
        // 1. Toujours logger dans la console
        console.error('🚨 CRITICAL ERROR:', errorObj);
        if (context) {
            console.error('📋 Context:', context);
        }
        if (metadata) {
            console.error('📊 Metadata:', metadata);
        }
        
        // 2. Envoyer un email de notification (non-bloquant)
        try {
            await EmailService.sendCriticalErrorNotification({
                errorMessage: errorObj.message,
                errorStack: errorObj.stack,
                errorName: errorObj.name,
                severity: 'critical',
                context: context || {},
                metadata: metadata || {},
                timestamp: new Date().toISOString(),
            });
        } catch (emailError) {
            // Ne pas faire échouer le processus si l'email échoue
            console.error('⚠️ Failed to send error notification email:', emailError);
        }
    }
    
    /**
     * Log une erreur normale (sans notification email)
     */
    static logError(error: Error | unknown, context?: CriticalErrorContext): void {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        console.error('❌ ERROR:', errorObj);
        if (context) {
            console.error('📋 Context:', context);
        }
    }
    
    /**
     * Log un warning (sans notification)
     */
    static logWarning(message: string, context?: CriticalErrorContext): void {
        console.warn('⚠️ WARNING:', message);
        if (context) {
            console.warn('📋 Context:', context);
        }
    }
}

