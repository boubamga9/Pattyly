import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
    try {
        // Sécurité : vérifier que la requête vient d'un service de cron autorisé
        // Option 1 : Vérifier un secret dans les query params ou headers
        const cronSecret = process.env.CRON_SECRET;
        const providedSecret = url.searchParams.get('secret') || 
                              url.searchParams.get('key') ||
                              locals.request?.headers?.get('x-cron-secret');
        
        // Si un secret est configuré, vérifier l'authentification
        if (cronSecret && providedSecret !== cronSecret) {
            return json({ 
                error: 'Unauthorized',
                message: 'Invalid or missing cron secret'
            }, { status: 401 });
        }

        const supabase = locals.supabaseServiceRole;

        // Appeler la fonction SQL pour nettoyer les pending_orders
        const { data, error } = await supabase.rpc('cleanup_old_pending_orders');

        if (error) {
            console.error('Error cleaning up pending orders:', error);
            return json({ 
                error: 'Failed to cleanup pending orders',
                details: error.message 
            }, { status: 500 });
        }

        const deletedCount = data?.[0]?.deleted_count || 0;

        console.log(`✅ Cleaned up ${deletedCount} pending orders older than 30 days`);

        return json({ 
            success: true,
            deletedCount,
            message: `Cleaned up ${deletedCount} pending orders older than 30 days`,
            timestamp: new Date().toISOString()
        });

    } catch (err) {
        console.error('Unexpected error in cleanup cron:', err);
        return json({ 
            error: 'Internal server error',
            details: err instanceof Error ? err.message : 'Unknown error'
        }, { status: 500 });
    }
};

// Support POST aussi (certains services de cron utilisent POST)
export const POST: RequestHandler = GET;

