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
    /**
     * Log une erreur critique (les erreurs sont uniquement loggées dans la console)
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
        
        // 2. Email notifications désactivées
        // Les erreurs sont uniquement loggées dans la console
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

