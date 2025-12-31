import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ErrorLogger } from '$lib/services/error-logging';

export const POST: RequestHandler = async ({ request, url }) => {
    // Sécurité : Ne fonctionne qu'en développement ou staging/preview
    const isDev = import.meta.env.DEV;
    const vercelEnv = process.env.VERCEL_ENV;
    const isVercelPreview = vercelEnv === 'preview' || vercelEnv === 'development';
    
    if (!isDev && !isVercelPreview) {
        return json({ 
            error: 'Test endpoint only available in development or preview environment',
            currentEnv: vercelEnv || 'production'
        }, { status: 403 });
    }

    try {
        const body = await request.json().catch(() => ({}));
        const { severity = 'critical' } = body;

        // Créer une erreur de test avec un stack trace réaliste
        const testError = new Error('🧪 Erreur de test - Ceci est un test du système de logging');
        testError.stack = `Error: 🧪 Erreur de test - Ceci est un test du système de logging
    at testErrorLogging (/src/routes/api/test-error-logging/+server.ts:25:15)
    at POST (/src/routes/api/test-error-logging/+server.ts:30:25)
    at Object.handleRequest (node_modules/@sveltejs/kit/src/runtime/server/index.js:125:20)
    at async respond (node_modules/@sveltejs/kit/src/runtime/server/index.js:200:15)
    at async renderPage (node_modules/@sveltejs/kit/src/runtime/server/index.js:250:20)
    at async resolve (node_modules/@sveltejs/kit/src/runtime/server/index.js:275:10)
    at async handleRequest (node_modules/@sveltejs/kit/src/runtime/server/index.js:150:15)`;

        // Logger l'erreur de test
        await ErrorLogger.logCritical(testError, {
            userId: 'test-user-12345',
            orderId: 'test-order-67890',
            shopId: 'test-shop-abcde',
            productId: 'test-product-fghij',
            url: url.toString(),
            userAgent: request.headers.get('user-agent') || undefined,
            testMode: true,
            environment: isDev ? 'development' : vercelEnv || 'unknown',
        }, {
            handler: 'testErrorLogging',
            severity: severity,
            timestamp: new Date().toISOString(),
            note: 'Ceci est un test automatique du système de logging d\'erreurs critiques',
            testEndpoint: true,
        });

        return json({ 
            success: true, 
            message: '✅ Email de test envoyé à pattyly.saas+error@gmail.com',
            severity,
            environment: isDev ? 'development' : vercelEnv || 'unknown',
            note: 'Vérifie ta boîte email pour confirmer la réception'
        });
    } catch (error) {
        // En cas d'erreur, on log aussi mais sans boucle infinie
        console.error('❌ Erreur lors du test du logging:', error);
        return json({ 
            error: 'Erreur lors du test', 
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
};

// GET endpoint pour faciliter le test depuis le navigateur
export const GET: RequestHandler = async ({ url }) => {
    // Sécurité : Ne fonctionne qu'en développement ou staging/preview
    const isDev = import.meta.env.DEV;
    const vercelEnv = process.env.VERCEL_ENV;
    const isVercelPreview = vercelEnv === 'preview' || vercelEnv === 'development';
    
    if (!isDev && !isVercelPreview) {
        return json({ 
            error: 'Test endpoint only available in development or preview environment',
            currentEnv: vercelEnv || 'production'
        }, { status: 403 });
    }

    try {
        // Créer une erreur de test
        const testError = new Error('🧪 Erreur de test (GET) - Ceci est un test du système de logging');
        testError.stack = `Error: 🧪 Erreur de test (GET)
    at testErrorLogging (/src/routes/api/test-error-logging/+server.ts:75:15)
    at GET (/src/routes/api/test-error-logging/+server.ts:80:25)`;

        await ErrorLogger.logCritical(testError, {
            userId: 'test-user-12345',
            url: url.toString(),
            testMode: true,
            method: 'GET',
            environment: isDev ? 'development' : vercelEnv || 'unknown',
        }, {
            handler: 'testErrorLogging',
            severity: 'critical',
            timestamp: new Date().toISOString(),
            note: 'Test via GET endpoint',
            testEndpoint: true,
        });

        return json({ 
            success: true, 
            message: '✅ Email de test envoyé à pattyly.saas+error@gmail.com',
            environment: isDev ? 'development' : vercelEnv || 'unknown',
            note: 'Vérifie ta boîte email pour confirmer la réception'
        });
    } catch (error) {
        console.error('❌ Erreur lors du test du logging:', error);
        return json({ 
            error: 'Erreur lors du test', 
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
};

